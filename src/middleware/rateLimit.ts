import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import * as auth from '../lib/auth';
import { checkRateLimit, isRedisAvailable } from '../lib/redis';

export const RATE_LIMITS = {
  api: { limit: 60, window: 60 },
  chat: { limit: 20, window: 60 },
  auth: { limit: 10, window: 60 },
} as const;

type RateLimitType = keyof typeof RATE_LIMITS;

export function createRateLimitMiddleware(type: RateLimitType) {
  return async (c: Context, next: Next) => {
    if (!isRedisAvailable()) {
      return next();
    }

    const sessionToken = getCookie(c, 'session');
    let identifier: string;

    if (sessionToken) {
      const user = await auth.validateSession(sessionToken);
      identifier = user?.id || c.req.header('x-forwarded-for') || 'anonymous';
    } else {
      identifier = c.req.header('x-forwarded-for') || 'anonymous';
    }

    const config = RATE_LIMITS[type];
    const result = await checkRateLimit(type, identifier, config.limit, config.window);

    c.header('X-RateLimit-Limit', String(config.limit));
    c.header('X-RateLimit-Remaining', String(result.remaining));
    c.header('X-RateLimit-Reset', String(result.resetIn));

    if (!result.allowed) {
      return c.json(
        {
          error: 'Rate limit exceeded',
          retry_after: result.resetIn,
        },
        429
      );
    }

    return next();
  };
}

export const apiRateLimit = createRateLimitMiddleware('api');
export const chatRateLimit = createRateLimitMiddleware('chat');
export const authRateLimit = createRateLimitMiddleware('auth');
