import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not set - Stripe functionality will be unavailable');
}

export const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

export const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';

export const PRICES = {
  PRO_INDIVIDUAL_MONTHLY: 'price_pro_individual_monthly',
  PRO_INDIVIDUAL_YEARLY: 'price_pro_individual_yearly',
  PRO_TEAM_MONTHLY: 'price_pro_team_monthly',
  PRO_TEAM_YEARLY: 'price_pro_team_yearly',
  PRO_ORG_MONTHLY: 'price_pro_org_monthly',
  PRO_ORG_YEARLY: 'price_pro_org_yearly',
} as const;

export const PRICE_CONFIG = {
  pro_individual: {
    monthly: { amount: 1900, interval: 'month' as const },
    yearly: { amount: 19000, interval: 'year' as const },
  },
  pro_team: {
    monthly: { amount: 2900, interval: 'month' as const },
    yearly: { amount: 29000, interval: 'year' as const },
  },
  pro_organization: {
    monthly: { amount: 4900, interval: 'month' as const },
    yearly: { amount: 49000, interval: 'year' as const },
  },
};

export type SubscriptionPlan = 'pro_individual' | 'pro_team' | 'pro_organization';
export type BillingInterval = 'monthly' | 'yearly';
