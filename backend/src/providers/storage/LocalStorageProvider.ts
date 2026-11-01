import fs from 'fs';
import path from 'path';
import { type StorageProvider, type StoredFile } from './StorageProvider';
import { env } from '../../config/env';

/**
 * LocalStorageProvider
 *
 * Persists files to a local directory.
 * The Express server exposes this directory under /static/assets/
 * so stored URLs resolve to http://localhost:3001/static/assets/<key>.
 *
 * NOT suitable for multi-instance production deployments.
 * Use S3StorageProvider for production.
 */
export class LocalStorageProvider implements StorageProvider {
  readonly providerId = 'local';

  private readonly baseDir: string;
  private readonly baseUrl: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), env.storageLocalPath);
    this.baseUrl = `${env.appBaseUrl}/static/assets`;
    this.ensureDir();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async save(buffer: Buffer, key: string, mimeType: string): Promise<StoredFile> {
    // Sanitise key — prevent directory traversal
    const safeKey = key.replace(/[^a-zA-Z0-9._\-/]/g, '_');
    const fullPath = path.join(this.baseDir, safeKey);

    // Ensure subdirectory exists
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await fs.promises.writeFile(fullPath, buffer);

    return {
      storageKey: safeKey,
      mimeType,
      sizeBytes: buffer.length,
    };
  }

  async getUrl(storageKey: string, _ttlSeconds?: number): Promise<string> {
    // Local storage returns a permanent URL — no signed URL concept
    const safeKey = storageKey.replace(/[^a-zA-Z0-9._\-/]/g, '_');
    return `${this.baseUrl}/${safeKey}`;
  }

  async delete(storageKey: string): Promise<void> {
    const safeKey = storageKey.replace(/[^a-zA-Z0-9._\-/]/g, '_');
    const fullPath = path.join(this.baseDir, safeKey);
    try {
      await fs.promises.unlink(fullPath);
    } catch (err) {
      // ENOENT is fine — file already gone
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }
}
