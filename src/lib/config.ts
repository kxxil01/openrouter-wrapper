export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  baseUrl: process.env.BASE_URL || 'http://localhost:3001',
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL!,
  },

  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    defaultModel: process.env.DEFAULT_MODEL_ID || 'deepseek/deepseek-r1-0528:free',
    titleGenerationModel: process.env.TITLE_GENERATION_MODEL || 'google/gemini-2.0-flash-001',
  },

  auth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/callback',
    },
    sessionExpiryDays: parseInt(process.env.SESSION_EXPIRY_DAYS || '7', 10),
  },

  paywall: {
    disabled: process.env.DISABLE_PAYWALL === 'true',
    freeMessageLimit: parseInt(process.env.FREE_MESSAGE_LIMIT || '5', 10),
    titleGenerationThresholds: (process.env.TITLE_GENERATION_THRESHOLDS || '1,3,5')
      .split(',')
      .map((n) => parseInt(n.trim(), 10)),
  },

  stripe: {
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    priceIds: {
      proIndividual: {
        monthly: process.env.STRIPE_PRICE_PRO_INDIVIDUAL_MONTHLY || '',
        yearly: process.env.STRIPE_PRICE_PRO_INDIVIDUAL_YEARLY || '',
      },
      proTeam: {
        monthly: process.env.STRIPE_PRICE_PRO_TEAM_MONTHLY || '',
        yearly: process.env.STRIPE_PRICE_PRO_TEAM_YEARLY || '',
      },
      proOrganization: {
        monthly: process.env.STRIPE_PRICE_PRO_ORGANIZATION_MONTHLY || '',
        yearly: process.env.STRIPE_PRICE_PRO_ORGANIZATION_YEARLY || '',
      },
    },
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:3001,http://localhost:5173').split(','),
  },
};

export type Config = typeof config;
