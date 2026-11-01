/**
 * PassthroughSegmentationProvider
 *
 * Use when your AR reconstruction provider (e.g. Tripo3D) already
 * performs background removal and subject segmentation natively.
 *
 * This provider does NOT remove backgrounds itself — it passes images
 * through unmodified and marks the result as provider-handled so the
 * reconstruction provider applies its own segmentation.
 *
 * Set SEGMENTATION_PROVIDER=passthrough when using a provider that
 * bundles segmentation. Check your AR provider's documentation to
 * confirm it performs background removal before setting this.
 */
import type {
  SegmentationProvider,
  SegmentationResult,
  SegmentationMode,
  SegmentedImage,
} from './SegmentationProvider';

export class PassthroughSegmentationProvider implements SegmentationProvider {
  readonly providerId = 'passthrough';

  isConfigured(): boolean {
    return true;
  }

  async segment(
    images: Buffer[],
    _mode: SegmentationMode,
    _jobId: string
  ): Promise<SegmentationResult> {
    const segmentedImages: SegmentedImage[] = images.map((img) => ({
      original: img,
      masked: img, // Provider handles segmentation internally
      confidence: 1.0,
      foregroundCoverage: 1.0,
      warnings: [],
    }));

    return {
      segmentedImages,
      detectedObjects: [],
      overallConfidence: 1.0,
      requiresUserReview: false,
      warnings: [
        'Background removal is handled by the AR reconstruction provider. ' +
        'Ensure your AR_PROVIDER supports native subject segmentation.',
      ],
    };
  }
}
