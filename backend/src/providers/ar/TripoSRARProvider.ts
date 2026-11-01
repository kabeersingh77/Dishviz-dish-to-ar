/**
 * TripoSRARProvider — Integration interface for self-hosted TripoSR deployments
 *
 * ─── What is TripoSR? ────────────────────────────────────────────────────────
 * TripoSR is an open-source image-to-3D reconstruction model released in
 * March 2024 as a joint project between Stability AI and Tripo AI.
 * It is published under the MIT licence at:
 *   https://github.com/VAST-AI-Research/TripoSR
 *   https://huggingface.co/stabilityai/TripoSR
 *
 * ─── Is there an official hosted TripoSR API? ───────────────────────────────
 * NO. As of October 2024, Stability AI does not provide a cloud-hosted REST
 * API endpoint for the TripoSR weights specifically. The model must be
 * self-hosted on your own GPU infrastructure.
 *
 * ─── How to self-host TripoSR and wire it here ──────────────────────────────
 * 1. Deploy TripoSR on a GPU server (e.g., NVIDIA A100/T4) using the official
 *    repository's run.py script or by wrapping it in a FastAPI service.
 *
 * 2. Expose a POST /generate endpoint from your server that:
 *    - Accepts a multipart form-data body with field "image" (JPEG or PNG)
 *    - Returns JSON: { "job_id": "...", "status": "queued" }
 *
 * 3. Expose a GET /status/{job_id} endpoint that returns:
 *    { "job_id": "...", "status": "queued"|"running"|"success"|"failed",
 *      "model_url": "http://..." }   // model_url set when status=success
 *
 * 4. Set environment variables:
 *    TRIPOSR_ENDPOINT=http://your-gpu-server:8000
 *    TRIPOSR_API_KEY=your-shared-secret-if-any  (optional)
 *
 * 5. Set AR_PROVIDER=triposr in backend/.env
 *
 * ─── Limitation: single-image input ─────────────────────────────────────────
 * The standard TripoSR model is trained for single-image reconstruction.
 * It does not natively perform multi-view reconstruction from multiple photos.
 * When AR_PROVIDER=triposr, only the first uploaded image is submitted.
 * You can extend this class to pre-process multiple images into a composite
 * view before submitting, but that is not handled here.
 *
 * ─── Alternative: Tripo3D commercial API ─────────────────────────────────────
 * If you want a fully-managed hosted API without self-hosting, consider
 * Tripo AI's commercial platform at https://platform.tripo3d.ai
 * and set AR_PROVIDER=tripo3d with AR_PROVIDER_API_KEY=<your key>.
 * That provider is already implemented in Tripo3DARProvider.ts.
 */

import https from 'https';
import http from 'http';
import type {
  ARGenerationProvider,
  ARAssets,
  ARJobStatus,
  JobMetadata,
  JobStateUpdate,
} from './ARGenerationProvider';

interface TripoSRStatusResponse {
  job_id?: string;
  status?: string;
  model_url?: string;
  error?: string;
}

interface TripoSRCreateResponse {
  job_id?: string;
  status?: string;
  error?: string;
}

export class TripoSRARProvider implements ARGenerationProvider {
  readonly providerId = 'triposr';
  private readonly endpoint: string;
  private readonly apiKey: string;

  constructor(endpoint: string, apiKey: string = '') {
    // Strip trailing slash
    this.endpoint = endpoint.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  isConfigured(): boolean {
    return Boolean(this.endpoint && this.endpoint.trim().length > 0);
  }

  async createJob(
    segmentedImages: Buffer[],
    _metadata: JobMetadata
  ): Promise<{ providerJobId: string }> {
    if (!this.isConfigured()) {
      throw new Error(
        'TripoSR endpoint is not configured. ' +
        'Set TRIPOSR_ENDPOINT to your self-hosted TripoSR server URL in backend/.env. ' +
        'See TripoSRARProvider.ts for self-hosting instructions.'
      );
    }

    const primaryImage = segmentedImages[0];
    if (!primaryImage) {
      throw new Error('No input images provided.');
    }

    // NOTE: TripoSR is a single-image model. Only the first image is submitted.
    // If multiple images were uploaded, only the primary view is used.
    if (segmentedImages.length > 1) {
      console.warn(
        `[TripoSRARProvider] ${segmentedImages.length} images provided but TripoSR ` +
        'accepts only one input image. Submitting the first image only.'
      );
    }

    const boundary = `----TripoSRUpload${Date.now()}`;
    const header = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="image"; filename="input.jpg"\r\n` +
      `Content-Type: image/jpeg\r\n\r\n`
    );
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([header, primaryImage, footer]);

    const response = await this.request<TripoSRCreateResponse>(
      '/generate',
      'POST',
      body,
      `multipart/form-data; boundary=${boundary}`
    );

    if (!response.job_id) {
      throw new Error(
        `TripoSR server did not return a job_id. Response: ${JSON.stringify(response)}`
      );
    }

    return { providerJobId: response.job_id };
  }

  async getJobStatus(providerJobId: string): Promise<JobStateUpdate> {
    const response = await this.request<TripoSRStatusResponse>(
      `/status/${providerJobId}`,
      'GET'
    );

    return {
      providerJobId,
      status: this.mapStatus(response.status),
      progressMessage: this.progressMessage(response.status),
      ...(response.status === 'failed' && {
        errorCode: 'TRIPOSR_FAILED',
        errorMessage:
          response.error ??
          'TripoSR reconstruction failed. Check your server logs for details.',
      }),
    };
  }

  async fetchAssets(providerJobId: string): Promise<ARAssets> {
    const response = await this.request<TripoSRStatusResponse>(
      `/status/${providerJobId}`,
      'GET'
    );

    if (!response.model_url) {
      throw new Error(
        'TripoSR completed but returned no model URL. ' +
        'Ensure your server sets model_url in the status response when status=success.'
      );
    }

    const glb = await this.downloadFile(response.model_url);
    return { glb };
  }

  private mapStatus(status: string | undefined): ARJobStatus {
    switch (status) {
      case 'queued':
        return 'analyzing_views';
      case 'running':
      case 'processing':
        return 'reconstructing_object';
      case 'success':
        return 'ready';
      case 'failed':
        return 'failed';
      default:
        return 'generating_3d_model';
    }
  }

  private progressMessage(status: string | undefined): string {
    switch (status) {
      case 'queued':
        return 'Queued on TripoSR server';
      case 'running':
      case 'processing':
        return 'TripoSR reconstruction in progress';
      case 'success':
        return '3D model complete';
      case 'failed':
        return 'TripoSR reconstruction failed';
      default:
        return 'Generating 3D geometry';
    }
  }

  private request<T>(
    path: string,
    method: string,
    body?: Buffer,
    contentType?: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.endpoint + path);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      const headers: Record<string, string | number> = {};
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }
      if (body) {
        headers['Content-Type'] = contentType ?? 'application/json';
        headers['Content-Length'] = body.length;
      }

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers,
      };

      const req = lib.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          try {
            const str = Buffer.concat(chunks).toString('utf8');
            const parsed = JSON.parse(str) as T;
            resolve(parsed);
          } catch {
            reject(
              new Error(
                `Failed to parse TripoSR server response (HTTP ${res.statusCode}). ` +
                'Check that your server returns valid JSON.'
              )
            );
          }
        });
      });

      req.on('error', (err) =>
        reject(new Error(`TripoSR server connection error: ${err.message}`))
      );

      if (body) req.write(body);
      req.end();
    });
  }

  private downloadFile(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const lib = url.startsWith('https') ? https : http;
      lib.get(url, (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          resolve(this.downloadFile(res.headers.location));
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download GLB from TripoSR server (HTTP ${res.statusCode})`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    });
  }
}
