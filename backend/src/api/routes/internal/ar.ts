import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { prisma } from '../../../db/prisma';
import { BUSINESS } from '../../../config/business';
import { env } from '../../../config/env';
import { validateImageBuffer } from '../../../utils/serverImageValidation';
import { getAsset, getAssetModelStream } from '../../controllers/arController';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: BUSINESS.limits.maxFileSizeBytes,
    files: BUSINESS.limits.maxImagesPerJob,
  },
});

/**
 * POST /api/internal/v1/ar/jobs
 *
 * Master/Private AR Job Submission.
 * Exclusively for internal downstream SaaS (e.g. Universal Digital Menu).
 * Features:
 *  - 6-8 photos upload
 *  - Food metadata (itemName, itemDescription, itemTasteProfile, itemCategory, itemPrice)
 *  - Optional webhookUrl for async completion notification
 *  - Idempotency check via Idempotency-Key header
 *  - ZERO credit deduction (unlimited internal entitlement)
 *  - Fast non-blocking queue response
 */
router.post('/jobs', upload.array('images', BUSINESS.limits.maxImagesPerJob), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const {
      itemName,
      itemDescription,
      itemTasteProfile,
      itemCategory,
      itemPrice,
      webhookUrl,
      segmentationMode,
    } = req.body as {
      itemName?: string;
      itemDescription?: string;
      itemTasteProfile?: string;
      itemCategory?: string;
      itemPrice?: string | number;
      webhookUrl?: string;
      segmentationMode?: string;
    };

    const idempotencyKey = (req.headers['idempotency-key'] as string) || (req.body?.idempotencyKey as string);

    // Idempotency check
    if (idempotencyKey) {
      const existing = await prisma.aRJob.findUnique({
        where: { idempotencyKey },
        include: { outputAssets: true },
      });
      if (existing) {
        res.status(200).json({
          jobId: existing.id,
          status: existing.status,
          apiTier: 'master_internal',
          idempotent: true,
        });
        return;
      }
    }

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No photos provided. Please upload 6–8 photos of the item.' });
      return;
    }

    // Validate images
    const validationResults = await Promise.all(
      files.map((file) => validateImageBuffer(file.buffer, file.originalname))
    );

    const fatalErrors = validationResults.flatMap((r) => r.errors);
    if (fatalErrors.length > 0) {
      res.status(400).json({ error: 'One or more photos failed validation.', details: fatalErrors });
      return;
    }

    // Ensure dedicated master internal system user exists
    const masterUser = await prisma.user.upsert({
      where: { email: 'master-internal@dishviz.local' },
      create: {
        email: 'master-internal@dishviz.local',
        passwordHash: 'MASTER_INTERNAL_ACCOUNT_NO_LOGIN',
        name: 'Dishviz Master Internal Service',
      },
      update: {},
    });

    const uploadDir = path.resolve(process.cwd(), env.storageLocalPath);
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const parsedPrice = typeof itemPrice === 'number' ? itemPrice : (itemPrice ? parseFloat(String(itemPrice)) : null);
    const mode = segmentationMode === 'dish_only' ? 'dish_only' : 'smart';

    // Create AR Job in database
    const job = await prisma.aRJob.create({
      data: {
        userId: masterUser.id,
        status: 'queued',
        apiTier: 'master_internal',
        segmentationMode: mode,
        visibility: 'unlisted', // Master assets are unlisted by default so downstream app can embed them
        version: 1,
        itemName: itemName?.trim() || null,
        itemDescription: itemDescription?.trim() || null,
        itemTasteProfile: itemTasteProfile?.trim() || null,
        itemCategory: itemCategory?.trim() || null,
        itemPrice: parsedPrice,
        webhookUrl: webhookUrl?.trim() || null,
        idempotencyKey: idempotencyKey?.trim() || null,
      },
    });

    // Save input images to storage
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const val = validationResults[i];
      const fileExt = val.format === 'png' ? 'png' : val.format === 'webp' ? 'webp' : 'jpg';
      const storageFilename = `master_input_${job.id}_${i}_${Date.now()}.${fileExt}`;
      const diskPath = path.join(uploadDir, storageFilename);

      await fs.promises.writeFile(diskPath, file.buffer);

      await prisma.asset.create({
        data: {
          inputJobId: job.id,
          type: 'input_image',
          storagePath: diskPath,
          storageKey: `inputs/${job.id}/${storageFilename}`,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          width: val.width ?? null,
          height: val.height ?? null,
          visibility: 'unlisted',
        },
      });
    }

    res.status(201).json({
      jobId: job.id,
      status: 'queued',
      apiTier: 'master_internal',
      itemName: job.itemName,
      itemCategory: job.itemCategory,
      createdAt: job.createdAt,
    });
  } catch (err) {
    console.error('[Master AR] Job creation error:', err);
    res.status(500).json({ error: 'Internal server error while processing master AR job.' });
  }
});

/**
 * GET /api/internal/v1/ar/jobs/:jobId
 *
 * Query master job status, progress, metadata, and completed assets.
 */
router.get('/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const jobId = String(req.params.jobId);
    const job = await prisma.aRJob.findUnique({
      where: { id: jobId },
      include: { outputAssets: true },
    });

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const outputAssets = (job as any).outputAssets || [];
    const glbAsset = outputAssets.find((a: any) => a.type === 'glb');
    const usdzAsset = outputAssets.find((a: any) => a.type === 'usdz');
    const thumbAsset = outputAssets.find((a: any) => a.type === 'thumbnail');

    res.json({
      jobId: job.id,
      status: job.status,
      apiTier: job.apiTier,
      itemName: job.itemName,
      itemDescription: job.itemDescription,
      itemTasteProfile: job.itemTasteProfile,
      itemCategory: job.itemCategory,
      itemPrice: job.itemPrice,
      primaryAssetId: glbAsset?.id ?? null,
      assets: {
        glbUrl: glbAsset ? `/api/internal/v1/ar/assets/${glbAsset.id}/model` : undefined,
        usdzUrl: usdzAsset ? `/api/internal/v1/ar/assets/${usdzAsset.id}/model` : undefined,
        thumbnailUrl: thumbAsset ? `/api/internal/v1/ar/assets/${thumbAsset.id}/model` : undefined,
      },
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      errorMessage: job.errorMessage,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve master job.' });
  }
});

// Direct asset viewing / model streaming
router.get('/assets/:assetId', getAsset);
router.get('/assets/:assetId/model', getAssetModelStream);

export default router;
