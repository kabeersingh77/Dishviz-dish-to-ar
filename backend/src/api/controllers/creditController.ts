import { Request, Response, NextFunction } from 'express';
import { CreditService } from '../../services/CreditService';
import { BUSINESS } from '../../config/business';

export async function getBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const balance = await CreditService.getBalance(userId);
    const costPerJob = BUSINESS.credits.costPerGeneration;
    const generationsRemaining = Math.floor(balance / costPerJob);

    res.json({
      balance,
      costPerGeneration: costPerJob,
      generationsRemaining,
      tiers: BUSINESS.credits.packs,
      minTopup: BUSINESS.credits.minTopup,
    });
  } catch (err) {
    next(err);
  }
}

export async function topUpCredits(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { amount, tier } = req.body;
    let topupAmount = 0;

    if (tier) {
      const selectedTier = BUSINESS.credits.packs.find((p) => p.id === tier);
      if (!selectedTier) {
        res.status(400).json({ error: 'Invalid credit tier selected' });
        return;
      }
      topupAmount = selectedTier.credits;
    } else if (typeof amount === 'number') {
      if (amount < BUSINESS.credits.minTopup) {
        res.status(400).json({
          error: `Minimum credit purchase is $${BUSINESS.credits.minTopup}`,
          minTopup: BUSINESS.credits.minTopup,
        });
        return;
      }
      topupAmount = Math.round(amount * 100) / 100;
    } else {
      res.status(400).json({ error: 'Please specify an amount or tier' });
      return;
    }

    const result = await CreditService.addCredits(
      userId,
      topupAmount,
      `Credit top-up (${tier || `$${topupAmount}`})`,
      'topup'
    );

    res.json({
      success: true,
      amountAdded: topupAmount,
      newBalance: result.newBalance,
      costPerGeneration: BUSINESS.credits.costPerGeneration,
      generationsRemaining: Math.floor(result.newBalance / BUSINESS.credits.costPerGeneration),
    });
  } catch (err) {
    next(err);
  }
}

export async function getLedger(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const history = await CreditService.getLedgerHistory(userId, limit);

    res.json({
      history,
    });
  } catch (err) {
    next(err);
  }
}
