import request from 'supertest';
import { app } from '../index';
import { prisma } from '../db/prisma';
import { env } from '../config/env';

/**
 * Assets & Visibility Tests — Phase 10
 *
 * Covers:
 *  - Internal first-party secret authentication (Universal Digital Menu backend)
 *  - Persistent asset retrieval (viewing existing asset — no reconstruction)
 *  - Visibility enforcement: private vs public/unlisted
 *  - Direct 3D model streaming endpoint
 */

const TEST_EMAIL = `assets_test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'correcthorse9';

let sessionCookie: string;
let userId: string;
let testJobId: string;
let testAssetId: string;

beforeAll(async () => {
  const reg = await request(app)
    .post('/api/v1/auth/register')
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
  userId = (reg.body as { user?: { id?: string } }).user?.id ?? '';

  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
  const rawCookies = login.headers['set-cookie'];
  sessionCookie = Array.isArray(rawCookies)
    ? (rawCookies[0] ?? '')
    : ((rawCookies as unknown as string) ?? '');

  // Create a mock completed ARJob with an output GLB asset
  const job = await prisma.aRJob.create({
    data: {
      userId,
      status: 'ready',
      visibility: 'private',
      outputAssets: {
        create: {
          type: 'glb',
          storageKey: 'mock/model.glb',
          mimeType: 'model/gltf-binary',
          sizeBytes: 1024,
          visibility: 'private',
        },
      },
    },
    include: { outputAssets: true },
  });

  testJobId = job.id;
  testAssetId = job.outputAssets[0].id;
});

afterAll(async () => {
  await prisma.asset.deleteMany({ where: { outputJobId: testJobId } });
  await prisma.aRJob.deleteMany({ where: { id: testJobId } });
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  await prisma.$disconnect();
});

describe('GET /api/v1/ar/assets/:assetId — Ownership & Visibility', () => {
  it('allows owner to retrieve private asset', async () => {
    const res = await request(app)
      .get(`/api/v1/ar/assets/${testAssetId}`)
      .set('Cookie', sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body.assetId).toBe(testAssetId);
    expect(res.body.isOwner).toBe(true);
    expect(res.body.visibility).toBe('private');
  });

  it('rejects unauthenticated request for private asset', async () => {
    const res = await request(app).get(`/api/v1/ar/assets/${testAssetId}`);
    expect(res.status).toBe(403);
  });

  it('allows access to unlisted/public asset without authentication', async () => {
    // Update asset to unlisted
    await prisma.asset.update({
      where: { id: testAssetId },
      data: { visibility: 'unlisted' },
    });

    const res = await request(app).get(`/api/v1/ar/assets/${testAssetId}`);
    expect(res.status).toBe(200);
    expect(res.body.assetId).toBe(testAssetId);

    // Reset back to private
    await prisma.asset.update({
      where: { id: testAssetId },
      data: { visibility: 'private' },
    });
  });
});

describe('Internal First-Party Secret Auth (Universal Digital Menu)', () => {
  it('allows internal client to access any private asset using INTERNAL_AR_SERVICE_SECRET', async () => {
    const res = await request(app)
      .get(`/api/v1/ar/assets/${testAssetId}`)
      .set('Authorization', `Bearer ${env.internalArServiceSecret}`);

    expect(res.status).toBe(200);
    expect(res.body.assetId).toBe(testAssetId);
  });
});

describe('PATCH /api/v1/ar/jobs/:jobId/visibility', () => {
  it('allows owner to update job visibility', async () => {
    const res = await request(app)
      .patch(`/api/v1/ar/jobs/${testJobId}/visibility`)
      .set('Cookie', sessionCookie)
      .send({ visibility: 'public' });

    expect(res.status).toBe(200);
    expect(res.body.visibility).toBe('public');

    // Confirm DB updated
    const updated = await prisma.aRJob.findUnique({ where: { id: testJobId } });
    expect(updated?.visibility).toBe('public');
  });

  it('rejects invalid visibility value', async () => {
    const res = await request(app)
      .patch(`/api/v1/ar/jobs/${testJobId}/visibility`)
      .set('Cookie', sessionCookie)
      .send({ visibility: 'invalid_mode' });

    expect(res.status).toBe(400);
  });
});
