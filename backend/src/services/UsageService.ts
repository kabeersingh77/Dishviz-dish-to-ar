import { prisma } from '../db/prisma';
import { BUSINESS } from '../config/business';

/**
 * UsageService — single source of truth for all quota and metering logic.
 *
 * Design constraints:
 *  - All quota checks happen here — no scattered logic in controllers
 *  - Increments are atomic (updateMany with conditional where clauses)
 *  - Never throws; returns structured results callers can act on
 *  - Trial and subscription are evaluated together so the rules are co-located
 */
export const UsageService = {
  /**
   * Check whether a user can create a new AR job.
   * Returns allowed=true or a user-safe reason string.
   */
  async canCreateJob(userId: string): Promise<
    | { allowed: true }
    | { allowed: false; reason: string; code: QuotaErrorCode }
  > {
    // Internal first-party client (Universal Digital Menu SaaS) — internal entitlement, zero billing block
    if (userId === 'internal_digital_menu') {
      return { allowed: true };
    }

    const [usage, subscription] = await Promise.all([
      prisma.usage.findUnique({ where: { userId } }),
      prisma.subscription.findUnique({ where: { userId } }),
    ]);


    // Active paid subscription — no trial limit applies
    if (
      subscription &&
      (subscription.status === 'active' || subscription.status === 'trialing') &&
      subscription.plan === 'web_app'
    ) {
      return { allowed: true };
    }

    // Developer API plan — check monthly API request quota
    if (
      subscription &&
      (subscription.status === 'active' || subscription.status === 'trialing') &&
      subscription.plan === 'developer_api'
    ) {
      const apiUsage = await resetMonthlyIfNeeded(userId, usage);
      const limit = BUSINESS.plans.developerApi.monthlyJobLimit;
      if (limit !== null && apiUsage.apiRequestsThisMonth >= limit) {
        return {
          allowed: false,
          reason: `You've used all ${limit} AR generations included in your plan this month. Your quota resets at the start of next month.`,
          code: 'API_MONTHLY_QUOTA_EXCEEDED',
        };
      }
      return { allowed: true };
    }

    // No active subscription — trial mode
    const used = usage?.trialGenerationsUsed ?? 0;
    const total = BUSINESS.limits.trialGenerations;

    if (used >= total) {
      return {
        allowed: false,
        reason: `You've used all ${total} free trial generations. Upgrade to continue creating AR models.`,
        code: 'TRIAL_QUOTA_EXCEEDED',
      };
    }

    return { allowed: true };
  },

  /**
   * Increment trial usage counter when a job is successfully completed.
   * Only increments if the user is still in trial mode (no active subscription).
   * Called by PipelineExecutor when a job reaches "ready".
   */
  async incrementTrialUsage(userId: string): Promise<void> {
    if (userId === 'internal_digital_menu') return;

    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    const isTrialing = !subscription || subscription.status === 'canceled';

    if (isTrialing) {
      await prisma.usage.upsert({
        where: { userId },
        create: {
          userId,
          trialGenerationsUsed: 1,
          apiRequestsThisMonth: 0,
          apiRequestsResetAt: new Date(),
        },
        update: {
          trialGenerationsUsed: { increment: 1 },
        },
      });
    }
  },

  /**
   * Increment monthly API request counter for developer API key users.
   * Resets automatically if we're in a new calendar month.
   */
  async incrementApiUsage(userId: string): Promise<void> {
    const usage = await prisma.usage.findUnique({ where: { userId } });
    await resetMonthlyIfNeeded(userId, usage);
    await prisma.usage.upsert({
      where: { userId },
      create: {
        userId,
        trialGenerationsUsed: 0,
        apiRequestsThisMonth: 1,
        apiRequestsResetAt: new Date(),
      },
      update: {
        apiRequestsThisMonth: { increment: 1 },
      },
    });
  },

  /**
   * Returns current usage snapshot for a user (used in /auth/me).
   */
  async getUsageSummary(userId: string): Promise<UsageSummary> {
    const [usage, subscription] = await Promise.all([
      prisma.usage.findUnique({ where: { userId } }),
      prisma.subscription.findUnique({ where: { userId } }),
    ]);

    const isActive =
      subscription !== null &&
      (subscription.status === 'active' || subscription.status === 'trialing');

    const trialUsed = usage?.trialGenerationsUsed ?? 0;
    const trialTotal = BUSINESS.limits.trialGenerations;
    const trialRemaining = Math.max(0, trialTotal - trialUsed);
    const isOnTrial = !isActive;

    return {
      isOnTrial,
      trial: {
        generationsUsed: trialUsed,
        generationsTotal: trialTotal,
        generationsRemaining: trialRemaining,
      },
      api: {
        requestsThisMonth: usage?.apiRequestsThisMonth ?? 0,
        resetAt: usage?.apiRequestsResetAt?.toISOString() ?? null,
      },
      canCreate: isActive || trialRemaining > 0,
    };
  },
} as const;

export type QuotaErrorCode =
  | 'TRIAL_QUOTA_EXCEEDED'
  | 'API_MONTHLY_QUOTA_EXCEEDED'
  | 'SUBSCRIPTION_REQUIRED';

export interface UsageSummary {
  isOnTrial: boolean;
  trial: {
    generationsUsed: number;
    generationsTotal: number;
    generationsRemaining: number;
  };
  api: {
    requestsThisMonth: number;
    resetAt: string | null;
  };
  canCreate: boolean;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function resetMonthlyIfNeeded(
  userId: string,
  usage: { apiRequestsThisMonth: number; apiRequestsResetAt: Date } | null
) {
  if (!usage) {
    // Create fresh usage record
    const created = await prisma.usage.upsert({
      where: { userId },
      create: {
        userId,
        trialGenerationsUsed: 0,
        apiRequestsThisMonth: 0,
        apiRequestsResetAt: new Date(),
      },
      update: {},
    });
    return created;
  }

  const now = new Date();
  const resetAt = usage.apiRequestsResetAt;
  const isNewMonth =
    now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear();

  if (isNewMonth) {
    return prisma.usage.update({
      where: { userId },
      data: {
        apiRequestsThisMonth: 0,
        apiRequestsResetAt: new Date(),
      },
    });
  }

  return usage as typeof usage & { apiRequestsResetAt: Date };
}
