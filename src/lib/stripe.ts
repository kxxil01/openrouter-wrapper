import Stripe from 'stripe';
import { config } from './config';

const STRIPE_SECRET_KEY = config.stripe.secretKey;

if (!STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not set - Stripe functionality will be unavailable');
}

export const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

export const STRIPE_PUBLISHABLE_KEY = config.stripe.publishableKey;

export const PRICE_IDS = {
  pro_individual: {
    monthly: config.stripe.priceIds.proIndividual.monthly,
    yearly: config.stripe.priceIds.proIndividual.yearly,
  },
  pro_team: {
    monthly: config.stripe.priceIds.proTeam.monthly,
    yearly: config.stripe.priceIds.proTeam.yearly,
  },
  pro_organization: {
    monthly: config.stripe.priceIds.proOrganization.monthly,
    yearly: config.stripe.priceIds.proOrganization.yearly,
  },
};

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
