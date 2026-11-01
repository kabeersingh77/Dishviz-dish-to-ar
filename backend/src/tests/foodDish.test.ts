import request from 'supertest';
import { app, server } from '../index';
import { prisma } from '../db/prisma';

const TEST_EMAIL_SUFFIX = '@food-test.example.com';

describe('Food Dish Metadata and Pipeline Integration', () => {
  let userToken: string;
  let userId: string;
  let sampleImage: Buffer;

  beforeAll(async () => {
    await prisma.$connect();

    sampleImage = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
      0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
      0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
      0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
      0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
      0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
      0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
      0x00, 0xbf, 0x80, 0xff, 0xd9,
    ]);

    const regRes = await request(app).post('/api/v1/auth/register').send({
      email: `foodchef${TEST_EMAIL_SUFFIX}`,
      password: 'password123',
      name: 'Chef Mario',
    });

    userId = regRes.body.user.id;
    const cookie = regRes.headers['set-cookie'];
    userToken = cookie ? cookie[0] : '';
  });

  afterAll(async () => {
    await prisma.aRJob.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.user.deleteMany({
      where: { email: { endsWith: TEST_EMAIL_SUFFIX } },
    }).catch(() => {});
    await prisma.$disconnect();
    server?.close();
  });

  it('POST /api/v1/ar/jobs — creates a job with full food metadata', async () => {
    const res = await request(app)
      .post('/api/v1/ar/jobs')
      .set('Cookie', userToken)
      .attach('images', sampleImage, 'dish1.jpg')
      .field('itemName', 'Cacio e Pepe')
      .field('itemDescription', 'Traditional Roman pasta with pecorino and crushed black pepper.')
      .field('itemTasteProfile', 'Savory, sharp, peppery finish')
      .field('itemCategory', 'veg')
      .field('itemPrice', '18.50')
      .field('consentGiven', 'true');

    expect(res.status).toBe(201);
    expect(res.body.jobId).toBeDefined();

    const jobId = res.body.jobId;

    // Verify GET /api/v1/ar/jobs/:jobId returns food metadata
    const getRes = await request(app)
      .get(`/api/v1/ar/jobs/${jobId}`)
      .set('Cookie', userToken);

    expect(getRes.status).toBe(200);
    expect(getRes.body.itemName).toBe('Cacio e Pepe');
    expect(getRes.body.itemCategory).toBe('veg');
    expect(getRes.body.itemPrice).toBe(18.50);
    expect(getRes.body.itemTasteProfile).toBe('Savory, sharp, peppery finish');
  });
});
