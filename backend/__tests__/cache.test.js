/**
 * Tests for Cache Service
 */

import { initCache, cache, cached } from '../services/cache.service.js';

// Note: cache and cached are separate exports - no conflict

describe('Cache Service', () => {
  beforeEach(async () => {
    // Clear cache before each test
    await cache.clear();
  });

  describe('Memory Cache (fallback)', () => {
    it('should store and retrieve values', async () => {
      await cache.set('test-key', { data: 'test-value' }, 3600);
      const value = await cache.get('test-key');

      expect(value).toEqual({ data: 'test-value' });
    });

    it('should return null for non-existent keys', async () => {
      const value = await cache.get('non-existent');

      expect(value).toBeNull();
    });

    it('should respect TTL', async () => {
      await cache.set('ttl-key', 'value', 1); // 1 second TTL

      const value1 = await cache.get('ttl-key');
      expect(value1).toBe('value');

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      const value2 = await cache.get('ttl-key');
      expect(value2).toBeNull();
    });

    it('should delete keys', async () => {
      await cache.set('delete-key', 'value');
      await cache.del('delete-key');

      const value = await cache.get('delete-key');
      expect(value).toBeNull();
    });

    it('should clear all cache', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.clear();

      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
    });

    it('should find keys by pattern', async () => {
      await cache.set('courses:1', 'value1');
      await cache.set('courses:2', 'value2');
      await cache.set('users:1', 'value3');

      const keys = await cache.keys('courses:*');
      expect(keys.length).toBeGreaterThanOrEqual(2);
      expect(keys.some(k => k.includes('courses'))).toBe(true);
    });
  });

  describe('cached decorator', () => {
    it('should cache function results', async () => {
      let callCount = 0;
      const expensiveFunction = async (arg) => {
        callCount++;
        return `result-${arg}`;
      };

      const cachedFn = cached(expensiveFunction, {
        keyPrefix: 'test',
        ttl: 3600
      });

      // First call - should execute function
      const result1 = await cachedFn('test');
      expect(result1).toBe('result-test');
      expect(callCount).toBe(1);

      // Second call - should use cache
      const result2 = await cachedFn('test');
      expect(result2).toBe('result-test');
      expect(callCount).toBe(1); // Should not increment
    });

    it('should use custom key generator', async () => {
      const fn = async (id, name) => ({ id, name });
      const cachedFn = cached(fn, {
        keyGenerator: (id, name) => `custom:${id}:${name}`
      });

      await cachedFn('1', 'test');
      const cachedValue = await cache.get('custom:1:test');
      expect(cachedValue).toEqual({ id: '1', name: 'test' });
    });
  });

  describe('cache initialization', () => {
    it('should initialize with memory cache when Redis not available', async () => {
      const originalRedisUrl = process.env.REDIS_URL;
      const originalRedisHost = process.env.REDIS_HOST;
      
      delete process.env.REDIS_URL;
      delete process.env.REDIS_HOST;

      try {
        // Re-initialize cache
        const cacheInstance = await initCache();
        expect(cacheInstance).toBeDefined();

        // Should work (memory cache)
        await cache.set('test', 'value');
        const value = await cache.get('test');
        expect(value).toBe('value');
      } finally {
        // Restore environment
        if (originalRedisUrl) process.env.REDIS_URL = originalRedisUrl;
        if (originalRedisHost) process.env.REDIS_HOST = originalRedisHost;
      }
    });
  });
});

