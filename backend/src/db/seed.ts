/**
 * Development seed script — LOCAL ONLY.
 * Creates a predictable dev user and initial state.
 * NEVER runs in production (guarded by NODE_ENV check).
 */
import 'dotenv/config';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: Seed script must not run in production.');
    process.exit(1);
  }

  console.log('Seeding development database...');

  const hash = await bcrypt.hash('dev-password-123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'dev@example.com' },
    update: {},
    create: {
      email: 'dev@example.com',
      passwordHash: hash,
      name: 'Dev User',
      usage: {
        create: {
          trialGenerationsUsed: 0,
          apiRequestsThisMonth: 0,
          apiRequestsResetAt: new Date(),
        },
      },
    },
  });

  console.log(`[DEV] Seeded user: ${user.email} (id: ${user.id})`);
  console.log('[DEV] Password: dev-password-123');
  console.log('[DEV] This data is for local development only and must not appear in production.');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
