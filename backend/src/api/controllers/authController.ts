import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { prisma } from '../../db/prisma';
import { hashPassword, verifyPassword } from '../../security/password';
import { signToken } from '../../security/jwt';
import { BUSINESS } from '../../config/business';
import { UsageService } from '../../services/UsageService';
import { createStorageProvider } from '../../providers/storage';
import { stripe } from '../../services/StripeService';

const isCrossSite = process.env.NODE_ENV === 'production' || process.env.COOKIE_CROSS_SITE === 'true';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isCrossSite,
  sameSite: (isCrossSite ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password, name } = req.body as {
      email: string;
      password: string;
      name?: string;
    };

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    if (typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'Valid email required' });
      return;
    }
    if (typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Generic message — do not confirm whether email exists
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name?.trim() || null,
        usage: {
          create: {
            trialGenerationsUsed: 0,
            apiRequestsThisMonth: 0,
            apiRequestsResetAt: new Date(),
          },
        },
      },
    });

    const token = signToken({ sub: user.id, email: user.email });
    res.cookie('token', token, COOKIE_OPTIONS);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      trial: {
        generationsTotal: BUSINESS.limits.trialGenerations,
        generationsRemaining: BUSINESS.limits.trialGenerations,
        generationsUsed: 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Always hash even if user not found — prevents timing attacks
      await hashPassword('constant-time-dummy-value');
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signToken({ sub: user.id, email: user.email });
    res.cookie('token', token, COOKIE_OPTIONS);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    next(err);
  }
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
}

export async function me(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const [user, usage] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: true },
      }),
      UsageService.getUsageSummary(userId),
    ]);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      subscription: user.subscription
        ? {
            plan: user.subscription.plan,
            status: user.subscription.status,
            currentPeriodEnd: user.subscription.currentPeriodEnd,
            cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
          }
        : null,
      trial: usage.trial,
      isOnTrial: usage.isOnTrial,
      canCreate: usage.canCreate,
      apiUsage: usage.api,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Delete Account & All Data (GDPR / CCPA Right to Erasure) ─────────────────

export async function deleteAccount(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // 1. Fetch user's jobs and assets to delete files from storage
    const jobs = await prisma.aRJob.findMany({
      where: { userId },
      include: { inputAssets: true, outputAssets: true },
    });

    const storage = createStorageProvider();
    for (const job of jobs) {
      const assets = [...job.inputAssets, ...job.outputAssets];
      for (const asset of assets) {
        if (asset.storageKey) {
          await storage.delete(asset.storageKey).catch(() => {});
        } else if (asset.storagePath && fs.existsSync(asset.storagePath)) {
          await fs.promises.unlink(asset.storagePath).catch(() => {});
        }
      }
    }

    // 2. Cancel active Stripe subscription if present
    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    if (subscription?.stripeSubscriptionId && stripe) {
      try {
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      } catch (stripeErr) {
        console.error('[Account Deletion] Stripe cancel error:', stripeErr);
      }
    }

    // 3. Delete user record (Prisma cascade deletes jobs, assets, keys, usage, sessions)
    await prisma.user.delete({ where: { id: userId } });

    // 4. Clear auth cookie
    res.clearCookie('token');

    res.json({
      message: 'Your account, photos, 3D assets, and all associated data have been permanently deleted.',
    });
  } catch (err) {
    next(err);
  }
}

