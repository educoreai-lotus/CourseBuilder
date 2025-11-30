/**
 * Caching Service
 * Provides caching layer with Redis support and in-memory fallback
 * Can work with or without Redis
 */

/**
 * In-memory cache fallback
 */
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map(); // Time-to-live tracking
  }

  async get(key) {
    const ttl = this.ttl.get(key);
    if (ttl && ttl < Date.now()) {
      this.cache.delete(key);
      this.ttl.delete(key);
      return null;
    }
    return this.cache.get(key) || null;
  }

  async set(key, value, ttlSeconds = 3600) {
    this.cache.set(key, value);
    if (ttlSeconds > 0) {
      this.ttl.set(key, Date.now() + (ttlSeconds * 1000));
    }
  }

  async del(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
  }

  async clear() {
    this.cache.clear();
    this.ttl.clear();
  }

  async keys(pattern) {
    const allKeys = Array.from(this.cache.keys());
    if (!pattern || pattern === '*') {
      return allKeys;
    }
    // Simple pattern matching (supports * wildcard)
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return allKeys.filter(key => regex.test(key));
  }
}

/**
 * Redis cache implementation
 */
class RedisCache {
  constructor(redisClient) {
    this.client = redisClient;
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('[Cache] Redis get error:', error);
      return null;
    }
  }

  async set(key, value, ttlSeconds = 3600) {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds > 0) {
        await this.client.setEx(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      console.error('[Cache] Redis set error:', error);
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('[Cache] Redis del error:', error);
    }
  }

  async clear() {
    try {
      await this.client.flushDb();
    } catch (error) {
      console.error('[Cache] Redis clear error:', error);
    }
  }

  async keys(pattern) {
    try {
      return await this.client.keys(pattern || '*');
    } catch (error) {
      console.error('[Cache] Redis keys error:', error);
      return [];
    }
  }
}

/**
 * Initialize cache (Redis if available, otherwise in-memory)
 */
let cacheInstance = null;

export const initCache = async () => {
  if (cacheInstance) {
    return cacheInstance;
  }

  // Try to use Redis if configured
  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST;
  const redisPort = process.env.REDIS_PORT;

  if (redisUrl || (redisHost && redisPort)) {
    try {
      // Try to import redis client
      const redis = await import('redis').catch(() => null);
      
      if (redis) {
        const client = redis.createClient({
          url: redisUrl || `redis://${redisHost}:${redisPort}`,
          socket: {
            reconnectStrategy: (retries) => {
              if (retries > 10) {
                console.warn('[Cache] Redis reconnection failed, falling back to memory cache');
                return false; // Stop reconnecting, use memory cache
              }
              return Math.min(retries * 100, 3000);
            }
          }
        });

        client.on('error', (err) => {
          console.error('[Cache] Redis error:', err);
        });

        await client.connect();
        console.log('✅ Redis cache connected');
        cacheInstance = new RedisCache(client);
        return cacheInstance;
      }
    } catch (error) {
      console.warn('[Cache] Redis not available, using in-memory cache:', error.message);
    }
  }

  // Fallback to in-memory cache
  console.log('📦 Using in-memory cache (Redis not configured)');
  cacheInstance = new MemoryCache();
  return cacheInstance;
};

/**
 * Get cache instance (initialize if needed)
 */
const getCache = async () => {
  if (!cacheInstance) {
    await initCache();
  }
  return cacheInstance;
};

/**
 * Cache wrapper with automatic key generation
 */
export const cache = {
  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    const cache = await getCache();
    return cache.get(key);
  },

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlSeconds - Time to live in seconds (default: 3600)
   */
  async set(key, value, ttlSeconds = 3600) {
    const cache = await getCache();
    return cache.set(key, value, ttlSeconds);
  },

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   */
  async del(key) {
    const cache = await getCache();
    return cache.del(key);
  },

  /**
   * Clear all cache
   */
  async clear() {
    const cache = await getCache();
    return cache.clear();
  },

  /**
   * Get cache keys matching pattern
   * @param {string} pattern - Pattern to match (supports * wildcard)
   */
  async keys(pattern) {
    const cache = await getCache();
    return cache.keys(pattern);
  }
};

/**
 * Cache decorator for functions
 * @param {Function} fn - Function to cache
 * @param {Object} options - Cache options
 * @param {string} options.keyPrefix - Key prefix
 * @param {number} options.ttl - Time to live in seconds
 * @param {Function} options.keyGenerator - Custom key generator function
 */
export const cached = (fn, options = {}) => {
  const {
    keyPrefix = 'cache',
    ttl = 3600,
    keyGenerator = null
  } = options;

  return async (...args) => {
    // Generate cache key
    let cacheKey;
    if (keyGenerator) {
      cacheKey = keyGenerator(...args);
    } else {
      const argsKey = JSON.stringify(args);
      cacheKey = `${keyPrefix}:${fn.name}:${Buffer.from(argsKey).toString('base64')}`;
    }

    // Try to get from cache
    const cachedValue = await cache.get(cacheKey);
    if (cachedValue !== null) {
      return cachedValue;
    }

    // Execute function and cache result
    const result = await fn(...args);
    await cache.set(cacheKey, result, ttl);
    return result;
  };
};

export default {
  initCache,
  cache,
  cached
};

