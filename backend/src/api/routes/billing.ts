import { Router, raw } from 'express';
import {
  createCheckout,
  createPortal,
  getSubscription,
  handleWebhook,
} from '../controllers/billingController';
import { requireAuth } from '../middleware/auth';
import { apiRateLimit } from '../middleware/rateLimit';
import creditsRoutes from './credits';

const router = Router();

// ─── Credits & Pre-paid Balance Management ──────────────────────────────────
router.use('/credits', creditsRoutes);

// ─── Stripe Webhook (Raw body required for signature verification) ──────────
// Must NOT be processed through json() parser beforehand
router.post('/webhook', raw({ type: 'application/json' }), handleWebhook);

// ─── Customer Subscription Management (Authenticated) ──────────────────────
router.use(apiRateLimit);
router.post('/checkout', requireAuth, createCheckout);
router.post('/portal', requireAuth, createPortal);
router.get('/subscription', requireAuth, getSubscription);

export default router;
