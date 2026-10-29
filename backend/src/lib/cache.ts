import type { Redis } from './redis.js';

export const CACHE_TTL_SECONDS = 10 * 60;

export const cacheKeys = {
  analysis: (userId: number) => `cache:analysis:${userId}`,
  projection: (userId: number) => `cache:projection:${userId}`,
};

/** Apaga todo o cache derivado do orçamento do usuário (SPEC-04 §4). */
export async function invalidateUserCache(redis: Redis, userId: number): Promise<void> {
  await redis.del(cacheKeys.analysis(userId), cacheKeys.projection(userId));
}

export async function readCache<T>(redis: Redis, key: string): Promise<T | null> {
  const raw = await redis.get(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function writeCache(redis: Redis, key: string, value: unknown): Promise<void> {
  await redis.set(key, JSON.stringify(value), 'EX', CACHE_TTL_SECONDS);
}
