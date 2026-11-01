/**
 * UnconfiguredARProvider
 *
 * Active when AR_PROVIDER is not set or is "unconfigured".
 * Returns HTTP 503-equivalent errors with clear setup instructions.
 * This prevents silent bad results — the operator is told exactly what to configure.
 */
import type {
  ARGenerationProvider,
  ARAssets,
  ARJobStatus,
  JobMetadata,
  JobStateUpdate,
} from './ARGenerationProvider';

const CONFIG_ERROR =
  'AR generation provider is not configured. ' +
  'Set AR_PROVIDER (tripo3d or meshy) and AR_PROVIDER_API_KEY in your .env file. ' +
  'See docs/deployment.md for provider setup instructions.';

export class UnconfiguredARProvider implements ARGenerationProvider {
  readonly providerId = 'unconfigured';

  isConfigured(): boolean {
    return false;
  }

  async createJob(
    _images: Buffer[],
    _metadata: JobMetadata
  ): Promise<{ providerJobId: string }> {
    throw new Error(CONFIG_ERROR);
  }

  async getJobStatus(_providerJobId: string): Promise<JobStateUpdate> {
    return {
      status: 'failed' as ARJobStatus,
      errorCode: 'PROVIDER_NOT_CONFIGURED',
      errorMessage: CONFIG_ERROR,
    };
  }

  async fetchAssets(_providerJobId: string): Promise<ARAssets> {
    throw new Error(CONFIG_ERROR);
  }
}
