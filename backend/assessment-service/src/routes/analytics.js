/**
 * Analytics Routes
 * Provides assessment analytics and insights
 */

const express = require('express');
const { getAssessmentStats, getAssessmentsNearLocation } = require('../database/assessmentRepository');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateRequest, validatePagination } = require('../middleware/validation');
const { cacheMiddleware } = require('../middleware/cache');
const logger = require('../utils/logger');
const Joi = require('joi');

const router = express.Router();

/**
 * @route GET /api/analytics
 * @desc Analytics service information
 * @access Public
 */
router.get('/', (req, res) => {
  res.json({
    service: 'AquaHarvest Analytics Service',
    version: '1.0.0',
    description: 'Assessment analytics and reporting endpoints',
    endpoints: {
      'GET /stats': 'Get overall assessment statistics',
      'GET /trends': 'Get assessment trends over time',
      'GET /regional': 'Get regional assessment data',
      'GET /nearby': 'Find assessments near a location'
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * @route GET /api/analytics/stats
 * @desc Get overall assessment statistics
 * @access Public (cached)
 */
router.get('/stats', 
  cacheMiddleware(1800), // 30 minutes cache
  async (req, res) => {
    try {
      const filters = {
        building_type: req.query.building_type,
        date_from: req.query.date_from,
        date_to: req.query.date_to
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => 
        filters[key] === undefined && delete filters[key]
      );

      const stats = await getAssessmentStats(filters);

      res.json({
        success: true,
        message: 'Assessment statistics retrieved successfully',
        data: stats,
        filters_applied: Object.keys(filters).length > 0 ? filters : null,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error retrieving assessment statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route GET /api/analytics/nearby
 * @desc Find assessments near a location
 * @access Public
 */
router.get('/nearby', async (req, res) => {
  try {
    const schema = Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required(),
      radius: Joi.number().min(1).max(100).default(10),
      limit: Joi.number().integer().min(1).max(50).default(20)
    });

    const { error, value } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
        timestamp: new Date().toISOString()
      });
    }

    const { latitude, longitude, radius, limit } = value;

    const nearbyAssessments = await getAssessmentsNearLocation(
      latitude, longitude, radius, limit
    );

    res.json({
      success: true,
      message: 'Nearby assessments retrieved successfully',
      data: {
        center_location: { latitude, longitude },
        search_radius_km: radius,
        assessments: nearbyAssessments,
        count: nearbyAssessments.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error finding nearby assessments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find nearby assessments',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/analytics/trends
 * @desc Get assessment trends over time
 * @access Protected (requires authentication)
 */
router.get('/trends',
  authenticateToken,
  cacheMiddleware(3600), // 1 hour cache
  async (req, res) => {
    try {
      const schema = Joi.object({
        period: Joi.string().valid('week', 'month', 'quarter', 'year').default('month'),
        building_type: Joi.string().valid('residential', 'commercial', 'industrial', 'institutional').optional()
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message),
          timestamp: new Date().toISOString()
        });
      }

      // This would typically involve more complex queries
      // For now, return mock trend data
      const trendData = await generateTrendData(value.period, value.building_type);

      res.json({
        success: true,
        message: 'Assessment trends retrieved successfully',
        data: trendData,
        period: value.period,
        building_type: value.building_type || 'all',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error retrieving assessment trends:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve trends',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route GET /api/analytics/regional
 * @desc Get regional assessment breakdown
 * @access Protected (requires admin role)
 */
router.get('/regional',
  authenticateToken,
  requireRole('admin'),
  cacheMiddleware(7200), // 2 hours cache
  async (req, res) => {
    try {
      // Mock regional data - in production would query by geographic regions
      const regionalData = {
        regions: [
          {
            name: 'North India',
            states: ['Punjab', 'Haryana', 'Uttar Pradesh'],
            assessments_count: 245,
            avg_score: 78.5,
            avg_water_potential: 35000,
            most_common_building_type: 'residential'
          },
          {
            name: 'South India',
            states: ['Tamil Nadu', 'Karnataka', 'Andhra Pradesh', 'Kerala'],
            assessments_count: 412,
            avg_score: 85.2,
            avg_water_potential: 42000,
            most_common_building_type: 'residential'
          },
          {
            name: 'West India',
            states: ['Maharashtra', 'Gujarat', 'Rajasthan'],
            assessments_count: 318,
            avg_score: 72.1,
            avg_water_potential: 28000,
            most_common_building_type: 'commercial'
          },
          {
            name: 'East India',
            states: ['West Bengal', 'Odisha', 'Jharkhand'],
            assessments_count: 189,
            avg_score: 88.7,
            avg_water_potential: 48000,
            most_common_building_type: 'residential'
          }
        ],
        summary: {
          total_assessments: 1164,
          highest_scoring_region: 'East India',
          highest_potential_region: 'East India',
          most_active_region: 'South India'
        }
      };

      res.json({
        success: true,
        message: 'Regional assessment data retrieved successfully',
        data: regionalData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error retrieving regional data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve regional data',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route GET /api/analytics/impact
 * @desc Get environmental impact statistics
 * @access Public (cached)
 */
router.get('/impact',
  cacheMiddleware(1800), // 30 minutes cache
  async (req, res) => {
    try {
      // Mock impact data - would calculate from actual assessments
      const impactData = {
        total_water_potential: 45000000, // liters per year
        total_co2_reduction: 22500, // kg per year
        total_energy_saved: 90000, // kWh per year
        households_benefited: 1164,
        estimated_cost_savings: 1350000, // INR per year
        regional_impact: {
          north: { water_potential: 8575000, households: 245 },
          south: { water_potential: 17304000, households: 412 },
          west: { water_potential: 8904000, households: 318 },
          east: { water_potential: 9072000, households: 189 }
        },
        projections: {
          '5_year': {
            potential_households: 10000,
            water_potential: 387000000,
            co2_reduction: 193500,
            cost_savings: 11600000
          },
          '10_year': {
            potential_households: 25000,
            water_potential: 1087000000,
            co2_reduction: 543500,
            cost_savings: 32500000
          }
        }
      };

      res.json({
        success: true,
        message: 'Environmental impact data retrieved successfully',
        data: impactData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error retrieving impact data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve impact data',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * Helper function to generate trend data
 */
const generateTrendData = async (period, buildingType) => {
  // Mock trend generation - in production would query database
  const now = new Date();
  const periods = [];
  const counts = [];
  const avgScores = [];

  let periodCount;
  let periodName;

  switch (period) {
    case 'week':
      periodCount = 12; // 12 weeks
      periodName = 'week';
      break;
    case 'month':
      periodCount = 12; // 12 months
      periodName = 'month';
      break;
    case 'quarter':
      periodCount = 8; // 8 quarters
      periodName = 'quarter';
      break;
    case 'year':
      periodCount = 5; // 5 years
      periodName = 'year';
      break;
    default:
      periodCount = 12;
      periodName = 'month';
  }

  for (let i = periodCount - 1; i >= 0; i--) {
    const date = new Date(now);
    
    if (period === 'week') {
      date.setDate(date.getDate() - (i * 7));
      periods.push(`Week of ${date.toISOString().split('T')[0]}`);
    } else if (period === 'month') {
      date.setMonth(date.getMonth() - i);
      periods.push(date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }));
    } else if (period === 'quarter') {
      date.setMonth(date.getMonth() - (i * 3));
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      periods.push(`Q${quarter} ${date.getFullYear()}`);
    } else if (period === 'year') {
      date.setFullYear(date.getFullYear() - i);
      periods.push(date.getFullYear().toString());
    }

    // Generate mock data with realistic trends
    const baseCount = buildingType === 'commercial' ? 15 : 25;
    const variation = Math.random() * 20 - 10; // ±10
    counts.push(Math.max(5, Math.round(baseCount + variation + (periodCount - i) * 2)));

    const baseScore = buildingType === 'industrial' ? 65 : 75;
    const scoreVariation = Math.random() * 20 - 10; // ±10
    avgScores.push(Math.round((baseScore + scoreVariation + (periodCount - i) * 1) * 10) / 10);
  }

  return {
    periods,
    metrics: {
      assessment_counts: counts,
      average_scores: avgScores
    },
    summary: {
      total_assessments: counts.reduce((sum, count) => sum + count, 0),
      avg_score_overall: avgScores.reduce((sum, score) => sum + score, 0) / avgScores.length,
      growth_rate: counts.length > 1 ? 
        ((counts[counts.length - 1] - counts[0]) / counts[0] * 100) : 0
    }
  };
};

module.exports = router;