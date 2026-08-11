export type { Cache } from './types.js';
export { MemoryCache, getCache, resetCache } from './memory.js';
export { RedisCache } from './redis.js';
export type { RedisCacheOptions } from './redis.js';

import type { Cache } from './types.js';
import { getCache as getMemoryCache, resetCache as resetMemoryCache } from './memory.js';
import { RedisCache } from './redis.js';
import { config } from '../config/index.js';

let activeCache: Cache | null = null;

export async function initializeCache(): Promise<Cache> {
  if (activeCache) {
    return activeCache;
  }

  if (config.REDIS_URL) {
    const redisCache = new RedisCache({
      url: config.REDIS_URL,
      defaultTTL: config.CACHE_TTL_SEARCH,
    });

    await redisCache.connect();

    if (redisCache.isAvailable()) {
      activeCache = redisCache;
      return activeCache;
    }
  }

  activeCache = getMemoryCache();
  return activeCache;
}

export function getActiveCache(): Cache {
  if (!activeCache) {
    activeCache = getMemoryCache();
  }
  return activeCache;
}

export async function resetActiveCache(): Promise<void> {
  if (activeCache instanceof RedisCache) {
    await activeCache.disconnect();
  }
  resetMemoryCache();
  activeCache = null;
}
