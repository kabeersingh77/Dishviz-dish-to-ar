import fs from 'fs';
import https from 'https';
import http from 'http';
import { prisma } from '../db/prisma';
import { createSegmentationProvider } from '../providers/segmentation';
import { createARProvider } from '../providers/ar';
import { createStorageProvider } from '../providers/storage';
import { env } from '../config/env';
import { BUSINESS } from '../config/business';
import { UsageService } from '../services/UsageService';
import { CreditService } from '../services/CreditService';
import type { SegmentedImage } from '../providers/segmentation/SegmentationProvider';
import type { ARJobStatus } from '../providers/ar/ARGenerationProvider';

/**
 * PipelineExecutor
 *
 * Executes the full AR generation pipeline for a single job:
 *
 *   1. preparing_images  — load input image buffers from disk
 *   2. segmenting_subject — call SegmentationProvider per image
 *   3. uploading_photos  — send segmented images to AR provider
 *   4. analyzing_views → reconstructing → generating → optimizing
 *   5. preparing_ar      — download result assets from AR provider
 *   7. ready             — assets stored, job marked done
 *
 * Constraints:
 *  - Never logs image data or PII
 *  - Stores only user-safe error messages on the job
 *  - Segmentation ALWAYS runs before AR provider in every code path
 */
export class PipelineExecutor {
  private readonly segmentationProvider = createSegmentationProvider();
  private readonly arProvider = createARProvider();
  private readonly storageProvider = createStorageProvider();

  async execute(jobId: string): Promise<void> {
    try {
      await this.runPipeline(jobId);
    } catch (err) {
      console.error(`[PipelineExecutor] Job ${jobId} failed:`, err);
      const userSafeMessage = this.sanitiseError(err);
      const errorCode = this.extractCode(err);
      await this.failJob(jobId, userSafeMessage, errorCode);
    }
  }

  private async runPipeline(jobId: string): Promise<void> {
    // ── Stage 1: Load input images ─────────────────────────────────────
    await this.setStatus(jobId, 'preparing_images');

    const job = await prisma.aRJob.findUnique({
      where: { id: jobId },
      include: { inputAssets: true },
    });

    if (!job) throw new PipelineError('Job record not found.', 'JOB_NOT_FOUND');

    const inputAssets = job.inputAssets.filter((a) => a.type === 'input_image');
    if (inputAssets.length === 0) {
      throw new PipelineError('No input images found for this job.', 'NO_INPUT_IMAGES');
    }

    const inputBuffers: Buffer[] = [];
    for (const asset of inputAssets) {
      const filePath = asset.storagePath;
      if (!filePath || !fs.existsSync(filePath)) {
        throw new PipelineError('Input image file is missing from storage.', 'INPUT_FILE_MISSING');
      }
      inputBuffers.push(await fs.promises.readFile(filePath));
    }

    // ── Stage 2: Segment subject from background ───────────────────────
    await this.setStatus(jobId, 'segmenting_subject');

    const segMode = job.segmentationMode === 'dish_only' ? 'dish_only' : 'smart';

    const segResult = await this.segmentationProvider.segment(inputBuffers, segMode, jobId);

    // Compute overall metrics
    const overallConfidence = segResult.overallConfidence;
    const detectedObjectsJson = JSON.stringify(
      segResult.detectedObjects.map((d) => d.label)
    );

    // Calculate minimum foreground coverage across images
    const minCoverage = segResult.segmentedImages.length > 0
      ? Math.min(...segResult.segmentedImages.map((si: SegmentedImage) => si.foregroundCoverage))
      : 1; // Passthrough: assume full coverage

    await prisma.aRJob.update({
      where: { id: jobId },
      data: {
        segmentationConfidence: overallConfidence,
        detectedObjects: detectedObjectsJson,
        segmentationConfirmed: !segResult.requiresUserReview,
      },
    });

    // Confidence gate — do NOT silently reconstruct bad segmentations
    if (overallConfidence < env.segmentationConfidenceThreshold) {
      throw new PipelineError(
        `Subject segmentation confidence is low (${Math.round(overallConfidence * 100)}%). ` +
        'We recommend retaking photos with a plain background and better lighting from at least 6 angles.',
        'SEGMENTATION_LOW_CONFIDENCE'
      );
    }

    if (minCoverage < 0.10) {
      throw new PipelineError(
        'The object appears very small in the frame or could not be isolated from the background. ' +
        'Please photograph the object closer and ensure it fills most of the frame.',
        'SEGMENTATION_FOREGROUND_TOO_SMALL'
      );
    }

    // Use segmented images (with background removed), or passthrough if provider handles segmentation
    const reconstructionBuffers: Buffer[] =
      segResult.segmentedImages.length > 0
        ? segResult.segmentedImages.map((si: SegmentedImage) => si.masked)
        : inputBuffers;

    // ── Stage 3: Submit to AR provider ─────────────────────────────────
    await this.setStatus(jobId, 'uploading_photos');

    const jobMeta = {
      jobId,
      segmentationMode: segMode,
      imageCount: reconstructionBuffers.length,
    };

    const providerResult = await this.arProvider.createJob(reconstructionBuffers, jobMeta);

    await prisma.aRJob.update({
      where: { id: jobId },
      data: { providerTaskId: providerResult.providerJobId },
    });

    // ── Stage 4-6: Poll provider status until terminal ─────────────────
    await this.pollProviderUntilDone(jobId, providerResult.providerJobId);
  }

  private async pollProviderUntilDone(jobId: string, providerJobId: string): Promise<void> {
    const INITIAL_DELAY_MS = 5_000;
    const MAX_DELAY_MS = 60_000;
    const MAX_ATTEMPTS = 120;
    const BACKOFF_FACTOR = 1.5;

    let delay = INITIAL_DELAY_MS;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      await sleep(delay);

      const update = await this.arProvider.getJobStatus(providerJobId);
      const internalStatus = this.mapProviderStatus(update.status);
      await this.setStatus(jobId, internalStatus);

      if (internalStatus === 'ready') {
        await this.downloadAndStoreAssets(jobId, providerJobId);
        await this.setStatus(jobId, 'ready');
        await prisma.aRJob.update({
          where: { id: jobId },
          data: { completedAt: new Date() },
        });
        // Increment usage counter — non-blocking, never fails the job
        const job = await prisma.aRJob.findUnique({ where: { id: jobId }, select: { userId: true, webhookUrl: true } });
        if (job?.userId) {
          UsageService.incrementTrialUsage(job.userId).catch((err) => {
            console.error('[PipelineExecutor] Failed to increment usage counter:', err instanceof Error ? err.message : err);
          });
        }
        if (job?.webhookUrl) {
          this.dispatchWebhook(job.webhookUrl, {
            event: 'job.completed',
            jobId,
            status: 'ready',
            timestamp: new Date().toISOString(),
          }).catch((err) => {
            console.error('[PipelineExecutor] Failed to dispatch webhook:', err);
          });
        }
        return;
      }

      if (internalStatus === 'failed') {
        throw new PipelineError(
          update.errorMessage ?? 'The 3D reconstruction provider reported a failure.',
          update.errorCode ?? 'PROVIDER_FAILED'
        );
      }

      delay = Math.min(delay * BACKOFF_FACTOR, MAX_DELAY_MS);
    }

    throw new PipelineError(
      '3D reconstruction timed out. Your job has been saved. Please try again later.',
      'PROVIDER_TIMEOUT'
    );
  }

  private async downloadAndStoreAssets(jobId: string, providerJobId: string): Promise<void> {
    await this.setStatus(jobId, 'preparing_ar');

    const assets = await this.arProvider.fetchAssets(providerJobId);

    // Store each asset type
    const assetEntries: Array<{ buffer: Buffer; type: string; mimeType: string; filename: string }> = [];

    if (assets.glb) {
      assetEntries.push({ buffer: assets.glb, type: 'glb', mimeType: 'model/gltf-binary', filename: 'model.glb' });
    }
    if (assets.usdz) {
      assetEntries.push({ buffer: assets.usdz, type: 'usdz', mimeType: 'model/vnd.usdz+zip', filename: 'model.usdz' });
    }
    if (assets.thumbnail) {
      assetEntries.push({ buffer: assets.thumbnail, type: 'thumbnail', mimeType: 'image/png', filename: 'thumbnail.png' });
    }

    const job = await prisma.aRJob.findUnique({
      where: { id: jobId },
      select: { visibility: true, version: true },
    });
    const visibility = job?.visibility ?? 'private';
    const version = job?.version ?? 1;

    for (const entry of assetEntries) {
      const key = `output/${jobId}/${entry.filename}`;
      const stored = await this.storageProvider.save(entry.buffer, key, entry.mimeType);

      await prisma.asset.create({
        data: {
          outputJobId: jobId,
          type: entry.type,
          storageKey: stored.storageKey,
          storagePath: key,
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
          visibility,
          version,
        },
      });
    }

  }

  private async setStatus(jobId: string, status: ARJobStatus): Promise<void> {
    await prisma.aRJob.update({
      where: { id: jobId },
      data: { status, updatedAt: new Date() },
    });
  }

  private async failJob(jobId: string, message: string, code: string): Promise<void> {
    try {
      const job = await prisma.aRJob.findUnique({
        where: { id: jobId },
        select: { userId: true, webhookUrl: true, apiTier: true },
      });

      await prisma.aRJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorMessage: message,
          errorCode: code,
          completedAt: new Date(),
        },
      });

      // Automatic full refund guarantee for failed public jobs
      if (job?.userId && job.apiTier !== 'master') {
        await CreditService.refundForJob(
          job.userId,
          jobId,
          BUSINESS.credits.costPerGeneration,
          message
        ).catch((err) => {
          console.error('[PipelineExecutor] Failed to process credit refund:', err);
        });
      }

      // Dispatch webhook if configured
      if (job?.webhookUrl) {
        this.dispatchWebhook(job.webhookUrl, {
          event: 'job.failed',
          jobId,
          status: 'failed',
          errorCode: code,
          errorMessage: message,
          timestamp: new Date().toISOString(),
        }).catch((err) => {
          console.error('[PipelineExecutor] Failed to dispatch webhook:', err);
        });
      }
    } catch {
      // Swallow DB errors during failure handling
    }
  }

  private async dispatchWebhook(url: string, payload: Record<string, unknown>): Promise<void> {
    try {
      const data = JSON.stringify(payload);
      const targetUrl = new URL(url);
      const isHttps = targetUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      await new Promise<void>((resolve, reject) => {
        const req = client.request(
          targetUrl,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(data),
              'User-Agent': 'Dishviz-AR-Webhook/1.0',
            },
            timeout: 5000,
          },
          (res) => {
            res.resume();
            resolve();
          }
        );
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Webhook timeout'));
        });
        req.write(data);
        req.end();
      });
    } catch (err) {
      console.warn(`[PipelineExecutor] Webhook delivery failed for ${url}:`, err instanceof Error ? err.message : err);
    }
  }

  private mapProviderStatus(providerStatus: ARJobStatus): ARJobStatus {
    const map: Record<string, ARJobStatus> = {
      queued:        'analyzing_views',
      running:       'reconstructing_object',
      processing:    'generating_3d_model',
      optimizing:    'optimizing_model',
      ready:         'ready',
      failed:        'failed',
      error:         'failed',
    };
    return map[providerStatus] ?? 'reconstructing_object';
  }

  private sanitiseError(err: unknown): string {
    if (err instanceof PipelineError) return err.message;
    if (err instanceof Error) {
      if (err.message && (err.message.includes('configured') || err.message.includes('API_KEY') || err.message.includes('provider') || err.message.includes('Set '))) {
        return err.message;
      }
      return `An unexpected error occurred during processing. Please try again. (ref: ${err.name})`;
    }
    return 'An unexpected error occurred.';
  }

  private extractCode(err: unknown): string {
    if (err instanceof PipelineError) return err.code;
    return 'INTERNAL_ERROR';
  }
}

export class PipelineError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'PipelineError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function downloadBuffer(url: string): Promise<Buffer> {
  const MAX_BYTES = 100 * 1024 * 1024;
  return new Promise((resolve, reject) => {
    const get = url.startsWith('https') ? https.get : http.get;
    get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(downloadBuffer(res.headers.location));
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed with status ${res.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      let total = 0;
      res.on('data', (chunk: Buffer) => {
        total += chunk.length;
        if (total > MAX_BYTES) {
          res.destroy();
          reject(new Error('Downloaded file exceeds 100 MB size limit'));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Suppress unused variable warning for downloadBuffer
void downloadBuffer;
