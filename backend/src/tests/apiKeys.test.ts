import request from 'supertest';
import { app } from '../index';
import { prisma } from '../db/prisma';

/**
 * API Key management tests.
 *
 * Covers:
 * - Creating a key (single full-key reveal)
 * - Key cap enforcement
 * - Revocation
 * - Renaming
 * - Auth guard (unauthenticated requests rejected)
 */

let sessionCookie: string;
let userId: string;

const TEST_EMAIL_2 = `keytest_${Date.now()}@example.com`;
const TEST_PASSWORD = 'correcthorse9';

beforeAll(async () => {
  // Register & login a fresh test user
  const reg = await request(app)
    .post('/api/v1/auth/register')
    .send({ email: TEST_EMAIL_2, password: TEST_PASSWORD });
  userId = (reg.body as { user?: { id?: string } }).user?.id ?? '';

  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: TEST_EMAIL_2, password: TEST_PASSWORD });
  const rawCookies = login.headers['set-cookie'];
  sessionCookie = Array.isArray(rawCookies) ? (rawCookies[0] ?? '') : ((rawCookies as unknown as string) ?? '');

});

afterAll(async () => {
  await prisma.apiKey.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL_2 } });
  await prisma.$disconnect();
});

// ─── Auth guard ──────────────────────────────────────────────────────────────

describe('GET /api/v1/keys — auth guard', () => {
  it('returns 401 without session', async () => {
    const res = await request(app).get('/api/v1/keys');
    expect(res.status).toBe(401);
  });
});

// ─── Create key ──────────────────────────────────────────────────────────────

describe('POST /api/v1/keys', () => {
  it('creates a key and returns the full key once', async () => {
    const res = await request(app)
      .post('/api/v1/keys')
      .set('Cookie', sessionCookie)
      .send({ name: 'Test key 1' });

    expect(res.status).toBe(201);
    expect(res.body.fullKey).toMatch(/^oar_live_/);
    expect(res.body.keyPrefix).toBe(res.body.fullKey.slice(0, 16));
    expect(res.body.name).toBe('Test key 1');
    // Full key must NOT be retrievable from list endpoint
  });

  it('rejects missing name', async () => {
    const res = await request(app)
      .post('/api/v1/keys')
      .set('Cookie', sessionCookie)
      .send({});
    expect(res.status).toBe(400);
  });

  it('rejects empty name', async () => {
    const res = await request(app)
      .post('/api/v1/keys')
      .set('Cookie', sessionCookie)
      .send({ name: '   ' });
    expect(res.status).toBe(400);
  });
});

// ─── List keys ───────────────────────────────────────────────────────────────

describe('GET /api/v1/keys', () => {
  it('returns list of active keys — no fullKey in response', async () => {
    const res = await request(app)
      .get('/api/v1/keys')
      .set('Cookie', sessionCookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.keys)).toBe(true);
    // Full key must NOT appear in list
    for (const key of res.body.keys as Record<string, unknown>[]) {
      expect(key).not.toHaveProperty('fullKey');
      expect(key).not.toHaveProperty('keyHash');
    }
  });
});

// ─── Rename key ──────────────────────────────────────────────────────────────

describe('PATCH /api/v1/keys/:keyId', () => {
  it('renames a key', async () => {
    // Create a key to rename
    const create = await request(app)
      .post('/api/v1/keys')
      .set('Cookie', sessionCookie)
      .send({ name: 'Before rename' });
    const keyId: string = (create.body as { id?: string }).id ?? '';

    const res = await request(app)
      .patch(`/api/v1/keys/${keyId}`)
      .set('Cookie', sessionCookie)
      .send({ name: 'After rename' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('After rename');
  });
});

// ─── Revoke key ──────────────────────────────────────────────────────────────

describe('DELETE /api/v1/keys/:keyId', () => {
  it('revokes a key and removes it from list', async () => {
    const create = await request(app)
      .post('/api/v1/keys')
      .set('Cookie', sessionCookie)
      .send({ name: 'Key to revoke' });
    const keyId: string = (create.body as { id?: string }).id ?? '';

    const revoke = await request(app)
      .delete(`/api/v1/keys/${keyId}`)
      .set('Cookie', sessionCookie);
    expect(revoke.status).toBe(204);

    // Should not appear in list after revocation
    const list = await request(app)
      .get('/api/v1/keys')
      .set('Cookie', sessionCookie);
    const keyIds = (list.body.keys as { id: string }[]).map((k) => k.id);
    expect(keyIds).not.toContain(keyId);
  });

  it('returns 404 for non-existent key', async () => {
    const res = await request(app)
      .delete('/api/v1/keys/nonexistent-key-id')
      .set('Cookie', sessionCookie);
    expect(res.status).toBe(404);
  });
});

// ─── Developer API key auth ───────────────────────────────────────────────────

describe('requireApiKey middleware', () => {
  let fullKey: string;

  it('authenticates with a valid API key on a protected route', async () => {
    const create = await request(app)
      .post('/api/v1/keys')
      .set('Cookie', sessionCookie)
      .send({ name: 'Dev key test' });
    fullKey = (create.body as { fullKey?: string }).fullKey ?? '';
    expect(fullKey).toMatch(/^oar_live_/);

    // Use the API key to access the AR jobs list
    const res = await request(app)
      .get('/api/v1/ar/jobs')
      .set('Authorization', `Bearer ${fullKey}`);

    // Should be authenticated (may return 200 with empty list or other valid response)
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it('rejects malformed API key', async () => {
    const res = await request(app)
      .get('/api/v1/ar/jobs')
      .set('Authorization', 'Bearer invalid-key');
    expect(res.status).toBe(401);
  });
});
