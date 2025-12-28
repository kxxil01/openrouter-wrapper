import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import * as auth from '../lib/auth';
import { sql } from '../lib/db';
import { stripe, STRIPE_PUBLISHABLE_KEY, PRICE_CONFIG } from '../lib/stripe';
import type { SubscriptionPlan, BillingInterval } from '../lib/stripe';
import { config } from '../lib/config';

const billingRoutes = new Hono();

const BASE_URL = config.baseUrl;

billingRoutes.get('/config', async (c) => {
  return c.json({
    publishableKey: STRIPE_PUBLISHABLE_KEY,
    prices: PRICE_CONFIG,
  });
});

billingRoutes.post('/create-checkout-session', async (c) => {
  if (!stripe) {
    return c.json({ error: 'Stripe not configured' }, 500);
  }

  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const user = await auth.validateSession(sessionToken);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const { plan, interval } = (await c.req.json()) as {
    plan: SubscriptionPlan;
    interval: BillingInterval;
  };

  if (!plan || !interval) {
    return c.json({ error: 'Plan and interval are required' }, 400);
  }

  const priceConfig = PRICE_CONFIG[plan];
  if (!priceConfig) {
    return c.json({ error: 'Invalid plan' }, 400);
  }

  const intervalConfig = priceConfig[interval];
  if (!intervalConfig) {
    return c.json({ error: 'Invalid interval' }, 400);
  }

  try {
    let customerId = user.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          user_id: user.id,
        },
      });
      customerId = customer.id;

      await sql`
        UPDATE users SET stripe_customer_id = ${customerId} WHERE id = ${user.id}
      `;
    }

    const subscriptionScope =
      plan === 'pro_individual' ? 'individual' : plan === 'pro_team' ? 'team' : 'organization';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: intervalConfig.priceId,
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        plan,
        interval,
        subscription_scope: subscriptionScope,
      },
      success_url: `${BASE_URL}/?checkout=success`,
      cancel_url: `${BASE_URL}/?checkout=cancel`,
    });

    return c.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: 'Failed to create checkout session', details: errorMessage }, 500);
  }
});

billingRoutes.post('/create-portal-session', async (c) => {
  if (!stripe) {
    return c.json({ error: 'Stripe not configured' }, 500);
  }

  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const user = await auth.validateSession(sessionToken);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!user.stripe_customer_id) {
    return c.json({ error: 'No billing account found' }, 400);
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${BASE_URL}/profile`,
    });

    return c.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return c.json({ error: 'Failed to create portal session' }, 500);
  }
});

billingRoutes.get('/subscription', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const user = await auth.validateSession(sessionToken);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  return c.json({
    subscription_status: user.subscription_status,
    subscription_tier: user.subscription_tier,
    subscription_scope: user.subscription_scope,
    subscription_expires_at: user.subscription_expires_at,
    stripe_subscription_id: user.stripe_subscription_id,
  });
});

billingRoutes.post('/verify-subscription', async (c) => {
  if (!stripe) {
    return c.json({ error: 'Stripe not configured' }, 500);
  }

  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const user = await auth.validateSession(sessionToken);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!user.stripe_customer_id) {
    return c.json({ error: 'No Stripe customer found' }, 400);
  }

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripe_customer_id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      const periodEnd = (subscription as { current_period_end?: number }).current_period_end;
      const expiresAt = periodEnd ? new Date(periodEnd * 1000) : null;

      if (user.subscription_status !== 'active' || user.subscription_tier !== 'pro') {
        await sql`
          UPDATE users 
          SET 
            stripe_subscription_id = ${subscription.id},
            subscription_status = 'active',
            subscription_tier = 'pro',
            subscription_scope = 'individual',
            subscription_expires_at = ${expiresAt},
            updated_at = NOW()
          WHERE id = ${user.id}
        `;
        console.log(`User ${user.id} subscription verified and updated to pro`);
      }

      return c.json({
        status: 'active',
        tier: 'pro',
        expires_at: expiresAt,
        updated: user.subscription_status !== 'active',
      });
    }

    return c.json({
      status: user.subscription_status,
      tier: user.subscription_tier,
      updated: false,
    });
  } catch (error) {
    console.error('Error verifying subscription:', error);
    return c.json({ error: 'Failed to verify subscription' }, 500);
  }
});

billingRoutes.post('/webhook', async (c) => {
  if (!stripe) {
    return c.json({ error: 'Stripe not configured' }, 500);
  }

  const WEBHOOK_SECRET = config.stripe.webhookSecret;
  if (!WEBHOOK_SECRET) {
    console.warn('STRIPE_WEBHOOK_SECRET not set, skipping signature verification');
  }

  const body = await c.req.text();
  const signature = c.req.header('stripe-signature');

  let event;

  try {
    if (WEBHOOK_SECRET && signature) {
      event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
    } else {
      event = JSON.parse(body);
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return c.json({ error: 'Invalid signature' }, 400);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const subscriptionScope = session.metadata?.subscription_scope || 'individual';

        if (userId && session.subscription) {
          await sql`
            UPDATE users 
            SET 
              stripe_subscription_id = ${session.subscription as string},
              subscription_status = 'active',
              subscription_tier = 'pro',
              subscription_scope = ${subscriptionScope},
              updated_at = NOW()
            WHERE id = ${userId}
          `;
          console.log(`User ${userId} subscribed to pro ${subscriptionScope}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        const [user] = await sql`
          SELECT id FROM users WHERE stripe_customer_id = ${customerId}
        `;

        if (user) {
          const status = subscription.status === 'active' ? 'active' : 'cancelled';
          const expiresAt = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : null;

          await sql`
            UPDATE users 
            SET 
              subscription_status = ${status},
              subscription_expires_at = ${expiresAt},
              updated_at = NOW()
            WHERE id = ${user.id}
          `;
          console.log(`User ${user.id} subscription updated to ${status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        const [user] = await sql`
          SELECT id FROM users WHERE stripe_customer_id = ${customerId}
        `;

        if (user) {
          await sql`
            UPDATE users 
            SET 
              subscription_status = 'expired',
              subscription_tier = 'free',
              subscription_scope = 'individual',
              stripe_subscription_id = NULL,
              updated_at = NOW()
            WHERE id = ${user.id}
          `;
          console.log(`User ${user.id} subscription expired`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer as string;

        const [user] = await sql`
          SELECT id, email FROM users WHERE stripe_customer_id = ${customerId}
        `;

        if (user) {
          console.log(`Payment failed for user ${user.id} (${user.email})`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return c.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});

export default billingRoutes;
