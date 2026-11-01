import request from 'supertest';
import { app, server } from '../index';
import { prisma } from '../db/prisma';

const TEST_EMAIL_SUFFIX = '@auth-test.example.com';

describe('Auth API — Phase 1', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up test users only
    await prisma.user.deleteMany({
      where: { email: { endsWith: TEST_EMAIL_SUFFIX } },
    });
    await prisma.$disconnect();
    server?.close();
  });

  // ─── Registration ────────────────────────────────────────────────────────

  it('POST /register — creates user and returns trial info', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: `newuser${TEST_EMAIL_SUFFIX}`,
      password: 'securepassword123',
      name: 'Test User',
    });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(`newuser${TEST_EMAIL_SUFFIX}`);
    expect(res.body.user.passwordHash).toBeUndefined(); // Never expose hash
    expect(res.body.trial.generationsTotal).toBe(5);
    expect(res.body.trial.generationsRemaining).toBe(5);
    expect(res.headers['set-cookie']).toBeDefined(); // httpOnly cookie set
  });

  it('POST /register — rejects short password', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: `short${TEST_EMAIL_SUFFIX}`,
      password: '123',
    });
    expect(res.status).toBe(400);
  });

  it('POST /register — rejects invalid email', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'not-an-email',
      password: 'validpassword123',
    });
    expect(res.status).toBe(400);
  });

  it('POST /register — rejects duplicate email', async () => {
    const email = `dup${TEST_EMAIL_SUFFIX}`;
    await request(app).post('/api/v1/auth/register').send({ email, password: 'pass1234' });
    const res = await request(app).post('/api/v1/auth/register').send({ email, password: 'pass1234' });
    expect(res.status).toBe(409);
  });

  // ─── Login ───────────────────────────────────────────────────────────────

  it('POST /login — returns session cookie for valid credentials', async () => {
    const email = `logintest${TEST_EMAIL_SUFFIX}`;
    await request(app).post('/api/v1/auth/register').send({ email, password: 'correct123' });

    const res = await request(app).post('/api/v1/auth/login').send({
      email,
      password: 'correct123',
    });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('POST /login — rejects wrong password with 401', async () => {
    const email = `wrongpass${TEST_EMAIL_SUFFIX}`;
    await request(app).post('/api/v1/auth/register').send({ email, password: 'correct123' });

    const res = await request(app).post('/api/v1/auth/login').send({
      email,
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
    // Error message must not reveal whether the email exists
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('POST /login — rejects non-existent email with same 401', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: `nonexistent${TEST_EMAIL_SUFFIX}`,
      password: 'somepassword',
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  // ─── /me ─────────────────────────────────────────────────────────────────

  it('GET /me — returns full user info when authenticated', async () => {
    const email = `metest${TEST_EMAIL_SUFFIX}`;
    const agent = request.agent(app);

    await agent.post('/api/v1/auth/register').send({
      email,
      password: 'secure123',
      name: 'Me Test',
    });

    const res = await agent.get('/api/v1/auth/me');

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
    expect(res.body.trial.generationsTotal).toBe(5);
    expect(res.body.trial.generationsRemaining).toBe(5);
    expect(res.body.trial.generationsUsed).toBe(0);
  });

  it('GET /me — returns 401 without auth token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  // ─── Logout ──────────────────────────────────────────────────────────────

  it('POST /logout — clears session cookie', async () => {
    const email = `logouttest${TEST_EMAIL_SUFFIX}`;
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send({ email, password: 'pass1234' });

    const logoutRes = await agent.post('/api/v1/auth/logout');
    expect(logoutRes.status).toBe(200);

    const meRes = await agent.get('/api/v1/auth/me');
    expect(meRes.status).toBe(401);
  });
});
