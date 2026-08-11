import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryCache, resetCache } from './memory.js';

describe('MemoryCache', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache();
  });

  afterEach(() => {
    cache.destroy();
    resetCache();
  });

  describe('get', () => {
    it('should return null for non-existent key', async () => {
      const result = await cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should return cached value', async () => {
      await cache.set('key', 'value');
      const result = await cache.get('key');
      expect(result).toBe('value');
    });

    it('should return null for expired key', async () => {
      await cache.set('key', 'value', -1);
      const result = await cache.get('key');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should store value', async () => {
      await cache.set('key', 'value');
      const result = await cache.get('key');
      expect(result).toBe('value');
    });

    it('should store object', async () => {
      const obj = { foo: 'bar', num: 123 };
      await cache.set('key', obj);
      const result = await cache.get<typeof obj>('key');
      expect(result).toEqual(obj);
    });

    it('should overwrite existing value', async () => {
      await cache.set('key', 'old');
      await cache.set('key', 'new');
      const result = await cache.get('key');
      expect(result).toBe('new');
    });
  });

  describe('delete', () => {
    it('should delete existing key', async () => {
      await cache.set('key', 'value');
      await cache.delete('key');
      const result = await cache.get('key');
      expect(result).toBeNull();
    });

    it('should not throw for non-existent key', async () => {
      await expect(cache.delete('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.clear();
      const result1 = await cache.get('key1');
      const result2 = await cache.get('key2');
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('has', () => {
    it('should return true for existing key', async () => {
      await cache.set('key', 'value');
      const result = await cache.has('key');
      expect(result).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const result = await cache.has('nonexistent');
      expect(result).toBe(false);
    });

    it('should return false for expired key', async () => {
      await cache.set('key', 'value', -1);
      const result = await cache.has('key');
      expect(result).toBe(false);
    });
  });

  describe('TTL', () => {
    it('should respect custom TTL', async () => {
      await cache.set('key', 'value', 1);
      const result1 = await cache.get('key');
      expect(result1).toBe('value');
    });
  });

  describe('size', () => {
    it('should return correct size', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);
    });
  });
});
