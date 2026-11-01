import { prisma } from '../db/prisma';
import { BUSINESS } from '../config/business';

export class CreditService {
  /**
   * Get user's current credit balance.
   */
  static async getBalance(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { creditBalance: true },
    });
    return user?.creditBalance ?? 0;
  }

  /**
   * Check if user has sufficient credits to create a 3D generation job.
   */
  static async canAffordJob(userId: string, cost: number = BUSINESS.credits.costPerGeneration): Promise<{ allowed: boolean; balance: number; cost: number }> {
    const balance = await this.getBalance(userId);
    return {
      allowed: balance >= cost,
      balance,
      cost,
    };
  }

  /**
   * Deduct credit for a new job with an atomic transaction and ledger entry.
   */
  static async deductForJob(
    userId: string,
    jobId: string,
    amount: number = BUSINESS.credits.costPerGeneration
  ): Promise<{ success: boolean; newBalance: number }> {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { creditBalance: true },
      });

      if (!user || user.creditBalance < amount) {
        throw new Error('Insufficient credit balance');
      }

      const newBalance = Math.round((user.creditBalance - amount) * 100) / 100;

      await tx.user.update({
        where: { id: userId },
        data: { creditBalance: newBalance },
      });

      await tx.creditLedger.create({
        data: {
          userId,
          amount: -amount,
          type: 'job_charge',
          jobId,
          description: `3D model generation for job ${jobId}`,
          balanceAfter: newBalance,
        },
      });

      return { success: true, newBalance };
    });
  }

  /**
   * Automatically refund credit if a job fails (clean failure guarantee).
   */
  static async refundForJob(
    userId: string,
    jobId: string,
    amount: number = BUSINESS.credits.costPerGeneration,
    reason: string = 'Pipeline processing failure'
  ): Promise<{ success: boolean; newBalance: number }> {
    return await prisma.$transaction(async (tx) => {
      // Check if already refunded to prevent double refunds
      const existingRefund = await tx.creditLedger.findFirst({
        where: { jobId, type: 'job_refund' },
      });

      if (existingRefund) {
        const user = await tx.user.findUnique({ where: { id: userId }, select: { creditBalance: true } });
        return { success: true, newBalance: user?.creditBalance ?? 0 };
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { creditBalance: true },
      });

      const currentBalance = user?.creditBalance ?? 0;
      const newBalance = Math.round((currentBalance + amount) * 100) / 100;

      await tx.user.update({
        where: { id: userId },
        data: { creditBalance: newBalance },
      });

      await tx.creditLedger.create({
        data: {
          userId,
          amount: amount,
          type: 'job_refund',
          jobId,
          description: `Automatic refund for failed job ${jobId}: ${reason}`,
          balanceAfter: newBalance,
        },
      });

      return { success: true, newBalance };
    });
  }

  /**
   * Add credits to user wallet from a Stripe top-up or admin adjustment.
   */
  static async addCredits(
    userId: string,
    amount: number,
    description: string,
    type: 'topup' | 'adjustment' = 'topup'
  ): Promise<{ newBalance: number }> {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { creditBalance: true },
      });

      const currentBalance = user?.creditBalance ?? 0;
      const newBalance = Math.round((currentBalance + amount) * 100) / 100;

      await tx.user.update({
        where: { id: userId },
        data: { creditBalance: newBalance },
      });

      await tx.creditLedger.create({
        data: {
          userId,
          amount,
          type,
          description,
          balanceAfter: newBalance,
        },
      });

      return { newBalance };
    });
  }

  /**
   * Get transaction ledger history for user.
   */
  static async getLedgerHistory(userId: string, limit: number = 50) {
    return await prisma.creditLedger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
