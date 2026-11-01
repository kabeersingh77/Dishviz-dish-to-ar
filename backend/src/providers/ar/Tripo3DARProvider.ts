/**
 * Tripo3DARProvider — Tripo V3 OpenAPI Integration
 *
 * Implements the official Tripo3D V3 API workflow:
 *   1. Upload image to POST https://openapi.tripo3d.ai/v3/files -> returns file_token
 *   2. Create task: POST https://openapi.tripo3d.ai/v3/generation/image-to-model
 *   3. Poll task:   GET  https://openapi.tripo3d.ai/v3/tasks/{task_id}
 *   4. Download 3D GLB model from output.model_url
 */
import https from 'https';
import type {
  ARGenerationProvider,
  ARAssets,
  ARJobStatus,
  JobMetadata,
  JobStateUpdate,
} from './ARGenerationProvider';

interface Tripo3DTaskResponse {
  code: number;
  status: string;
  data?: {
    task_id?: string;
    status?: string;
    progress?: number;
    output?: {
      model_url?: string;
      pbr_model?: string;
      rendered_image_url?: string;
    };
  };
  message?: string;
  suggestion?: string;
}

export class Tripo3DARProvider implements ARGenerationProvider {
  readonly providerId = 'tripo3d';
  private readonly hostname = 'openapi.tripo3d.ai';

  constructor(private readonly apiKey: string) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async createJob(
    segmentedImages: Buffer[],
    _metadata: JobMetadata
  ): Promise<{ providerJobId: string }> {
    if (!this.isConfigured()) {
      throw new Error(
        'Tripo3D API key is not configured. Add AR_PROVIDER_API_KEY to your backend/.env file.'
      );
    }

    const primaryImage = segmentedImages[0];
    if (!primaryImage) {
      throw new Error('No input images provided for 3D reconstruction.');
    }

    // Step 1: Upload image to get file_token
    const fileToken = await this.uploadImage(primaryImage);

    // Step 2: Create image-to-3D generation task (Tripo V3 API)
    const taskPayload = JSON.stringify({
      type: 'image_to_model',
      file: {
        type: 'jpg',
        file_token: fileToken,
      },
      model: 'v2.5-20250123',
    });

    const response = await this.rawRequest<Tripo3DTaskResponse>(
      '/v3/generation/image-to-model',
      'POST',
      Buffer.from(taskPayload, 'utf8'),
      'application/json'
    );

    if (response.code !== 0 || !response.data?.task_id) {
      const errDetail = response.message || response.suggestion || 'Task creation failed';
      if (response.code === 2010 || errDetail.toLowerCase().includes('credit')) {
        throw new Error(
          'Tripo3D error: Your Tripo3D account does not have enough API credits. ' +
          'Please claim free API credits or add credits on platform.tripo3d.ai.'
        );
      }
      throw new Error(`Tripo3D error (${response.code}): ${errDetail}`);
    }

    return { providerJobId: response.data.task_id };
  }

  async getJobStatus(providerJobId: string): Promise<JobStateUpdate> {
    const response = await this.rawRequest<Tripo3DTaskResponse>(
      `/v3/tasks/${providerJobId}`,
      'GET'
    );

    const taskStatus = response.data?.status;

    return {
      providerJobId,
      status: this.mapStatus(taskStatus),
      progressMessage: this.progressMessage(taskStatus),
      ...(taskStatus === 'failed' && {
        errorCode: 'PROVIDER_FAILED',
        errorMessage:
          response.message ||
          'Tripo3D reported that reconstruction failed. Please ensure the subject is well-lit and clearly photographed.',
      }),
    };
  }

  async fetchAssets(providerJobId: string): Promise<ARAssets> {
    const response = await this.rawRequest<Tripo3DTaskResponse>(
      `/v3/tasks/${providerJobId}`,
      'GET'
    );

    const modelUrl =
      response.data?.output?.model_url ||
      response.data?.output?.pbr_model;

    if (!modelUrl) {
      throw new Error('Tripo3D completed but returned no model URL.');
    }

    const glb = await this.downloadFile(modelUrl);
    return { glb };
  }

  private async uploadImage(imageBuffer: Buffer): Promise<string> {
    const boundary = `----TripoUploadBoundary${Date.now()}`;
    const header = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="input.jpg"\r\n` +
      `Content-Type: image/jpeg\r\n\r\n`
    );
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([header, imageBuffer, footer]);

    const res = await this.rawRequest<{
      code: number;
      data?: { file_token?: string };
      message?: string;
    }>(
      '/v3/files',
      'POST',
      body,
      `multipart/form-data; boundary=${boundary}`
    );

    const token = res.data?.file_token;
    if (!token) {
      throw new Error(
        `Tripo3D upload failed (${res.code}): ${res.message || 'Could not obtain file_token from Tripo storage.'}`
      );
    }

    return token;
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
        return 'Queued in Tripo3D cloud cluster';
      case 'running':
      case 'processing':
        return 'Tripo3D neural reconstruction in progress';
      case 'success':
        return '3D model complete';
      case 'failed':
        return 'Tripo3D reconstruction failed';
      default:
        return 'Generating 3D geometry & PBR texture';
    }
  }

  private rawRequest<T>(
    path: string,
    method: string,
    body?: Buffer,
    contentType?: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.hostname,
        path,
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...(body && { 'Content-Type': contentType ?? 'application/json' }),
          ...(body && { 'Content-Length': body.length }),
        },
      };

      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          try {
            const str = Buffer.concat(chunks).toString('utf8');
            const parsed = JSON.parse(str) as T;
            resolve(parsed);
          } catch {
            reject(
              new Error(`Failed to parse Tripo response (HTTP ${res.statusCode})`)
            );
          }
        });
      });

      req.on('error', (err) =>
        reject(new Error(`Tripo3D network error: ${err.message}`))
      );

      if (body) req.write(body);
      req.end();
    });
  }

  private downloadFile(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          resolve(this.downloadFile(res.headers.location));
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download GLB model (HTTP ${res.statusCode})`));
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
