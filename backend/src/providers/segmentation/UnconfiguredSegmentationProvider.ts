/**
 * UnconfiguredSegmentationProvider
 *
 * Active when SEGMENTATION_PROVIDER is not set or is "unconfigured".
 * Returns a clear configuration error rather than silently failing or
 * generating a poor-quality asset without background removal.
 *
 * Setup instructions are returned so the operator can configure the system.
 */
import type {
  SegmentationProvider,
  SegmentationResult,
  SegmentationMode,
} from './SegmentationProvider';

export class UnconfiguredSegmentationProvider implements SegmentationProvider {
  readonly providerId = 'unconfigured';

  isConfigured(): boolean {
    return false;
  }

  async segment(
    _images: Buffer[],
    _mode: SegmentationMode,
    _jobId: string
  ): Promise<SegmentationResult> {
    throw new Error(
      'Subject segmentation provider is not configured. ' +
      'Set SEGMENTATION_PROVIDER and SEGMENTATION_API_KEY in your .env file. ' +
      'Supported providers: rembg, sam, passthrough. ' +
      'See docs/deployment.md for setup instructions.'
    );
  }
}
