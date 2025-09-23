/**
 * Request Validation Middleware
 * Uses Joi for request validation
 */

const Joi = require('joi');
const { ValidationError } = require('./errorHandler');

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema - Joi schema for validation
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
const validateRequest = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Include all errors
      stripUnknown: true, // Remove unknown fields
      convert: true // Type conversion
    });

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message)
        .join(', ');
      
      return next(new ValidationError(errorMessage));
    }

    // Replace the original property with validated/sanitized data
    req[property] = value;
    next();
  };
};

/**
 * Validate query parameters for pagination and sorting
 */
const validatePagination = (req, res, next) => {
  const paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc', 'ASC', 'DESC').default('desc')
  }).unknown(true); // Allow other query parameters

  const { error, value } = paginationSchema.validate(req.query);
  
  if (error) {
    return next(new ValidationError(`Pagination error: ${error.message}`));
  }

  // Calculate offset
  value.offset = (value.page - 1) * value.limit;
  
  req.query = { ...req.query, ...value };
  next();
};

/**
 * Validate geographic coordinates
 */
const validateCoordinates = (latitude, longitude) => {
  const coordSchema = Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required()
  });

  return coordSchema.validate({ latitude, longitude });
};

/**
 * Sanitize input to prevent XSS and injection attacks
 */
const sanitizeInput = (req, res, next) => {
  // Remove potentially dangerous characters
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove HTML tags and scripts
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<[^>]*>?/gm, '')
          .trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

/**
 * Common validation schemas
 */
const commonSchemas = {
  // UUID validation
  uuid: Joi.string().guid({ version: 'uuidv4' }).required(),
  
  // Coordinates validation
  coordinates: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required()
  }),

  // Date range validation
  dateRange: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate'))
  }).with('startDate', 'endDate'),

  // Pagination schema
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  // Assessment-specific schemas
  buildingType: Joi.string().valid('residential', 'commercial', 'industrial', 'institutional'),
  roofType: Joi.string().valid('concrete', 'tile', 'metal', 'asbestos', 'green'),
  budgetRange: Joi.string().valid('low', 'medium', 'high'),
  
  // Common field types
  positiveNumber: Joi.number().positive(),
  percentage: Joi.number().min(0).max(100),
  email: Joi.string().email(),
  phone: Joi.string().pattern(/^[+]?[\d\s\-()]+$/).min(10).max(15)
};

/**
 * Validate file uploads
 */
const validateFileUpload = (options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
    required = false
  } = options;

  return (req, res, next) => {
    if (!req.file && !required) {
      return next();
    }

    if (!req.file && required) {
      return next(new ValidationError('File upload is required'));
    }

    if (req.file.size > maxSize) {
      return next(new ValidationError(`File size must be less than ${maxSize / 1024 / 1024}MB`));
    }

    if (!allowedTypes.includes(req.file.mimetype)) {
      return next(new ValidationError(`File type must be one of: ${allowedTypes.join(', ')}`));
    }

    next();
  };
};

/**
 * Validate assessment parameters
 */
const validateAssessmentParams = (req, res, next) => {
  const schema = Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    buildingType: commonSchemas.buildingType.default('residential'),
    roofType: commonSchemas.roofType.default('concrete'),
    roofArea: Joi.number().min(10).max(10000).when('imageUrl', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.optional()
    }),
    householdSize: Joi.number().integer().min(1).max(50).optional(),
    monthlyIncome: commonSchemas.positiveNumber.optional(),
    budgetRange: commonSchemas.budgetRange.default('medium'),
    timeline: Joi.string().valid('1-3 months', '3-6 months', '6-12 months', '1+ years').default('3-6 months'),
    imageUrl: Joi.string().uri().optional(),
    floors: Joi.number().integer().min(1).max(50).default(1)
  });

  return validateRequest(schema)(req, res, next);
};

/**
 * Validate comparison parameters
 */
const validateComparisonParams = (req, res, next) => {
  const schema = Joi.object({
    id1: commonSchemas.uuid,
    id2: commonSchemas.uuid.invalid(Joi.ref('id1'))
  });

  return validateRequest(schema, 'params')(req, res, next);
};

module.exports = {
  validateRequest,
  validatePagination,
  validateCoordinates,
  sanitizeInput,
  validateFileUpload,
  validateAssessmentParams,
  validateComparisonParams,
  commonSchemas
};