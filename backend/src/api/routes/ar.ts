import { Router } from 'express';
import multer from 'multer';
import {
  createJob,
  getJob,
  getJobResult,
  listJobs,
  confirmSegmentation,
  deleteJob,
  getAsset,
  getAssetModelStream,
  updateJobVisibility,
} from '../controllers/arController';
import { requireAuthOrApiKey, optionalAuth } from '../middleware/auth';
import { uploadRateLimit, apiRateLimit } from '../middleware/rateLimit';
import { BUSINESS } from '../../config/business';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: BUSINESS.limits.maxFileSizeBytes,
    files: BUSINESS.limits.maxImagesPerJob,
  },
});

// ─── Job Endpoints ────────────────────────────────────────────────────────────

// Create job (upload & start reconstruction pipeline)
router.post(
  '/jobs',
  requireAuthOrApiKey,
  uploadRateLimit,
  upload.array('images', BUSINESS.limits.maxImagesPerJob),
  createJob
);

// List user's jobs
router.get('/jobs', requireAuthOrApiKey, listJobs);

// Get job status (authenticated or public/unlisted)
router.get('/jobs/:jobId', optionalAuth, getJob);

// Get completed job result with signed asset URLs
router.get('/jobs/:jobId/result', optionalAuth, getJobResult);

// Update job visibility ('private' | 'unlisted' | 'public')
router.patch('/jobs/:jobId/visibility', requireAuthOrApiKey, apiRateLimit, updateJobVisibility);

// Confirm segmentation (for low-confidence review flow)
router.post('/jobs/:jobId/confirm-segmentation', requireAuthOrApiKey, confirmSegmentation);

// Delete job and all stored assets
router.delete('/jobs/:jobId', requireAuthOrApiKey, deleteJob);

// ─── Asset Endpoints (Viewing existing assets — NO re-generation) ──────────────

// Get asset metadata & download URLs by assetId
router.get('/assets/:assetId', optionalAuth, apiRateLimit, getAsset);

// Stream / redirect 3D model (GLB) for <model-viewer> or iframe embed
router.get('/assets/:assetId/model', optionalAuth, getAssetModelStream);

export default router;
