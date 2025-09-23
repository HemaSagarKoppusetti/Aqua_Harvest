/**
 * Cache Middleware
 * Redis-based caching for API responses
 */

const { getCache, setCache } = require('../cache/redis');
const logger = require('../utils/logger');

/**
 * Cache middleware factory
 * @param {number} ttl - Time to live in seconds
 * @param {function} keyGenerator - Function to generate cache key
 * @returns {Function} Express middleware function
 */
const cacheMiddleware = (ttl = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    try {
      // Generate cache key
      let cacheKey;
      if (keyGenerator && typeof keyGenerator === 'function') {
        cacheKey = keyGenerator(req);
      } else {
        // Default key generation
        const baseKey = `${req.method}:${req.originalUrl}`;
        const queryString = Object.keys(req.query).length > 0 
          ? `:${JSON.stringify(req.query)}`
          : '';
        const bodyString = req.method !== 'GET' && req.body 
          ? `:${JSON.stringify(req.body)}`
          : '';
        cacheKey = `${baseKey}${queryString}${bodyString}`;
      }

      // Try to get from cache
      const cachedResult = await getCache(cacheKey);
      
      if (cachedResult) {
        logger.debug('Cache hit', { cacheKey, url: req.originalUrl });
        return res.json({
          ...cachedResult,
          cached: true,
          cache_timestamp: new Date().toISOString()
        });
      }

      // Cache miss - proceed with request
      logger.debug('Cache miss', { cacheKey, url: req.originalUrl });

      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(body) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          setCache(cacheKey, body, ttl).catch(err => {
            logger.warn('Failed to set cache:', err);
          });
        }
        
        // Call original json method
        return originalJson.call(this, body);
      };

      next();

    } catch (error) {
      logger.warn('Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
};

/**
 * Clear cache by pattern
 */
const clearCache = async (pattern) => {
  try {
    const redis = require('../cache/redis').getRedisClient();
    if (!redis) {
      logger.warn('Redis client not available for cache clearing');
      return false;
    }

    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
      logger.info(`Cleared ${keys.length} cache entries matching pattern: ${pattern}`);
    }
    return true;
  } catch (error) {
    logger.error('Error clearing cache:', error);
    return false;
  }
};

/**
 * Cache invalidation middleware
 * Clears related cache entries after write operations
 */
const invalidateCache = (patterns = []) => {
  return async (req, res, next) => {
    // Store original end method
    const originalEnd = res.end;
    
    res.end = async function(...args) {
      // Call original end method
      originalEnd.apply(this, args);
      
      // Clear cache if response was successful
      if (res.statusCode >= 200 && res.statusCode < 300) {
        for (const pattern of patterns) {
          try {
            await clearCache(pattern);
          } catch (error) {
            logger.warn(`Failed to clear cache pattern ${pattern}:`, error);
          }
        }
      }
    };

    next();
  };
};

/**
 * Assessment-specific cache key generators
 */
const assessmentCacheKeyGenerator = (req) => {
  const { latitude, longitude, buildingType, roofArea } = req.body || req.query;
  return `assessment:${latitude}_${longitude}_${buildingType}_${roofArea || 'auto'}`;
};

const userAssessmentCacheKeyGenerator = (req) => {
  const { userId } = req.params;
  const { limit, offset } = req.query;
  return `user_assessments:${userId}_${limit}_${offset}`;
};

/**
 * Cache warming functionality
 */
const warmCache = async (cacheEntries) => {
  try {
    const promises = cacheEntries.map(async ({ key, value, ttl = 3600 }) => {
      await setCache(key, value, ttl);
    });
    
    await Promise.all(promises);
    logger.info(`Warmed ${cacheEntries.length} cache entries`);
    return true;
  } catch (error) {
    logger.error('Cache warming failed:', error);
    return false;
  }
};

/**
 * Get cache statistics
 */
const getCacheStats = async () => {
  try {
    const redis = require('../cache/redis').getRedisClient();
    if (!redis) {
      return { available: false };
    }

    const info = await redis.info('memory');
    const keyspace = await redis.info('keyspace');
    
    return {
      available: true,
      memory_usage: info,
      keyspace_info: keyspace,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error getting cache stats:', error);
    return { available: false, error: error.message };
  }
};

module.exports = {
  cacheMiddleware,
  clearCache,
  invalidateCache,
  assessmentCacheKeyGenerator,
  userAssessmentCacheKeyGenerator,
  warmCache,
  getCacheStats
};