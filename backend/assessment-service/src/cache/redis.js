/**
 * Redis Cache Service
 * Handles Redis connection and caching operations
 */

const redis = require('redis');
const logger = require('../utils/logger');

let client = null;
let isConnected = false;

/**
 * Connect to Redis
 */
const connectRedis = async () => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    client = redis.createClient({
      url: redisUrl,
      retry_unfulfilled_commands: true,
      retry_strategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn(`Redis connection attempt ${times}, retrying in ${delay}ms`);
        return delay;
      }
    });

    client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
      isConnected = false;
    });

    client.on('connect', () => {
      logger.info('Connected to Redis server');
      isConnected = true;
    });

    client.on('reconnecting', () => {
      logger.warn('Reconnecting to Redis server...');
      isConnected = false;
    });

    client.on('end', () => {
      logger.warn('Redis connection ended');
      isConnected = false;
    });

    await client.connect();
    
    // Test the connection
    await client.ping();
    logger.info('Redis connection established and tested successfully');
    
    return client;

  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

/**
 * Disconnect from Redis
 */
const disconnectRedis = async () => {
  if (client) {
    try {
      await client.quit();
      logger.info('Redis connection closed gracefully');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    } finally {
      client = null;
      isConnected = false;
    }
  }
};

/**
 * Get Redis client instance
 */
const getRedisClient = () => {
  return client;
};

/**
 * Check if Redis is connected
 */
const isRedisConnected = () => {
  return isConnected && client && client.isOpen;
};

/**
 * Set cache with TTL
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds (default: 1 hour)
 */
const setCache = async (key, value, ttl = 3600) => {
  try {
    if (!isRedisConnected()) {
      logger.debug('Redis not connected, skipping cache set');
      return false;
    }

    const serializedValue = JSON.stringify(value);
    await client.setEx(key, ttl, serializedValue);
    
    logger.debug('Cache set successfully', { key, ttl });
    return true;

  } catch (error) {
    logger.error('Error setting cache:', error);
    return false;
  }
};

/**
 * Get cache value
 * @param {string} key - Cache key
 * @returns {any} Cached value or null
 */
const getCache = async (key) => {
  try {
    if (!isRedisConnected()) {
      logger.debug('Redis not connected, skipping cache get');
      return null;
    }

    const value = await client.get(key);
    
    if (value === null) {
      logger.debug('Cache miss', { key });
      return null;
    }

    const parsedValue = JSON.parse(value);
    logger.debug('Cache hit', { key });
    return parsedValue;

  } catch (error) {
    logger.error('Error getting cache:', error);
    return null;
  }
};

/**
 * Delete cache entry
 * @param {string} key - Cache key
 */
const deleteCache = async (key) => {
  try {
    if (!isRedisConnected()) {
      logger.debug('Redis not connected, skipping cache delete');
      return false;
    }

    const result = await client.del(key);
    logger.debug('Cache deleted', { key, existed: result === 1 });
    return result === 1;

  } catch (error) {
    logger.error('Error deleting cache:', error);
    return false;
  }
};

/**
 * Delete multiple cache entries by pattern
 * @param {string} pattern - Redis key pattern (e.g., "user:*")
 */
const deleteCacheByPattern = async (pattern) => {
  try {
    if (!isRedisConnected()) {
      logger.debug('Redis not connected, skipping cache pattern delete');
      return 0;
    }

    const keys = await client.keys(pattern);
    
    if (keys.length === 0) {
      logger.debug('No keys found for pattern', { pattern });
      return 0;
    }

    const result = await client.del(keys);
    logger.info('Cache entries deleted by pattern', { pattern, count: result });
    return result;

  } catch (error) {
    logger.error('Error deleting cache by pattern:', error);
    return 0;
  }
};

/**
 * Check if cache key exists
 * @param {string} key - Cache key
 */
const cacheExists = async (key) => {
  try {
    if (!isRedisConnected()) {
      return false;
    }

    const exists = await client.exists(key);
    return exists === 1;

  } catch (error) {
    logger.error('Error checking cache existence:', error);
    return false;
  }
};

/**
 * Get cache TTL (time to live)
 * @param {string} key - Cache key
 */
const getCacheTTL = async (key) => {
  try {
    if (!isRedisConnected()) {
      return -1;
    }

    const ttl = await client.ttl(key);
    return ttl;

  } catch (error) {
    logger.error('Error getting cache TTL:', error);
    return -1;
  }
};

/**
 * Set hash field
 * @param {string} key - Hash key
 * @param {string} field - Field name
 * @param {any} value - Field value
 * @param {number} ttl - Optional TTL for the hash
 */
const setHash = async (key, field, value, ttl = null) => {
  try {
    if (!isRedisConnected()) {
      return false;
    }

    const serializedValue = JSON.stringify(value);
    await client.hSet(key, field, serializedValue);
    
    if (ttl) {
      await client.expire(key, ttl);
    }
    
    logger.debug('Hash field set', { key, field });
    return true;

  } catch (error) {
    logger.error('Error setting hash field:', error);
    return false;
  }
};

/**
 * Get hash field
 * @param {string} key - Hash key
 * @param {string} field - Field name
 */
const getHash = async (key, field) => {
  try {
    if (!isRedisConnected()) {
      return null;
    }

    const value = await client.hGet(key, field);
    
    if (value === null) {
      return null;
    }

    return JSON.parse(value);

  } catch (error) {
    logger.error('Error getting hash field:', error);
    return null;
  }
};

/**
 * Get all hash fields
 * @param {string} key - Hash key
 */
const getAllHash = async (key) => {
  try {
    if (!isRedisConnected()) {
      return {};
    }

    const hash = await client.hGetAll(key);
    const parsedHash = {};
    
    for (const [field, value] of Object.entries(hash)) {
      parsedHash[field] = JSON.parse(value);
    }
    
    return parsedHash;

  } catch (error) {
    logger.error('Error getting hash:', error);
    return {};
  }
};

/**
 * Increment counter
 * @param {string} key - Counter key
 * @param {number} increment - Amount to increment (default: 1)
 * @param {number} ttl - Optional TTL for the counter
 */
const incrementCounter = async (key, increment = 1, ttl = null) => {
  try {
    if (!isRedisConnected()) {
      return 0;
    }

    const newValue = await client.incrBy(key, increment);
    
    if (ttl && newValue === increment) { // Only set TTL on first increment
      await client.expire(key, ttl);
    }
    
    return newValue;

  } catch (error) {
    logger.error('Error incrementing counter:', error);
    return 0;
  }
};

/**
 * Get Redis info
 */
const getRedisInfo = async () => {
  try {
    if (!isRedisConnected()) {
      return { connected: false, error: 'Not connected to Redis' };
    }

    const info = await client.info();
    const clientInfo = await client.clientInfo();
    
    return {
      connected: true,
      server_info: info,
      client_info: clientInfo,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Error getting Redis info:', error);
    return { connected: false, error: error.message };
  }
};

module.exports = {
  connectRedis,
  disconnectRedis,
  getRedisClient,
  isRedisConnected,
  setCache,
  getCache,
  deleteCache,
  deleteCacheByPattern,
  cacheExists,
  getCacheTTL,
  setHash,
  getHash,
  getAllHash,
  incrementCounter,
  getRedisInfo
};