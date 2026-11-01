/**
 * Factory: createSegmentationProvider
 *
 * Reads SEGMENTATION_PROVIDER from config and returns the appropriate provider.
 * All providers implement the same SegmentationProvider interface,
 * so the rest of the pipeline never depends on a concrete implementation.
 *
 * Adding a new provider:
 * 1. Create MyProvider implementing SegmentationProvider
 * 2. Add a case here
 * 3. Document in .env.example
 */
import { env } from '../../config/env';
import type { SegmentationProvider } from './SegmentationProvider';
import { UnconfiguredSegmentationProvider } from './UnconfiguredSegmentationProvider';
import { PassthroughSegmentationProvider } from './PassthroughSegmentationProvider';
import { RemBgSegmentationProvider } from './RemBgSegmentationProvider';

let _instance: SegmentationProvider | null = null;

export function createSegmentationProvider(): SegmentationProvider {
  if (_instance) return _instance;

  switch (env.segmentationProvider) {
    case 'rembg':
      _instance = new RemBgSegmentationProvider(env.segmentationApiKey);
      break;

    case 'passthrough':
      _instance = new PassthroughSegmentationProvider();
      break;

    case 'sam':
      // SAM adapter is planned for Phase 3.
      // Set SEGMENTATION_PROVIDER=passthrough or rembg in the meantime.
      console.warn(
        '[SEGMENTATION] SAM provider is not yet implemented. ' +
        'Falling back to unconfigured. Set SEGMENTATION_PROVIDER=rembg or passthrough.'
      );
      _instance = new UnconfiguredSegmentationProvider();
      break;

    case 'unconfigured':
    default:
      _instance = new UnconfiguredSegmentationProvider();
      if (env.segmentationProvider !== 'unconfigured') {
        console.warn(
          `[SEGMENTATION] Unknown provider "${env.segmentationProvider}". ` +
          'Falling back to unconfigured.'
        );
      }
  }

  return _instance;
}
