import https from 'https';
import http from 'http';
import { env } from '../../config/env';
import type {
  ARGenerationProvider,
  JobMetadata,
  JobStateUpdate,
  ARAssets,
} from './ARGenerationProvider';

interface CloudGPUSubmissionResponse {
  jobId?: string;
  id?: string;
  status?: string;
  glbBase64?: string;
  glbUrl?: string;
  usdzBase64?: string;
  usdzUrl?: string;
  thumbnailBase64?: string;
}

/**
 * CloudGPUProvider
 *
 * Connects Dishviz to any remote Cloud GPU worker (Modal, RunPod, AWS SageMaker, etc.)
 *
 * Configuration (.env):
 *   AR_PROVIDER=cloud_gpu
 *   CLOUD_GPU_ENDPOINT=https://your-modal-app.modal.run/reconstruct
 *   CLOUD_GPU_API_KEY=optional_secret_bearer_token
 */
export class CloudGPUProvider implements ARGenerationProvider {
  readonly providerId = 'cloud_gpu';
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly assetCache = new Map<string, ARAssets>();

  constructor() {
    this.endpoint = env.cloudGpuEndpoint || process.env.CLOUD_GPU_ENDPOINT || '';
    this.apiKey = env.cloudGpuApiKey || process.env.CLOUD_GPU_API_KEY || '';
  }

  isConfigured(): boolean {
    return Boolean(this.endpoint);
  }

  async createJob(
    segmentedImages: Buffer[],
    metadata: JobMetadata
  ): Promise<{ providerJobId: string }> {
    if (!this.endpoint) {
      throw new Error(
        'CLOUD_GPU_ENDPOINT is not configured in .env. ' +
        'Specify the URL to your Modal or RunPod inference worker.'
      );
    }

    const payload = JSON.stringify({
      jobId: metadata.jobId,
      segmentationMode: metadata.segmentationMode,
      images: segmentedImages.map((buf) => buf.toString('base64')),
    });

    const response = await this.postJson<CloudGPUSubmissionResponse>(this.endpoint, payload);
    const remoteJobId = response.jobId || response.id || metadata.jobId;

    // If the GPU worker processed synchronously and returned the 3D model immediately
    if (response.glbBase64 || response.glbUrl) {
      const glbBuffer = response.glbBase64
        ? Buffer.from(response.glbBase64, 'base64')
        : await this.downloadBuffer(response.glbUrl!);

      const usdzBuffer = response.usdzBase64
        ? Buffer.from(response.usdzBase64, 'base64')
        : response.usdzUrl
        ? await this.downloadBuffer(response.usdzUrl)
        : undefined;

      this.assetCache.set(remoteJobId, {
        glb: glbBuffer,
        usdz: usdzBuffer,
      });
    }

    return {
      providerJobId: remoteJobId,
    };
  }

  async getJobStatus(providerJobId: string): Promise<JobStateUpdate> {
    // If already completed in synchronous pass
    if (this.assetCache.has(providerJobId)) {
      return {
        status: 'ready',
        providerJobId,
      };
    }

    const pollUrl = `${this.endpoint.replace(/\/$/, '')}/status/${providerJobId}`;
    try {
      const statusRes = await this.getJson<{
        status: string;
        error?: string;
        glbUrl?: string;
        glbBase64?: string;
      }>(pollUrl);

      if (statusRes.status === 'COMPLETED' || statusRes.status === 'ready' || statusRes.status === 'success') {
        if (statusRes.glbBase64 || statusRes.glbUrl) {
          const glb = statusRes.glbBase64
            ? Buffer.from(statusRes.glbBase64, 'base64')
            : await this.downloadBuffer(statusRes.glbUrl!);
          this.assetCache.set(providerJobId, { glb });
        }
        return { status: 'ready', providerJobId };
      }

      if (statusRes.status === 'FAILED' || statusRes.status === 'failed' || statusRes.status === 'error') {
        return {
          status: 'failed',
          providerJobId,
          errorMessage: statusRes.error || 'GPU worker reported processing failure',
          errorCode: 'GPU_WORKER_FAILED',
        };
      }

      return {
        status: 'reconstructing_object',
        providerJobId,
      };
    } catch {
      return {
        status: 'reconstructing_object',
        providerJobId,
      };
    }
  }

  async fetchAssets(providerJobId: string): Promise<ARAssets> {
    const cached = this.assetCache.get(providerJobId);
    if (cached) return cached;

    const assetUrl = `${this.endpoint.replace(/\/$/, '')}/assets/${providerJobId}`;
    const glb = await this.downloadBuffer(assetUrl);
    return { glb };
  }

  private postJson<T>(urlStr: string, data: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = new URL(urlStr);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(data)),
        'User-Agent': 'Dishviz-AR-Core/1.0',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const req = client.request(
        url,
        {
          method: 'POST',
          headers,
          timeout: 120000,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve(JSON.parse(body) as T);
              } catch {
                reject(new Error(`Invalid JSON returned from GPU worker: ${body.slice(0, 100)}`));
              }
            } else {
              reject(new Error(`GPU worker error (${res.statusCode}): ${body.slice(0, 200)}`));
            }
          });
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Cloud GPU worker request timed out'));
      });

      req.write(data);
      req.end();
    });
  }

  private getJson<T>(urlStr: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = new URL(urlStr);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'User-Agent': 'Dishviz-AR-Core/1.0',
      };
      if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;

      client.get(url, { headers, timeout: 15000 }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body) as T);
          } catch {
            reject(new Error('Failed to parse JSON status'));
          }
        });
      }).on('error', reject);
    });
  }

  private downloadBuffer(urlStr: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const url = new URL(urlStr);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      client.get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(this.downloadBuffer(res.headers.location));
        }
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject);
    });
  }
}
