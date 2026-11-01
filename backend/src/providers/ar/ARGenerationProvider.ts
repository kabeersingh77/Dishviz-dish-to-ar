/**
 * ARGenerationProvider — abstract interface for 3D reconstruction.
 *
 * Full pipeline:
 *   Input Images
 *   → SegmentationProvider (background removal)
 *   → [ARGenerationProvider] (3D reconstruction + optimization)
 *   → AR-ready GLB/USDZ assets
 *
 * Implement this interface for every reconstruction backend.
 * The frontend and job manager NEVER interact with a concrete provider directly.
 */

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

export interface JobMetadata {
  jobId: string;
  segmentationMode: string;
  imageCount: number;
}

export interface JobStateUpdate {
  status: ARJobStatus;
  /** User-safe progress message (shown in UI) */
  progressMessage?: string;
  /** Provider's internal job ID for polling */
  providerJobId?: string;
  /** Set when status === 'failed' */
  errorCode?: string;
  errorMessage?: string;
}

export interface ARAssets {
  /** GLB/glTF binary — required */
  glb?: Buffer;
  /** USDZ for iOS Quick Look — optional but strongly recommended */
  usdz?: Buffer;
  /** Thumbnail render of the generated model */
  thumbnail?: Buffer;
}

export interface ARGenerationProvider {
  readonly providerId: string;

  /**
   * Create a new reconstruction job.
   * @param segmentedImages  Background-removed images from SegmentationProvider
   * @param metadata         Job context (no sensitive data)
   * @returns Provider's job ID for polling
   */
  createJob(
    segmentedImages: Buffer[],
    metadata: JobMetadata
  ): Promise<{ providerJobId: string }>;

  /**
   * Poll the reconstruction job status.
   * Called repeatedly by the job manager until status is 'ready' or 'failed'.
   */
  getJobStatus(providerJobId: string): Promise<JobStateUpdate>;

  /**
   * Fetch the generated 3D asset buffers once status is 'ready'.
   */
  fetchAssets(providerJobId: string): Promise<ARAssets>;

  /**
   * Returns true when the provider is configured and ready.
   */
  isConfigured(): boolean;
}
