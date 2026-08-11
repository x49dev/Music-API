import type { Cache } from './types.js';

interface RedisClient {
  get(key: string): Promise<string | null>;
  setex(key: string, ttl: number, value: string): Promise<string>;
  del(...keys: string[]): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  exists(key: string): Promise<number>;
  quit(): Promise<string>;
  connect(): Promise<void>;
  on(event: string, callback: (...args: unknown[]) => void): void;
}

let RedisClass: (new (url: string, options?: Record<string, unknown>) => RedisClient) | null = null;

try {
  const ioredis = await import('ioredis');
  RedisClass = ioredis.default as unknown as new (
    url: string,
    options?: Record<string, unknown>
  ) => RedisClient;
} catch {
  RedisClass = null;
}

export interface RedisCacheOptions {
  url?: string;
  keyPrefix?: string;
  defaultTTL?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export class RedisCache implements Cache {
  private client: RedisClient | null = null;
  private keyPrefix: string;
  private defaultTTL: number;
  private maxRetries: number;
  private retryDelay: number;
  private connected = false;

  constructor(options: RedisCacheOptions = {}) {
    this.keyPrefix = options.keyPrefix ?? 'music-api:';
    this.defaultTTL = options.defaultTTL ?? 300;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelay = options.retryDelay ?? 1000;

    if (RedisClass && options.url) {
      this.client = new RedisClass(options.url, {
        maxRetriesPerRequest: 3,
        retryStrategy(times: number) {
          if (times > 3) return null;
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
        enableReadyCheck: true,
      });

      this.client.on('connect', () => {
        this.connected = true;
      });

      this.client.on('error', () => {
        this.connected = false;
      });

      this.client.on('close', () => {
        this.connected = false;
      });
    }
  }

  private getPrefixedKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }

    if (lastError) {
      throw lastError;
    }
    throw new Error('Retry failed');
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.connected) {
      return null;
    }

    try {
      const result = await this.withRetry(() => this.client!.get(this.getPrefixedKey(key)));

      if (result === null) {
        return null;
      }

      return JSON.parse(result) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.client || !this.connected) {
      return;
    }

    const ttl = ttlSeconds ?? this.defaultTTL;
    const serialized = JSON.stringify(value);

    try {
      await this.withRetry(() => this.client!.setex(this.getPrefixedKey(key), ttl, serialized));
    } catch {
      // Silently fail - don't break the app if cache write fails
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client || !this.connected) {
      return;
    }

    try {
      await this.withRetry(() => this.client!.del(this.getPrefixedKey(key)));
    } catch {
      // Silently fail
    }
  }

  async clear(): Promise<void> {
    if (!this.client || !this.connected) {
      return;
    }

    try {
      const keys = await this.withRetry(() => this.client!.keys(`${this.keyPrefix}*`));
      if (keys.length > 0) {
        await this.withRetry(() => this.client!.del(...keys));
      }
    } catch {
      // Silently fail
    }
  }

  async has(key: string): Promise<boolean> {
    if (!this.client || !this.connected) {
      return false;
    }

    try {
      const result = await this.withRetry(() => this.client!.exists(this.getPrefixedKey(key)));
      return result === 1;
    } catch {
      return false;
    }
  }

  async connect(): Promise<void> {
    if (this.client && !this.connected) {
      try {
        await this.client.connect();
        this.connected = true;
      } catch {
        this.connected = false;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        this.connected = false;
      } catch {
        this.connected = false;
      }
    }
  }

  isAvailable(): boolean {
    return this.client !== null && this.connected;
  }
}
