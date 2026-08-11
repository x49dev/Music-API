import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGet = vi.fn();
const mockSetex = vi.fn();
const mockDel = vi.fn();
const mockKeys = vi.fn();
const mockExists = vi.fn();
const mockQuit = vi.fn();
const mockConnect = vi.fn();
const mockOn = vi.fn();

vi.mock('ioredis', () => {
  return {
    default: class MockRedis {
      get = mockGet;
      setex = mockSetex;
      del = mockDel;
      keys = mockKeys;
      exists = mockExists;
      quit = mockQuit;
      connect = mockConnect;
      on = mockOn;
    },
  };
});

import { RedisCache } from './redis.js';

describe('RedisCache', () => {
  let cache: RedisCache;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect.mockResolvedValue(undefined);
    mockQuit.mockResolvedValue(undefined);
    cache = new RedisCache({
      url: 'redis://localhost:6379',
      keyPrefix: 'test:',
      defaultTTL: 300,
    });
  });

  afterEach(async () => {
    await cache.disconnect();
  });

  describe('get', () => {
    it('should return null when not connected', async () => {
      const result = await cache.get('key');
      expect(result).toBeNull();
    });

    it('should return parsed value when connected', async () => {
      await cache.connect();
      mockGet.mockResolvedValueOnce(JSON.stringify({ foo: 'bar' }));

      const result = await cache.get<{ foo: string }>('key');

      expect(result).toEqual({ foo: 'bar' });
      expect(mockGet).toHaveBeenCalledWith('test:key');
    });

    it('should return null for non-existent key', async () => {
      await cache.connect();
      mockGet.mockResolvedValueOnce(null);

      const result = await cache.get('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      await cache.connect();
      mockGet.mockRejectedValueOnce(new Error('Redis error'));

      const result = await cache.get('key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should not set when not connected', async () => {
      await cache.set('key', 'value');
      expect(mockSetex).not.toHaveBeenCalled();
    });

    it('should set value with TTL', async () => {
      await cache.connect();
      mockSetex.mockResolvedValueOnce('OK');

      await cache.set('key', { data: 'test' }, 600);

      expect(mockSetex).toHaveBeenCalledWith('test:key', 600, '{"data":"test"}');
    });

    it('should use default TTL', async () => {
      await cache.connect();
      mockSetex.mockResolvedValueOnce('OK');

      await cache.set('key', 'value');

      expect(mockSetex).toHaveBeenCalledWith('test:key', 300, '"value"');
    });

    it('should not throw on error', async () => {
      await cache.connect();
      mockSetex.mockRejectedValueOnce(new Error('Redis error'));

      await expect(cache.set('key', 'value')).resolves.not.toThrow();
    });
  });

  describe('delete', () => {
    it('should not delete when not connected', async () => {
      await cache.delete('key');
      expect(mockDel).not.toHaveBeenCalled();
    });

    it('should delete key', async () => {
      await cache.connect();
      mockDel.mockResolvedValueOnce(1);

      await cache.delete('key');

      expect(mockDel).toHaveBeenCalledWith('test:key');
    });

    it('should not throw on error', async () => {
      await cache.connect();
      mockDel.mockRejectedValueOnce(new Error('Redis error'));

      await expect(cache.delete('key')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should not clear when not connected', async () => {
      await cache.clear();
      expect(mockKeys).not.toHaveBeenCalled();
    });

    it('should clear all prefixed keys', async () => {
      await cache.connect();
      mockKeys.mockResolvedValueOnce(['test:key1', 'test:key2']);
      mockDel.mockResolvedValueOnce(2);

      await cache.clear();

      expect(mockKeys).toHaveBeenCalledWith('test:*');
      expect(mockDel).toHaveBeenCalledWith('test:key1', 'test:key2');
    });

    it('should handle empty keys', async () => {
      await cache.connect();
      mockKeys.mockResolvedValueOnce([]);

      await cache.clear();

      expect(mockKeys).toHaveBeenCalledWith('test:*');
      expect(mockDel).not.toHaveBeenCalled();
    });
  });

  describe('has', () => {
    it('should return false when not connected', async () => {
      const result = await cache.has('key');
      expect(result).toBe(false);
    });

    it('should return true for existing key', async () => {
      await cache.connect();
      mockExists.mockResolvedValueOnce(1);

      const result = await cache.has('key');

      expect(result).toBe(true);
      expect(mockExists).toHaveBeenCalledWith('test:key');
    });

    it('should return false for non-existent key', async () => {
      await cache.connect();
      mockExists.mockResolvedValueOnce(0);

      const result = await cache.has('key');

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      await cache.connect();
      mockExists.mockRejectedValueOnce(new Error('Redis error'));

      const result = await cache.has('key');

      expect(result).toBe(false);
    });
  });

  describe('connect/disconnect', () => {
    it('should connect to Redis', async () => {
      await cache.connect();
      expect(mockConnect).toHaveBeenCalled();
    });

    it('should disconnect from Redis', async () => {
      await cache.connect();
      await cache.disconnect();
      expect(mockQuit).toHaveBeenCalled();
    });

    it('should not throw on disconnect error', async () => {
      await cache.connect();
      mockQuit.mockRejectedValueOnce(new Error('Already closed'));

      await expect(cache.disconnect()).resolves.not.toThrow();
    });
  });

  describe('isAvailable', () => {
    it('should return false when not connected', () => {
      expect(cache.isAvailable()).toBe(false);
    });

    it('should return true when connected', async () => {
      await cache.connect();
      expect(cache.isAvailable()).toBe(true);
    });
  });
});
