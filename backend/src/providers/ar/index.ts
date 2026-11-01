/**
 * AR Provider Factory
 *
 * Reads AR_PROVIDER from config and returns the appropriate provider.
 * The job manager and controllers use this — never import concrete
 * providers directly outside this file and the provider directory.
 *
 * Adding a new provider:
 * 1. Create MyARProvider implementing ARGenerationProvider
 * 2. Add a case here
 * 3. Document in .env.example and docs/deployment.md
 */
import { env } from '../../config/env';
import type { ARGenerationProvider } from './ARGenerationProvider';
import { UnconfiguredARProvider } from './UnconfiguredARProvider';
import { Tripo3DARProvider } from './Tripo3DARProvider';
import { TripoSRARProvider } from './TripoSRARProvider';
import { MockARProvider } from './MockARProvider';
import { NativeARProvider } from './NativeARProvider';
import { CloudGPUProvider } from './CloudGPUProvider';

let _instance: ARGenerationProvider | null = null;

export function createARProvider(): ARGenerationProvider {
  if (_instance) return _instance;

  switch (env.arProvider) {
    case 'native':
      _instance = new NativeARProvider();
      break;

    case 'cloud_gpu':
    case 'modal':
    case 'runpod':
      _instance = new CloudGPUProvider();
      break;

    case 'mock':
      _instance = new MockARProvider();
      break;

    case 'tripo3d':
      _instance = new Tripo3DARProvider(env.arProviderApiKey);
      break;

    case 'triposr':
      // TripoSR is an open-source model with no official hosted API.
      // Requires a self-hosted server. Set TRIPOSR_ENDPOINT in backend/.env.
      // See backend/src/providers/ar/TripoSRARProvider.ts for deployment instructions.
      _instance = new TripoSRARProvider(env.triposrEndpoint, env.triposrApiKey);
      break;

    case 'meshy':
      // Meshy adapter planned for Phase 3.
      console.warn(
        '[AR] Meshy provider is not yet implemented. ' +
        'Use AR_PROVIDER=tripo3d for now.'
      );
      _instance = new UnconfiguredARProvider();
      break;

    case 'unconfigured':
    default:
      _instance = new UnconfiguredARProvider();
      if (env.arProvider !== 'unconfigured') {
        console.warn(
          `[AR] Unknown provider "${env.arProvider}". Falling back to unconfigured.`
        );
      }
  }

  return _instance;
}
