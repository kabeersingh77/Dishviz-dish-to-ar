/**
 * StorageProvider — abstract interface for persisting AR assets.
 *
 * All assets (input images, segmented images, output GLB/USDZ) go through
 * this interface. The rest of the pipeline never uses the filesystem directly.
 *
 * Implementations:
 *  - LocalStorageProvider  — dev / single-server
 *  - S3StorageProvider     — production (S3/R2/GCS)
 */

export interface StoredFile {
  /** Opaque storage key — pass back to getSignedUrl / delete */
  storageKey: string;
  /** MIME type of the stored content */
  mimeType: string;
  /** Size in bytes */
  sizeBytes: number;
}

export interface StorageProvider {
  readonly providerId: string;

  /**
   * Persist a buffer to storage.
   * @param buffer   Raw file data
   * @param key      Suggested storage key/path (provider may normalise)
   * @param mimeType MIME type, e.g. 'model/gltf-binary'
   * @returns        Final storage key used
   */
  save(buffer: Buffer, key: string, mimeType: string): Promise<StoredFile>;

  /**
   * Return a URL from which the file can be downloaded.
   * For local storage this is a static server path.
   * For S3 this should be a short-lived pre-signed URL.
   *
   * @param storageKey  Key returned by save()
   * @param ttlSeconds  How long the URL should be valid (provider may round up)
   */
  getUrl(storageKey: string, ttlSeconds?: number): Promise<string>;

  /**
   * Permanently delete a stored file.
   * Safe to call even if the key does not exist.
   */
  delete(storageKey: string): Promise<void>;
}
