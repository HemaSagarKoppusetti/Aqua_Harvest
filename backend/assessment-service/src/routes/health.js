/**
 * Health Check Routes
 * Provides health monitoring endpoints
 */

const express = require('express');
const { healthCheck, getDbStats } = require('../database/connection');
const { getRedisInfo } = require('../cache/redis');
const { getCacheStats } = require('../middleware/cache');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route GET /health
 * @desc Basic health check
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Basic service health
    const health = {
      status: 'healthy',
      service: 'AquaHarvest Assessment Service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      response_time: Date.now() - startTime
    };

    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'AquaHarvest Assessment Service',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /health/detailed
 * @desc Detailed health check including dependencies
 * @access Public
 */
router.get('/detailed', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Check all dependencies
    const [dbHealth, redisInfo, cacheStats] = await Promise.all([
      healthCheck(),
      getRedisInfo(),
      getCacheStats()
    ]);

    const health = {
      status: 'healthy',
      service: 'AquaHarvest Assessment Service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      response_time: Date.now() - startTime,
      dependencies: {
        database: {
          status: dbHealth.connected ? 'healthy' : 'unhealthy',
          ...dbHealth
        },
        redis: {
          status: redisInfo.connected ? 'healthy' : 'unhealthy',
          ...redisInfo
        },
        cache: cacheStats
      },
      system: {
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        },
        cpu_usage: process.cpuUsage(),
        node_version: process.version,
        platform: process.platform,
        pid: process.pid
      }
    };

    // Determine overall status
    const allHealthy = dbHealth.connected && 
                      (redisInfo.connected || process.env.REDIS_OPTIONAL === 'true');
    
    health.status = allHealthy ? 'healthy' : 'degraded';
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);

  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'AquaHarvest Assessment Service',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /health/database
 * @desc Database-specific health check
 * @access Public
 */
router.get('/database', async (req, res) => {
  try {
    const [dbHealth, dbStats] = await Promise.all([
      healthCheck(),
      getDbStats()
    ]);

    const response = {
      ...dbHealth,
      statistics: dbStats,
      timestamp: new Date().toISOString()
    };

    const statusCode = dbHealth.connected ? 200 : 503;
    res.status(statusCode).json(response);

  } catch (error) {
    logger.error('Database health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /health/cache
 * @desc Cache-specific health check
 * @access Public
 */
router.get('/cache', async (req, res) => {
  try {
    const [redisInfo, cacheStats] = await Promise.all([
      getRedisInfo(),
      getCacheStats()
    ]);

    const response = {
      redis: redisInfo,
      cache_stats: cacheStats,
      timestamp: new Date().toISOString()
    };

    const statusCode = redisInfo.connected ? 200 : 503;
    res.status(statusCode).json(response);

  } catch (error) {
    logger.error('Cache health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /health/liveness
 * @desc Kubernetes liveness probe
 * @access Public
 */
router.get('/liveness', (req, res) => {
  // Simple liveness check - service is running
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route GET /health/readiness
 * @desc Kubernetes readiness probe
 * @access Public
 */
router.get('/readiness', async (req, res) => {
  try {
    // Check if service is ready to handle requests
    const dbHealth = await healthCheck();
    
    if (dbHealth.connected) {
      res.json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        reason: 'Database not connected',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      reason: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;