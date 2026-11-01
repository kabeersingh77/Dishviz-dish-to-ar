import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export type ApiKeyEnvironment = 'live' | 'test';

export interface GeneratedApiKey {
  /** Full secret — show ONCE to the user at generation, then discard. Never store. */
  fullKey: string;
  /** First 16 chars for safe display in the dashboard, e.g. "oar_live_a1b2c3d" */
  prefix: string;
  /** SHA-256 hash — the only thing stored in the database */
  hash: string;
}

export function generateApiKey(environment: ApiKeyEnvironment = 'live'): GeneratedApiKey {
  const secret = uuidv4().replace(/-/g, '');
  const fullKey = `oar_${environment}_${secret}`;
  const prefix = fullKey.slice(0, 16);
  const hash = crypto.createHash('sha256').update(fullKey).digest('hex');
  return { fullKey, prefix, hash };
}

export function hashApiKey(fullKey: string): string {
  return crypto.createHash('sha256').update(fullKey).digest('hex');
}
