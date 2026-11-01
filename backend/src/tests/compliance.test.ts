import request from 'supertest';
import { app } from '../index';
import { prisma } from '../db/prisma';

/**
 * Compliance Tests — Phase 8
 *
 * Covers:
 *  - Cookie consent logging: POST /api/v1/compliance/consent
 *  - GDPR Right to Erasure / Data Deletion: DELETE /api/v1/auth/me
 */

const TEST_EMAIL = `gdpr_test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'correcthorse9';

let sessionCookie: string;
let userId: string;

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
});

describe('POST /api/v1/compliance/consent', () => {
  it('records consent preferences', async () => {
    const res = await request(app)
      .post('/api/v1/compliance/consent')
      .set('Cookie', sessionCookie)
      .send({
        consentType: 'cookie_preferences',
        granted: true,
        preferences: {
          essential: true,
          analytics: false,
          preferences: true,
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.recorded).toBe(true);

    const record = await prisma.consentRecord.findFirst({
      where: { userId },
      orderBy: { grantedAt: 'desc' },
    });
    expect(record).toBeDefined();
    expect(record?.consentType).toBe('cookie_preferences');
  });
});

describe('DELETE /api/v1/auth/me — GDPR Right to Erasure', () => {
  it('permanently deletes user account, clearing session', async () => {
    // Delete account
    const res = await request(app)
      .delete('/api/v1/auth/me')
      .set('Cookie', sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/permanently deleted/i);

    // Verify user is gone from DB
    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user).toBeNull();

    // Verify further requests for the deleted user fail
    const check = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', sessionCookie);
    expect([401, 404]).toContain(check.status);
  });
});

