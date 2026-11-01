/**
 * Shared TypeScript types for API contracts.
 * Frontend uses these to type API responses.
 * Keep in sync with backend response shapes.
 */

// ─── Auth ─────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string | null;
  creditBalance?: number;
  createdAt: string;
}

export interface TrialInfo {
  generationsTotal: number;
  generationsUsed: number;
  generationsRemaining: number;
}

export interface SubscriptionInfo {
  plan: 'web_app' | 'developer_api';
  status: 'trialing' | 'active' | 'past_due' | 'canceled';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface MeResponse {
  user: User;
  subscription: SubscriptionInfo | null;
  trial: TrialInfo;
  /** true when user has no active subscription (on free trial) */
  isOnTrial: boolean;
  /** false when trial exhausted and no subscription — use to gate the create button */
  canCreate: boolean;
  creditBalance?: number;
  apiUsage: {
    requestsThisMonth: number;
    resetAt: string | null;
  };
}

// ─── AR Jobs ───────────────────────────────────────────────────────────────

export type ARJobStatus =
  | 'queued'
  | 'preparing_images'
  | 'segmenting_subject'
  | 'uploading_photos'
  | 'analyzing_views'
  | 'reconstructing_object'
  | 'generating_3d_model'
  | 'optimizing_model'
  | 'preparing_ar'
  | 'ready'
  | 'failed';

export type SegmentationMode = 'smart' | 'dish_only' | 'custom';

export interface DetectedObject {
  label: string;
  confidence: number;
  includeByDefault: boolean;
}

export interface ARJob {
  id: string;
  status: ARJobStatus;
  apiTier?: string;
  itemName?: string | null;
  itemDescription?: string | null;
  itemTasteProfile?: string | null;
  itemCategory?: string | null;
  itemPrice?: number | null;
  segmentationMode: SegmentationMode;
  segmentationConfidence: number | null;
  detectedObjects: DetectedObject[] | null;
  segmentationConfirmed: boolean;
  visibility?: 'private' | 'unlisted' | 'public';
  version?: number;
  errorMessage: string | null;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  thumbnailUrl?: string | null;
}

export interface ARJobResult extends ARJob {
  primaryAssetId?: string | null;
  assets: {
    glbUrl?: string;
    usdzUrl?: string;
    thumbnailUrl?: string;
  };
  formats: Array<'glb' | 'usdz'>;
}


// ─── Status progress messages ──────────────────────────────────────────────

export const JOB_STATUS_LABELS: Record<ARJobStatus, string> = {
  queued: 'Waiting to start',
  preparing_images: 'Preparing images',
  segmenting_subject: 'Isolating subject',
  uploading_photos: 'Uploading photos',
  analyzing_views: 'Analyzing views',
  reconstructing_object: 'Reconstructing object',
  generating_3d_model: 'Generating 3D model',
  optimizing_model: 'Optimizing model',
  preparing_ar: 'Preparing AR',
  ready: 'Ready',
  failed: 'Failed',
};

// ─── API Keys ──────────────────────────────────────────────────────────────

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string; // Safe to display — first 16 chars
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export interface ApiKeyCreated extends ApiKey {
  /** Full key shown ONCE at creation. User must copy immediately. */
  fullKey: string;
}

// ─── Segmentation ──────────────────────────────────────────────────────────

export interface SegmentationReview {
  jobId: string;
  detectedObjects: DetectedObject[];
  overallConfidence: number;
  requiresUserReview: boolean;
  warnings: string[];
}
