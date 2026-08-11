import type { Cache } from './types.js';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache implements Cache {
  private store = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private defaultTTLEntries?: number) {
    this.startCleanup();
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);

    if (!entry) {
      return Promise.resolve(null);
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return Promise.resolve(null);
    }

    return Promise.resolve(entry.value as T);
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.defaultTTLEntries ?? 300;
    const expiresAt = Date.now() + ttl * 1000;

    this.store.set(key, { value, expiresAt });
    return Promise.resolve();
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
    return Promise.resolve();
  }

  async clear(): Promise<void> {
    this.store.clear();
    return Promise.resolve();
  }

  async has(key: string): Promise<boolean> {
    const entry = this.store.get(key);

    if (!entry) {
      return Promise.resolve(false);
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return Promise.resolve(false);
    }

    return Promise.resolve(true);
  }

  size(): number {
    return this.store.size;
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

let defaultCache: MemoryCache | null = null;

export function getCache(): MemoryCache {
  if (!defaultCache) {
    defaultCache = new MemoryCache();
  }
  return defaultCache;
}

export function resetCache(): void {
  if (defaultCache) {
    defaultCache.destroy();
    defaultCache = null;
  }
}
