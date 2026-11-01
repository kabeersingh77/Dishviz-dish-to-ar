import { type StorageProvider } from './StorageProvider';
import { LocalStorageProvider } from './LocalStorageProvider';
import { env } from '../../config/env';

let _instance: StorageProvider | null = null;

/**
 * Factory that returns the configured StorageProvider singleton.
 * Currently only local is implemented. S3/R2 support is Phase 10.
 */
export function createStorageProvider(): StorageProvider {
  if (_instance) return _instance;

  const providerType = env.storageProvider ?? 'local';

  switch (providerType) {
    case 'local':
      _instance = new LocalStorageProvider();
      break;

    default:
      console.warn(
        `[StorageProvider] Unknown STORAGE_PROVIDER="${providerType}". Falling back to local.`
      );
      _instance = new LocalStorageProvider();
  }

  return _instance;
}
