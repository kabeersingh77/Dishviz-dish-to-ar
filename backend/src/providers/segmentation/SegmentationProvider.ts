/**
 * SegmentationProvider — abstract interface for subject isolation.
 *
 * Pipeline position:
 *   Input Images → [SegmentationProvider] → Segmented Images → AR Reconstruction
 *
 * Every provider MUST implement this contract.
 * Providers that bundle segmentation natively (e.g. Tripo3D) use PassthroughSegmentationProvider.
 */

export type SegmentationMode = 'smart' | 'dish_only' | 'custom';

export interface DetectedObject {
  label: string;
  confidence: number;
  /** Whether this object should be included in reconstruction by default */
  includeByDefault: boolean;
}

export interface SegmentedImage {
  /** The original input image buffer */
  original: Buffer;
  /**
   * Image with background removed / subject isolated.
   * PNG format with transparency channel where background was removed.
   */
  masked: Buffer;
  /** 0–1: how confident the provider is in the segmentation quality */
  confidence: number;
  /** Fraction of frame occupied by foreground (0–1) */
  foregroundCoverage: number;
  /** Warning messages about segmentation quality — safe to show to users */
  warnings: string[];
}

export interface SegmentationResult {
  segmentedImages: SegmentedImage[];
  detectedObjects: DetectedObject[];
  /** Overall confidence across all images (0–1) */
  overallConfidence: number;
  /**
   * true  → confidence is sufficient; proceed to reconstruction automatically
   * false → confidence is low; surface review step to the user
   */
  requiresUserReview: boolean;
  warnings: string[];
}

export interface SegmentationProvider {
  readonly providerId: string;

  /**
   * Segment subjects from background across multiple images.
   * @param images    Raw image buffers from user upload/capture
   * @param mode      Segmentation mode chosen by the user
   * @param jobId     For logging purposes only — never expose internally
   */
  segment(
    images: Buffer[],
    mode: SegmentationMode,
    jobId: string
  ): Promise<SegmentationResult>;

  /**
   * Returns true when the provider is properly configured and ready.
   * Returns false when credentials are missing or the provider is unavailable.
   */
  isConfigured(): boolean;
}
