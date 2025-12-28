import Redis from 'ioredis';
import { config } from './config';

const REDIS_HOST = config.redis.host;
const REDIS_PORT = config.redis.port;
const REDIS_PASSWORD = config.redis.password;
const REDIS_DB = config.redis.db;

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD || undefined,
      db: REDIS_DB,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redis.on('connect', () => {
      console.log('Redis connected');
    });

    redis.on('error', (err) => {
      console.error('Redis error:', err.message);
    });

    redis.on('close', () => {
      console.log('Redis connection closed');
    });
  }
  return redis;
}

export async function initRedis(): Promise<boolean> {
  try {
    const client = getRedis();
    await client.connect();
    await client.ping();
    console.log('Redis connection initialized');
    return true;
  } catch {
    console.warn('Redis not available, falling back to PostgreSQL for sessions');
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

export function isRedisAvailable(): boolean {
  return redis !== null && redis.status === 'ready';
}

export const SESSION_TTL = config.auth.sessionExpiryDays * 24 * 60 * 60;

export const sessionKey = (tokenHash: string) => `session:${tokenHash}`;
export const rateLimitKey = (type: string, identifier: string) => `ratelimit:${type}:${identifier}`;
export const cacheKey = (namespace: string, id: string) => `cache:${namespace}:${id}`;

export interface SessionData {
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export async function setSession(tokenHash: string, data: SessionData): Promise<void> {
  if (!isRedisAvailable()) return;
  const client = getRedis();
  await client.setex(sessionKey(tokenHash), SESSION_TTL, JSON.stringify(data));
}

export async function getSession(tokenHash: string): Promise<SessionData | null> {
  if (!isRedisAvailable()) return null;
  const client = getRedis();
  const data = await client.get(sessionKey(tokenHash));
  if (!data) return null;
  return JSON.parse(data);
}

export async function deleteSession(tokenHash: string): Promise<void> {
  if (!isRedisAvailable()) return;
  const client = getRedis();
  await client.del(sessionKey(tokenHash));
}

export async function extendSession(tokenHash: string): Promise<void> {
  if (!isRedisAvailable()) return;
  const client = getRedis();
  await client.expire(sessionKey(tokenHash), SESSION_TTL);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

export async function checkRateLimit(
  type: string,
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  if (!isRedisAvailable()) {
    return { allowed: true, remaining: limit, resetIn: 0 };
  }

  const client = getRedis();
  const key = rateLimitKey(type, identifier);

  const count = await client.incr(key);
  if (count === 1) {
    await client.expire(key, windowSeconds);
  }

  const ttl = await client.ttl(key);

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetIn: ttl > 0 ? ttl : windowSeconds,
  };
}

export async function setCache(
  namespace: string,
  id: string,
  data: unknown,
  ttlSeconds: number
): Promise<void> {
  if (!isRedisAvailable()) return;
  const client = getRedis();
  await client.setex(cacheKey(namespace, id), ttlSeconds, JSON.stringify(data));
}

export async function getCache<T>(namespace: string, id: string): Promise<T | null> {
  if (!isRedisAvailable()) return null;
  const client = getRedis();
  const data = await client.get(cacheKey(namespace, id));
  if (!data) return null;
  return JSON.parse(data) as T;
}

export async function deleteCache(namespace: string, id: string): Promise<void> {
  if (!isRedisAvailable()) return;
  const client = getRedis();
  await client.del(cacheKey(namespace, id));
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  if (!isRedisAvailable()) return;
  const client = getRedis();
  const keys = await client.keys(`cache:${pattern}`);
  if (keys.length > 0) {
    await client.del(...keys);
  }
}
