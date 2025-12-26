import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not set - Stripe functionality will be unavailable');
}

export const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

export const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';

export const PRICE_IDS = {
  pro_individual: {
    monthly: 'price_1SiV9ACwpehntQOHdSxQvjbR',
    yearly: 'price_1SiV9UCwpehntQOH2f2RFojg',
  },
  pro_team: {
    monthly: 'price_1SiV9aCwpehntQOHKEYiw2kG',
    yearly: 'price_1SiV9gCwpehntQOHpDSCjRHz',
  },
  pro_organization: {
    monthly: 'price_1SiV9pCwpehntQOH8rsppeza',
    yearly: 'price_1SiV9wCwpehntQOHsUOFK4pq',
  },
} as const;

export const PRICE_CONFIG = {
  pro_individual: {
    monthly: {
      amount: 1900,
      interval: 'month' as const,
      priceId: PRICE_IDS.pro_individual.monthly,
    },
    yearly: { amount: 19000, interval: 'year' as const, priceId: PRICE_IDS.pro_individual.yearly },
  },
  pro_team: {
    monthly: { amount: 2900, interval: 'month' as const, priceId: PRICE_IDS.pro_team.monthly },
    yearly: { amount: 29000, interval: 'year' as const, priceId: PRICE_IDS.pro_team.yearly },
  },
  pro_organization: {
    monthly: {
      amount: 4900,
      interval: 'month' as const,
      priceId: PRICE_IDS.pro_organization.monthly,
    },
    yearly: {
      amount: 49000,
      interval: 'year' as const,
      priceId: PRICE_IDS.pro_organization.yearly,
    },
  },
};

export type SubscriptionPlan = 'pro_individual' | 'pro_team' | 'pro_organization';
export type BillingInterval = 'monthly' | 'yearly';
