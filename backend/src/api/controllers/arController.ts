import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../../db/prisma';
import { BUSINESS } from '../../config/business';
import { env } from '../../config/env';
import { validateImageBuffer } from '../../utils/serverImageValidation';
import { createStorageProvider } from '../../providers/storage';
import { UsageService } from '../../services/UsageService';
import { CreditService } from '../../services/CreditService';

// ─── Create Job ───────────────────────────────────────────────────────────────

export async function createJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[];
    const {
      segmentationMode,
      consentGiven,
      visibility,
      version,
      itemName,
      itemDescription,
      itemTasteProfile,
      itemCategory,
      itemPrice,
      webhookUrl,
    } = req.body as {
      segmentationMode?: string;
      consentGiven?: string;
      visibility?: string;
      version?: string | number;
      itemName?: string;
      itemDescription?: string;
      itemTasteProfile?: string;
      itemCategory?: string;
      itemPrice?: string | number;
      webhookUrl?: string;
    };

    // ── Idempotency check ────────────────────────────────────────────────────
    const idempotencyKey = (req.headers['idempotency-key'] as string) || (req.body?.idempotencyKey as string);
    if (idempotencyKey) {
      const existing = await prisma.aRJob.findUnique({
        where: { idempotencyKey: idempotencyKey.trim() },
        include: { outputAssets: true },
      });
      if (existing) {
        res.status(200).json({
          jobId: existing.id,
          status: existing.status,
          apiTier: existing.apiTier,
          idempotent: true,
        });
        return;
      }
    }

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No photos provided. Please provide at least one photo.' });
      return;
    }

    if (files.length > BUSINESS.limits.maxImagesPerJob) {
      res.status(400).json({
        error: `Maximum ${BUSINESS.limits.maxImagesPerJob} photos allowed per job. You uploaded ${files.length}.`,
      });
      return;
    }

    if (consentGiven !== 'true' && consentGiven !== '1') {
      res.status(400).json({
        error: 'Photo processing consent is required. Please review and accept the consent notice.',
        code: 'CONSENT_REQUIRED',
      });
      return;
    }

    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required to create an AR job.' });
      return;
    }

    // ── Pre-flight Quota & Credit Check ──────────────────────────────────────
    const quotaCheck = await UsageService.canCreateJob(userId);
    let chargedCredit = false;

    if (!quotaCheck.allowed) {
      // Free trial exhausted — check pay-as-you-go credit balance
      const creditCheck = await CreditService.canAffordJob(userId);
      if (!creditCheck.allowed) {
        res.status(402).json({
          error: 'Insufficient credits. Each 3D generation costs $1.50 in credit.',
          code: 'INSUFFICIENT_CREDITS',
          balance: creditCheck.balance,
          cost: creditCheck.cost,
          topUpUrl: '/dashboard/credits',
        });
        return;
      }
      chargedCredit = true;
    }

    // Server-side image validation
    const validationResults = await Promise.all(
      files.map((file) => validateImageBuffer(file.buffer, file.originalname))
    );

    const fatalErrors = validationResults.flatMap((r) => r.errors);
    if (fatalErrors.length > 0) {
      res.status(400).json({ error: 'One or more photos failed validation.', details: fatalErrors });
      return;
    }

    const allWarnings = validationResults.flatMap((r) => r.warnings);

    // If request comes from internal first-party credential, ensure internal user record exists
    if (userId === 'internal_digital_menu') {
      await prisma.user.upsert({
        where: { id: 'internal_digital_menu' },
        create: {
          id: 'internal_digital_menu',
          email: 'internal-digital-menu@objectar.local',
          passwordHash: 'INTERNAL_SERVICE_ACCOUNT_NO_LOGIN',
          name: 'Universal Digital Menu SaaS (Internal)',
        },
        update: {},
      });
    }

    // Write input files to storage
    const uploadDir = path.resolve(process.cwd(), env.storageLocalPath);
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const mode = segmentationMode === 'dish_only' ? 'dish_only' : 'smart';
    const ipHash = req.ip ? crypto.createHash('sha256').update(req.ip).digest('hex') : null;
    const jobVisibility = visibility === 'public' || visibility === 'unlisted' ? visibility : 'private';
    const jobVersion = typeof version === 'number' ? version : (version ? parseInt(String(version), 10) : 1);
    const parsedPrice = typeof itemPrice === 'number' ? itemPrice : (itemPrice ? parseFloat(String(itemPrice)) : null);

    const job = await prisma.aRJob.create({
      data: {
        userId,
        status: 'queued',
        apiTier: 'public',
        segmentationMode: mode,
        visibility: jobVisibility,
        version: jobVersion,
        itemName: itemName?.trim() || null,
        itemDescription: itemDescription?.trim() || null,
        itemTasteProfile: itemTasteProfile?.trim() || null,
        itemCategory: itemCategory?.trim() || null,
        itemPrice: parsedPrice,
        webhookUrl: webhookUrl?.trim() || null,
        idempotencyKey: idempotencyKey ? idempotencyKey.trim() : null,
        consentRecord: {
          create: {
            userId,
            consentType: 'photo_processing',
            policyVersion: BUSINESS.policies.version,
            ipHash,
            userAgent: req.headers['user-agent'] || null,
          },
        },
      },
    });

    if (chargedCredit) {
      await CreditService.deductForJob(userId, job.id);
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const val = validationResults[i];
      const fileExt = val.format === 'png' ? 'png' : val.format === 'webp' ? 'webp' : 'jpg';
      const storageFilename = `input_${job.id}_${i}_${Date.now()}.${fileExt}`;
      const fullPath = path.join(uploadDir, storageFilename);

      await fs.promises.writeFile(fullPath, file.buffer);

      await prisma.asset.create({
        data: {
          inputJobId: job.id,
          type: 'input_image',
          storagePath: fullPath,
          mimeType: file.mimetype || 'image/jpeg',
          sizeBytes: file.size,
          width: val.width,
          height: val.height,
          visibility: 'private', // Raw input photos remain strictly private
        },
      });
    }

    res.status(201).json({
      jobId: job.id,
      status: job.status,
      segmentationMode: job.segmentationMode,
      visibility: job.visibility,
      version: job.version,
      imageCount: files.length,
      warnings: allWarnings,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Get Job Status ───────────────────────────────────────────────────────────

export async function getJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const jobId = String(req.params.jobId);
    const job = await prisma.aRJob.findUnique({
      where: { id: jobId },
    });

    if (!job) { res.status(404).json({ error: 'Job not found' }); return; }

    const isOwner = job.userId === req.userId || req.authMethod === 'internal';
    const isPublic = job.visibility === 'public' || job.visibility === 'unlisted';

    if (!isOwner && !isPublic) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    res.json({
      id: job.id,
      status: job.status,
      apiTier: job.apiTier,
      itemName: job.itemName,
      itemDescription: job.itemDescription,
      itemTasteProfile: job.itemTasteProfile,
      itemCategory: job.itemCategory,
      itemPrice: job.itemPrice,
      segmentationMode: job.segmentationMode,
      segmentationConfidence: job.segmentationConfidence,
      detectedObjects: job.detectedObjects ? JSON.parse(job.detectedObjects) : null,
      segmentationConfirmed: job.segmentationConfirmed,
      visibility: job.visibility,
      version: job.version,
      errorMessage: job.errorMessage,
      errorCode: job.errorCode,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
    });
  } catch (err) { next(err); }
}

// ─── Get Job Result (assets with URLs) ───────────────────────────────────────

export async function getJobResult(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const jobId = String(req.params.jobId);
    const job = await prisma.aRJob.findUnique({
      where: { id: jobId },
      include: { outputAssets: true },
    });

    if (!job) { res.status(404).json({ error: 'Job not found' }); return; }

    const isOwner = job.userId === req.userId || req.authMethod === 'internal';
    const isPublic = job.visibility === 'public' || job.visibility === 'unlisted';

    if (!isOwner && !isPublic) {
      res.status(403).json({ error: 'Access denied. This AR job is private.' });
      return;
    }

    if (job.status !== 'ready') {
      res.status(400).json({
        error: `Job is not ready yet. Current status: ${job.status}`,
        code: 'JOB_NOT_READY',
        status: job.status,
      });
      return;
    }

    const storage = createStorageProvider();
    const assetUrls: Record<string, string> = {};
    const formats: Array<'glb' | 'usdz'> = [];
    let primaryAssetId: string | null = null;

    for (const asset of job.outputAssets) {
      if (asset.storageKey) {
        const url = await storage.getUrl(asset.storageKey, 3600);
        if (asset.type === 'glb') {
          assetUrls.glbUrl = url;
          formats.push('glb');
          primaryAssetId = asset.id;
        }
        if (asset.type === 'usdz') {
          assetUrls.usdzUrl = url;
          formats.push('usdz');
          if (!primaryAssetId) primaryAssetId = asset.id;
        }
        if (asset.type === 'thumbnail') {
          assetUrls.thumbnailUrl = url;
        }
      }
    }

    res.json({
      id: job.id,
      status: job.status,
      apiTier: job.apiTier,
      itemName: job.itemName,
      itemDescription: job.itemDescription,
      itemTasteProfile: job.itemTasteProfile,
      itemCategory: job.itemCategory,
      itemPrice: job.itemPrice,
      segmentationMode: job.segmentationMode,
      segmentationConfidence: job.segmentationConfidence,
      visibility: job.visibility,
      version: job.version,
      primaryAssetId,
      completedAt: job.completedAt,
      assets: assetUrls,
      formats,
    });
  } catch (err) { next(err); }
}

// ─── List Jobs ────────────────────────────────────────────────────────────────

export async function listJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ error: 'Authentication required.' }); return; }

    const where = req.authMethod === 'internal' ? {} : { userId };

    const jobs = await prisma.aRJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        status: true,
        apiTier: true,
        itemName: true,
        itemDescription: true,
        itemTasteProfile: true,
        itemCategory: true,
        itemPrice: true,
        segmentationMode: true,
        segmentationConfidence: true,
        visibility: true,
        version: true,
        errorMessage: true,
        errorCode: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
        outputAssets: {
          where: { type: 'thumbnail' },
          select: { id: true, storageKey: true },
          take: 1,
        },
      },
    });

    const storage = createStorageProvider();
    const jobsWithThumbs = await Promise.all(
      jobs.map(async (job) => {
        const thumbAsset = job.outputAssets[0];
        const thumbnailUrl = thumbAsset?.storageKey
          ? await storage.getUrl(thumbAsset.storageKey, 3600)
          : null;
        return {
          id: job.id,
          status: job.status,
          apiTier: job.apiTier,
          itemName: job.itemName,
          itemDescription: job.itemDescription,
          itemTasteProfile: job.itemTasteProfile,
          itemCategory: job.itemCategory,
          itemPrice: job.itemPrice,
          segmentationMode: job.segmentationMode,
          segmentationConfidence: job.segmentationConfidence,
          visibility: job.visibility,
          version: job.version,
          errorMessage: job.errorMessage,
          errorCode: job.errorCode,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
          completedAt: job.completedAt,
          thumbnailUrl,
        };
      })
    );

    res.json({ jobs: jobsWithThumbs });
  } catch (err) { next(err); }
}

// ─── Get Single Asset By ID (Viewing existing asset — NO re-generation) ──────

export async function getAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const assetId = String(req.params.assetId);
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        outputJob: {
          include: {
            outputAssets: true,
          },
        },
        inputJob: true,
      },
    });

    if (!asset) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    const parentJob = asset.outputJob || asset.inputJob;
    const isOwner = (parentJob && parentJob.userId === req.userId) || req.authMethod === 'internal';
    const isPublic =
      asset.visibility === 'public' ||
      asset.visibility === 'unlisted' ||
      parentJob?.visibility === 'public' ||
      parentJob?.visibility === 'unlisted';

    if (!isOwner && !isPublic) {
      res.status(403).json({ error: 'Access denied. This asset is private.' });
      return;
    }

    const storage = createStorageProvider();
    const downloadUrl = asset.storageKey
      ? await storage.getUrl(asset.storageKey, 3600)
      : null;

    let glbUrl: string | null = null;
    let usdzUrl: string | null = null;
    let thumbnailUrl: string | null = null;

    if (asset.outputJob) {
      for (const companion of asset.outputJob.outputAssets) {
        if (!companion.storageKey) continue;
        const url = await storage.getUrl(companion.storageKey, 3600);
        if (companion.type === 'glb') glbUrl = url;
        if (companion.type === 'usdz') usdzUrl = url;
        if (companion.type === 'thumbnail') thumbnailUrl = url;
      }
    }

    res.json({
      assetId: asset.id,
      jobId: asset.outputJobId || asset.inputJobId,
      type: asset.type,
      visibility: asset.visibility,
      version: asset.version,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      downloadUrl,
      glbUrl: glbUrl || (asset.type === 'glb' ? downloadUrl : null),
      usdzUrl: usdzUrl || (asset.type === 'usdz' ? downloadUrl : null),
      thumbnailUrl: thumbnailUrl || (asset.type === 'thumbnail' ? downloadUrl : null),
      isOwner,
      createdAt: asset.createdAt,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Stream / Redirect Model For 3D & Embed Viewers ──────────────────────────

export async function getAssetModelStream(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const assetId = String(req.params.assetId);
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        outputJob: {
          include: { outputAssets: true },
        },
      },
    });

    if (!asset) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    const parentJob = asset.outputJob;
    const isOwner = (parentJob && parentJob.userId === req.userId) || req.authMethod === 'internal';
    const isPublic =
      asset.visibility === 'public' ||
      asset.visibility === 'unlisted' ||
      parentJob?.visibility === 'public' ||
      parentJob?.visibility === 'unlisted';

    if (!isOwner && !isPublic) {
      res.status(403).json({ error: 'Access denied. This asset is private.' });
      return;
    }

    // Find GLB model
    const glbAsset = asset.type === 'glb' ? asset : parentJob?.outputAssets.find((a) => a.type === 'glb');

    if (!glbAsset) {
      res.status(404).json({ error: 'GLB 3D model not found for this asset' });
      return;
    }

    const storage = createStorageProvider();
    if (glbAsset.storageKey) {
      const url = await storage.getUrl(glbAsset.storageKey, 3600);
      res.redirect(url);
      return;
    }

    if (glbAsset.storagePath && fs.existsSync(glbAsset.storagePath)) {
      res.setHeader('Content-Type', 'model/gltf-binary');
      fs.createReadStream(glbAsset.storagePath).pipe(res);
      return;
    }

    res.status(404).json({ error: 'Model file unavailable' });
  } catch (err) {
    next(err);
  }
}

// ─── Update Job Visibility (private | unlisted | public) ─────────────────────

export async function updateJobVisibility(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const jobId = String(req.params.jobId);
    const { visibility } = req.body as { visibility?: string };

    if (!visibility || !['private', 'unlisted', 'public'].includes(visibility)) {
      res.status(400).json({ error: 'Valid visibility ("private", "unlisted", or "public") is required.' });
      return;
    }

    const job = await prisma.aRJob.findUnique({ where: { id: jobId } });
    if (!job) { res.status(404).json({ error: 'Job not found' }); return; }

    const isOwner = job.userId === req.userId || req.authMethod === 'internal';
    if (!isOwner) { res.status(403).json({ error: 'Access denied.' }); return; }

    await prisma.$transaction([
      prisma.aRJob.update({
        where: { id: jobId },
        data: { visibility },
      }),
      prisma.asset.updateMany({
        where: { outputJobId: jobId },
        data: { visibility },
      }),
    ]);

    res.json({ jobId, visibility, message: `Visibility updated to ${visibility}` });
  } catch (err) {
    next(err);
  }
}

// ─── Confirm Segmentation (for low-confidence review flow) ───────────────────

export async function confirmSegmentation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const jobId = String(req.params.jobId);
    const { includedObjects } = req.body as { includedObjects?: string[] };

    const job = await prisma.aRJob.findUnique({ where: { id: jobId } });
    if (!job) { res.status(404).json({ error: 'Job not found' }); return; }

    const isOwner = job.userId === req.userId || req.authMethod === 'internal';
    if (!isOwner) { res.status(403).json({ error: 'Access denied.' }); return; }

    if (job.status !== 'segmenting_subject' && job.status !== 'queued') {
      res.status(400).json({
        error: 'Segmentation cannot be confirmed at this stage.',
        code: 'INVALID_STATE',
        status: job.status,
      });
      return;
    }

    await prisma.aRJob.update({
      where: { id: jobId },
      data: {
        segmentationConfirmed: true,
        detectedObjects: includedObjects ? JSON.stringify(includedObjects) : job.detectedObjects,
        status: 'queued',
      },
    });

    res.json({ jobId, status: 'queued', message: 'Segmentation confirmed. Processing will continue.' });
  } catch (err) { next(err); }
}

// ─── Delete Job ───────────────────────────────────────────────────────────────

export async function deleteJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const jobId = String(req.params.jobId);
    const job = await prisma.aRJob.findUnique({
      where: { id: jobId },
      include: { inputAssets: true, outputAssets: true },
    });

    if (!job) { res.status(404).json({ error: 'Job not found' }); return; }

    const isOwner = job.userId === req.userId || req.authMethod === 'internal';
    if (!isOwner) { res.status(403).json({ error: 'Access denied.' }); return; }

    const storage = createStorageProvider();

    const allAssets = [...job.inputAssets, ...job.outputAssets];
    await Promise.all(
      allAssets.map(async (asset) => {
        if (asset.storageKey) {
          await storage.delete(asset.storageKey);
        } else if (asset.storagePath && fs.existsSync(asset.storagePath)) {
          await fs.promises.unlink(asset.storagePath).catch(() => {});
        }
      })
    );

    await prisma.aRJob.delete({ where: { id: jobId } });

    res.status(204).send();
  } catch (err) { next(err); }
}
