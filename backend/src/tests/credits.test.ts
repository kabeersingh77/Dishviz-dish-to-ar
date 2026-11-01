import request from 'supertest';
import { app, server } from '../index';
import { prisma } from '../db/prisma';
import { CreditService } from '../services/CreditService';
import { BUSINESS } from '../config/business';

const TEST_EMAIL_SUFFIX = '@credit-test.example.com';

describe('Credit Billing & Failure Refund Guarantee', () => {
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    await prisma.$connect();

    // Register a test user
    const regRes = await request(app).post('/api/v1/auth/register').send({
      email: `credittest${TEST_EMAIL_SUFFIX}`,
      password: 'password123',
      name: 'Credit Test User',
    });

    userId = regRes.body.user.id;
    const cookie = regRes.headers['set-cookie'];
    userToken = cookie ? cookie[0] : '';
  });

  afterAll(async () => {
    await prisma.creditLedger.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.user.deleteMany({
      where: { email: { endsWith: TEST_EMAIL_SUFFIX } },
    }).catch(() => {});
    await prisma.$disconnect();
    server?.close();
  });

  it('GET /api/v1/credits/balance — returns current credit balance and cost specifications', async () => {
    const res = await request(app)
      .get('/api/v1/credits/balance')
      .set('Cookie', userToken);

    expect(res.status).toBe(200);
    expect(res.body.balance).toBeDefined();
    expect(res.body.costPerGeneration).toBe(1.50);
    expect(Array.isArray(res.body.tiers)).toBe(true);
  });

  it('POST /api/v1/credits/topup — purchases a tier pack and increases balance', async () => {
    const res = await request(app)
      .post('/api/v1/credits/topup')
      .set('Cookie', userToken)
      .send({ tier: 'tier_100' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.amountAdded).toBe(100);
    expect(res.body.newBalance).toBeGreaterThanOrEqual(100);

    const balance = await CreditService.getBalance(userId);
    expect(balance).toBeGreaterThanOrEqual(100);
  });

  it('CreditService.deductForJob and CreditService.refundForJob — guarantees clean automatic refund', async () => {
    const initialBalance = await CreditService.getBalance(userId);
    const dummyJobId = `test_job_${Date.now()}`;

    // Deduct $1.50 for job creation
    const deductRes = await CreditService.deductForJob(userId, dummyJobId, 1.50);
    expect(deductRes.success).toBe(true);
    expect(deductRes.newBalance).toBe(initialBalance - 1.50);

    // Automatic refund when job fails
    const refundRes = await CreditService.refundForJob(
      userId,
      dummyJobId,
      1.50,
      'Test simulated pipeline failure'
    );
    expect(refundRes.success).toBe(true);
    expect(refundRes.newBalance).toBe(initialBalance);

    // Check ledger
    const history = await CreditService.getLedgerHistory(userId, 5);
    const refundEntry = history.find((h) => h.jobId === dummyJobId && h.type === 'job_refund');
    expect(refundEntry).toBeDefined();
    expect(refundEntry?.amount).toBe(1.50);
  });
});
