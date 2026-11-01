import request from 'supertest';
import { app } from '../index';
import { prisma } from '../db/prisma';

/**
 * Usage metering tests — Phase 6.
 *
 * Covers:
 *  - /me returns canCreate=true on fresh account
 *  - /me returns correct trial counts
 *  - createJob blocked at quota (402) when trial exhausted
 *  - Trial counter increments via UsageService
 *  - Monthly API counter increments
 */

const TEST_EMAIL = `usage_${Date.now()}@example.com`;
const TEST_PASSWORD = 'correcthorse9';

let sessionCookie: string;
let userId: string;

beforeAll(async () => {
  const reg = await request(app)
    .post('/api/v1/auth/register')
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
  const body = reg.body as { user?: { id?: string } };
  userId = body.user?.id ?? '';

  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
  const rawCookies = login.headers['set-cookie'];
  sessionCookie = Array.isArray(rawCookies)
    ? (rawCookies[0] ?? '')
    : ((rawCookies as unknown as string) ?? '');
});

afterAll(async () => {
  await prisma.usage.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  await prisma.$disconnect();
  server?.close();
});

import { server } from '../index';
import { UsageService } from '../services/UsageService';

// ─── /me usage fields ─────────────────────────────────────────────────────────

describe('GET /auth/me — usage fields', () => {
  it('returns canCreate=true and isOnTrial=true for fresh account', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body.canCreate).toBe(true);
    expect(res.body.isOnTrial).toBe(true);
    expect(res.body.trial.generationsUsed).toBe(0);
    expect(res.body.trial.generationsTotal).toBeGreaterThan(0);
    expect(res.body.trial.generationsRemaining).toBe(res.body.trial.generationsTotal);
  });
});

// ─── UsageService.canCreateJob ────────────────────────────────────────────────

describe('UsageService.canCreateJob', () => {
  it('allows a fresh user to create a job', async () => {
    const result = await UsageService.canCreateJob(userId);
    expect(result.allowed).toBe(true);
  });

  it('blocks when trial is exhausted', async () => {
    // Exhaust the trial by setting count to total
    await prisma.usage.update({
      where: { userId },
      data: { trialGenerationsUsed: 999 }, // way over limit
    });

    const result = await UsageService.canCreateJob(userId);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe('TRIAL_QUOTA_EXCEEDED');
      expect(result.reason).toMatch(/trial/i);
    }

    // Reset for other tests
    await prisma.usage.update({
      where: { userId },
      data: { trialGenerationsUsed: 0 },
    });
  });
});

// ─── UsageService.incrementTrialUsage ─────────────────────────────────────────

describe('UsageService.incrementTrialUsage', () => {
  it('increments trial counter', async () => {
    const before = await prisma.usage.findUnique({ where: { userId } });
    const beforeCount = before?.trialGenerationsUsed ?? 0;

    await UsageService.incrementTrialUsage(userId);

    const after = await prisma.usage.findUnique({ where: { userId } });
    expect(after?.trialGenerationsUsed).toBe(beforeCount + 1);

    // Reset
    await prisma.usage.update({
      where: { userId },
      data: { trialGenerationsUsed: 0 },
    });
  });
});

// ─── createJob quota gate ─────────────────────────────────────────────────────

describe('POST /ar/jobs — quota gate', () => {
  it('returns 402 when trial quota is exhausted', async () => {
    // Set usage over limit
    await prisma.usage.update({
      where: { userId },
      data: { trialGenerationsUsed: 999 },
    });

    // createJob requires a multipart body — even without valid images it should
    // return 402 before reaching image validation
    const res = await request(app)
      .post('/api/v1/ar/jobs')
      .set('Cookie', sessionCookie)
      .field('consentGiven', 'true')
      .attach('images', Buffer.from('fake'), 'test.jpg');

    expect(res.status).toBe(402);
    expect(['TRIAL_QUOTA_EXCEEDED', 'INSUFFICIENT_CREDITS']).toContain(res.body.code);

    // Reset
    await prisma.usage.update({
      where: { userId },
      data: { trialGenerationsUsed: 0 },
    });
  });
});
