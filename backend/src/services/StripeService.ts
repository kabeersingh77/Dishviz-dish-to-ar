import Stripe from 'stripe';
import { env } from '../config/env';
import { BUSINESS } from '../config/business';
import { prisma } from '../db/prisma';

/**
 * StripeService — Boilerplate implementation for Stripe Billing & Webhooks.
 *
 * Customize this to match your production Stripe product/price IDs,
 * trial periods, metadata, discount codes, or custom fulfillment flows.
 */

// Initialize Stripe if API key is provided
export const stripe = env.stripeSecretKey
  ? new Stripe(env.stripeSecretKey, {
      apiVersion: '2024-11-20.acacia' as any,
    })
  : null;

export const StripeService = {
  /**
   * Create a Stripe Checkout Session for a subscription plan.
   *
   * @param userId - ID of authenticated user
   * @param userEmail - Email of authenticated user
   * @param plan - 'web_app' | 'developer_api'
   * @param returnUrlBase - Base URL for success/cancel redirects (e.g., http://localhost:5173)
   */
  async createCheckoutSession(
    userId: string,
    userEmail: string,
    plan: 'web_app' | 'developer_api',
    returnUrlBase: string
  ): Promise<{ url: string }> {
    if (!stripe) {
      throw new Error(
        'Stripe is not configured on this server. Please set STRIPE_SECRET_KEY in your environment.'
      );
    }

    // Resolve Stripe price ID from environment or business config
    const priceId =
      plan === 'web_app' ? env.stripeWebAppPriceId : env.stripeApiPlanPriceId;

    if (!priceId) {
      throw new Error(
        `No Stripe Price ID configured for plan "${plan}". Set STRIPE_WEB_APP_PRICE_ID or STRIPE_API_PLAN_PRICE_ID.`
      );
    }

    // Find or create Stripe customer record
    let subscription = await prisma.subscription.findUnique({ where: { userId } });
    let customerId = subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { userId },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${returnUrlBase}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${returnUrlBase}/pricing?status=cancelled`,
      metadata: {
        userId,
        plan,
      },
      subscription_data: {
        metadata: {
          userId,
          plan,
        },
      },
    });

    if (!session.url) {
      throw new Error('Failed to generate Stripe Checkout URL');
    }

    return { url: session.url };
  },

  /**
   * Create a Stripe Customer Portal Session for managing active subscriptions,
   * payment methods, and invoices.
   */
  async createPortalSession(
    userId: string,
    returnUrl: string
  ): Promise<{ url: string }> {
    if (!stripe) {
      throw new Error('Stripe is not configured on this server.');
    }

    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    if (!subscription?.stripeCustomerId) {
      throw new Error('No Stripe customer found for this account.');
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: portalSession.url };
  },

  /**
   * Handle incoming Stripe webhook events idempotently.
   *
   * @param rawBody - Raw unparsed buffer from the HTTP request
   * @param signature - 'stripe-signature' header value
   */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<{ received: boolean }> {
    if (!stripe || !env.stripeWebhookSecret) {
      throw new Error('Stripe webhooks are not configured. Set STRIPE_WEBHOOK_SECRET.');
    }

    // Construct and verify event signature
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      env.stripeWebhookSecret
    );

    // Idempotency check: avoid processing duplicate webhook deliveries
    const existing = await prisma.webhookEvent.findUnique({
      where: { eventId: event.id },
    });

    if (existing?.processed) {
      return { received: true };
    }

    // Record webhook event receipt
    await prisma.webhookEvent.upsert({
      where: { eventId: event.id },
      create: {
        eventId: event.id,
        provider: 'stripe',
        eventType: event.type,
        processed: false,
      },
      update: {},
    });

    // Handle supported billing events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan ?? 'web_app';
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (userId) {
          await prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              plan,
              status: 'active',
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
            },
            update: {
              plan,
              status: 'active',
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
            },
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        const plan = sub.metadata?.plan ?? 'web_app';

        if (userId) {
          await prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              plan,
              status: sub.status,
              stripeCustomerId: sub.customer as string,
              stripeSubscriptionId: sub.id,
              currentPeriodStart: new Date(sub.current_period_start * 1000),
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            },
            update: {
              status: sub.status,
              currentPeriodStart: new Date(sub.current_period_start * 1000),
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const subscriptionId = sub.id;

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: {
            status: 'canceled',
            cancelAtPeriodEnd: false,
          },
        });
        break;
      }

      default:
        // Unhandled event type — ignore or log for debugging
        break;
    }

    // Mark event as processed
    await prisma.webhookEvent.update({
      where: { eventId: event.id },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });

    return { received: true };
  },
};
