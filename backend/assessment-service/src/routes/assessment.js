/**
 * Assessment API Routes
 * Handles all assessment-related endpoints
 */

const express = require('express');
const Joi = require('joi');

const assessmentService = require('../services/assessmentService');
const logger = require('../utils/logger');
const { validateRequest } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/cache');

const router = express.Router();

// Validation schemas
const assessmentSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required()
    .messages({
      'number.base': 'Latitude must be a number',
      'number.min': 'Latitude must be between -90 and 90',
      'number.max': 'Latitude must be between -90 and 90',
      'any.required': 'Latitude is required'
    }),
  longitude: Joi.number().min(-180).max(180).required()
    .messages({
      'number.base': 'Longitude must be a number',
      'number.min': 'Longitude must be between -180 and 180',
      'number.max': 'Longitude must be between -180 and 180',
      'any.required': 'Longitude is required'
    }),
  address: Joi.string().max(255).optional(),
  buildingType: Joi.string()
    .valid('residential', 'commercial', 'industrial', 'institutional')
    .default('residential')
    .messages({
      'any.only': 'Building type must be one of: residential, commercial, industrial, institutional'
    }),
  roofArea: Joi.number().min(10).max(10000).optional()
    .messages({
      'number.min': 'Roof area must be at least 10 square meters',
      'number.max': 'Roof area cannot exceed 10,000 square meters'
    }),
  roofType: Joi.string()
    .valid('concrete', 'tile', 'metal', 'asbestos', 'green')
    .default('concrete')
    .messages({
      'any.only': 'Roof type must be one of: concrete, tile, metal, asbestos, green'
    }),
  householdSize: Joi.number().integer().min(1).max(50).optional()
    .messages({
      'number.integer': 'Household size must be an integer',
      'number.min': 'Household size must be at least 1',
      'number.max': 'Household size cannot exceed 50'
    }),
  monthlyIncome: Joi.number().min(0).optional()
    .messages({
      'number.min': 'Monthly income must be a positive number'
    }),
  budgetRange: Joi.string()
    .valid('low', 'medium', 'high')
    .default('medium')
    .messages({
      'any.only': 'Budget range must be one of: low, medium, high'
    }),
  timeline: Joi.string()
    .valid('1-3 months', '3-6 months', '6-12 months', '1+ years')
    .default('3-6 months')
    .messages({
      'any.only': 'Timeline must be one of: 1-3 months, 3-6 months, 6-12 months, 1+ years'
    }),
  imageUrl: Joi.string().uri().optional()
    .messages({
      'string.uri': 'Image URL must be a valid URI'
    }),
  floors: Joi.number().integer().min(1).max(50).default(1).optional()
    .messages({
      'number.integer': 'Number of floors must be an integer',
      'number.min': 'Number of floors must be at least 1',
      'number.max': 'Number of floors cannot exceed 50'
    })
});

const listAssessmentsSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(10),
  offset: Joi.number().integer().min(0).default(0),
  sortBy: Joi.string().valid('timestamp', 'score', 'cost').default('timestamp'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * @route POST /api/assessment/create
 * @desc Create a new rainwater harvesting assessment
 * @access Public (can be protected with authentication in production)
 */
router.post('/create', validateRequest(assessmentSchema), async (req, res) => {
  try {
    const startTime = Date.now();
    logger.info('Assessment request received:', {
      location: `${req.body.latitude}, ${req.body.longitude}`,
      buildingType: req.body.buildingType,
      userId: req.user?.id || 'anonymous'
    });

    // Perform assessment
    const assessment = await assessmentService.performAssessment({
      ...req.body,
      userId: req.user?.id,
      userIP: req.ip,
      userAgent: req.get('User-Agent')
    });

    const processingTime = Date.now() - startTime;

    // Log successful assessment
    logger.info('Assessment completed successfully:', {
      assessmentId: assessment.id,
      score: assessment.overall_score?.overall,
      processingTime: `${processingTime}ms`,
      cached: assessment.cached || false
    });

    res.status(201).json({
      success: true,
      message: 'Assessment completed successfully',
      data: assessment,
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Assessment creation failed:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });

    res.status(500).json({
      success: false,
      message: 'Assessment failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/assessment/:id
 * @desc Get assessment by ID
 * @access Public
 */
router.get('/:id', cacheMiddleware(300), async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assessment ID format',
        timestamp: new Date().toISOString()
      });
    }

    const assessment = await assessmentService.getAssessment(id);

    res.json({
      success: true,
      message: 'Assessment retrieved successfully',
      data: assessment,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    if (error.message === 'Assessment not found') {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found',
        timestamp: new Date().toISOString()
      });
    }

    logger.error('Error retrieving assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve assessment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/assessment/user/:userId
 * @desc Get user's assessment history
 * @access Private (requires authentication)
 */
router.get('/user/:userId', 
  authenticateToken, 
  validateRequest(listAssessmentsSchema, 'query'),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit, offset, sortBy, sortOrder } = req.query;

      // Check if user is accessing their own assessments or is admin
      if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own assessments.',
          timestamp: new Date().toISOString()
        });
      }

      const assessments = await assessmentService.getUserAssessments(
        userId, 
        parseInt(limit), 
        parseInt(offset)
      );

      res.json({
        success: true,
        message: 'User assessments retrieved successfully',
        data: assessments,
        meta: {
          userId,
          limit: parseInt(limit),
          offset: parseInt(offset),
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error retrieving user assessments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route POST /api/assessment/quick
 * @desc Quick assessment with minimal inputs
 * @access Public
 */
router.post('/quick', 
  cacheMiddleware(600), // 10 minutes cache for quick assessments
  async (req, res) => {
    try {
      const quickSchema = Joi.object({
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required(),
        buildingType: Joi.string()
          .valid('residential', 'commercial', 'industrial', 'institutional')
          .default('residential'),
        roofArea: Joi.number().min(10).max(10000).optional()
      });

      const { error, value } = quickSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message),
          timestamp: new Date().toISOString()
        });
      }

      // Perform quick assessment with default values
      const assessment = await assessmentService.performAssessment({
        ...value,
        roofType: 'concrete',
        budgetRange: 'medium',
        timeline: '3-6 months'
      });

      // Return simplified response for quick assessment
      const quickResult = {
        id: assessment.id,
        location: assessment.location,
        overall_score: assessment.overall_score,
        water_potential: assessment.steps.waterPotential,
        economic_summary: {
          total_cost: assessment.steps.economics.total_installation_cost,
          annual_savings: assessment.steps.economics.annual_water_savings,
          payback_period: assessment.steps.economics.payback_period_years
        },
        recommendation: assessment.overall_score.recommendation,
        timestamp: assessment.timestamp
      };

      res.json({
        success: true,
        message: 'Quick assessment completed',
        data: quickResult,
        meta: {
          type: 'quick_assessment',
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Quick assessment failed:', error);
      res.status(500).json({
        success: false,
        message: 'Quick assessment failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route GET /api/assessment/compare/:id1/:id2
 * @desc Compare two assessments
 * @access Public
 */
router.get('/compare/:id1/:id2', async (req, res) => {
  try {
    const { id1, id2 } = req.params;

    const [assessment1, assessment2] = await Promise.all([
      assessmentService.getAssessment(id1),
      assessmentService.getAssessment(id2)
    ]);

    const comparison = {
      assessment1: {
        id: assessment1.id,
        location: assessment1.location,
        overall_score: assessment1.overall_score,
        water_potential: assessment1.steps.waterPotential.annual_liters,
        total_cost: assessment1.steps.economics.total_installation_cost,
        payback_period: assessment1.steps.economics.payback_period_years
      },
      assessment2: {
        id: assessment2.id,
        location: assessment2.location,
        overall_score: assessment2.overall_score,
        water_potential: assessment2.steps.waterPotential.annual_liters,
        total_cost: assessment2.steps.economics.total_installation_cost,
        payback_period: assessment2.steps.economics.payback_period_years
      },
      differences: {
        score_difference: assessment1.overall_score.overall - assessment2.overall_score.overall,
        water_potential_difference: assessment1.steps.waterPotential.annual_liters - assessment2.steps.waterPotential.annual_liters,
        cost_difference: assessment1.steps.economics.total_installation_cost - assessment2.steps.economics.total_installation_cost,
        payback_difference: assessment1.steps.economics.payback_period_years - assessment2.steps.economics.payback_period_years
      }
    };

    res.json({
      success: true,
      message: 'Assessment comparison completed',
      data: comparison,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Assessment comparison failed:', error);
    res.status(500).json({
      success: false,
      message: 'Assessment comparison failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/assessment
 * @desc Get assessment service information and endpoints
 * @access Public
 */
router.get('/', (req, res) => {
  res.json({
    service: 'AquaHarvest Assessment Service',
    version: '1.0.0',
    description: 'Comprehensive rainwater harvesting feasibility assessment service',
    endpoints: {
      'POST /create': 'Create new assessment',
      'POST /quick': 'Quick assessment with minimal inputs',
      'GET /:id': 'Get assessment by ID',
      'GET /user/:userId': 'Get user assessment history (requires auth)',
      'GET /compare/:id1/:id2': 'Compare two assessments'
    },
    supported_building_types: ['residential', 'commercial', 'industrial', 'institutional'],
    supported_roof_types: ['concrete', 'tile', 'metal', 'asbestos', 'green'],
    budget_ranges: ['low', 'medium', 'high'],
    timelines: ['1-3 months', '3-6 months', '6-12 months', '1+ years'],
    timestamp: new Date().toISOString()
  });
});

module.exports = router;