import { Request, Response, NextFunction } from 'express';
import { StripeService } from '../../services/StripeService';
import { prisma } from '../../db/prisma';
import { env } from '../../config/env';

/**
 * BillingController — HTTP handlers for Stripe checkout, portal, and webhooks.
 */

export async function createCheckout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const userEmail = req.userEmail!;
    const { plan } = req.body as { plan?: 'web_app' | 'developer_api' };

    if (!plan || (plan !== 'web_app' && plan !== 'developer_api')) {
      res.status(400).json({ error: 'Valid plan ("web_app" or "developer_api") is required' });
      return;
    }

    const returnUrlBase = req.headers.origin || env.frontendOrigin;
    const { url } = await StripeService.createCheckoutSession(
      userId,
      userEmail,
      plan,
      returnUrlBase
    );

    res.json({ checkoutUrl: url });
  } catch (err) {
    next(err);
  }
}

export async function createPortal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const returnUrl = `${req.headers.origin || env.frontendOrigin}/dashboard/billing`;

    const { url } = await StripeService.createPortalSession(userId, returnUrl);
    res.json({ portalUrl: url });
  } catch (err) {
    next(err);
  }
}

export async function getSubscription(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    res.json({ subscription });
  } catch (err) {
    next(err);
  }
}

export async function handleWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const signature = req.headers['stripe-signature'];
    if (!signature || typeof signature !== 'string') {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    const rawBody = (req as any).rawBody || (req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body)));

    await StripeService.handleWebhook(rawBody, signature);
    res.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook error';
    console.error(`[Stripe Webhook Error] ${message}`);
    res.status(400).json({ error: message });
  }
}
