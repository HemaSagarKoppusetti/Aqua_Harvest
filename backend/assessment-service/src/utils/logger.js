/**
 * Winston Logger Configuration
 * Provides structured logging for the assessment service
 */

const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define level colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Apply colors to winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  ),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define which transports the logger must use
const transports = [
  // Console transport
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(
        (info) => {
          // Handle object logging
          if (typeof info.message === 'object') {
            return `${info.timestamp} ${info.level}: ${JSON.stringify(info.message, null, 2)}`;
          }
          return `${info.timestamp} ${info.level}: ${info.message}`;
        }
      )
    )
  }),
  
  // Error log file
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  
  // Combined log file
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  // Do not exit on handled exceptions
  exitOnError: false,
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Handle uncaught exceptions and unhandled rejections
if (process.env.NODE_ENV === 'production') {
  logger.exceptions.handle(
    new winston.transports.File({ 
      filename: path.join(logDir, 'exceptions.log'),
      maxsize: 5242880,
      maxFiles: 3
    })
  );

  logger.rejections.handle(
    new winston.transports.File({ 
      filename: path.join(logDir, 'rejections.log'),
      maxsize: 5242880,
      maxFiles: 3
    })
  );
}

// Export logger with additional methods
module.exports = {
  ...logger,
  
  // Assessment-specific logging methods
  logAssessment: (action, data) => {
    logger.info(`Assessment ${action}`, {
      action,
      assessmentId: data.assessmentId || data.id,
      location: data.location || `${data.latitude}, ${data.longitude}`,
      buildingType: data.buildingType || data.building?.type,
      score: data.overall_score?.overall || data.score,
      timestamp: new Date().toISOString()
    });
  },

  logPerformance: (operation, duration, details = {}) => {
    logger.info(`Performance: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      ...details,
      timestamp: new Date().toISOString()
    });
  },

  logError: (error, context = {}) => {
    logger.error('Application Error', {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  },

  logRequest: (req, res, duration) => {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };

    if (res.statusCode >= 400) {
      logger.warn('HTTP Request Warning', logData);
    } else {
      logger.http('HTTP Request', logData);
    }
  },

  // Database operation logging
  logDbOperation: (operation, table, duration, details = {}) => {
    logger.debug(`Database ${operation}`, {
      operation,
      table,
      duration: `${duration}ms`,
      ...details,
      timestamp: new Date().toISOString()
    });
  },

  // External service logging
  logExternalService: (service, operation, success, duration, details = {}) => {
    const level = success ? 'info' : 'warn';
    logger[level](`External Service: ${service}`, {
      service,
      operation,
      success,
      duration: `${duration}ms`,
      ...details,
      timestamp: new Date().toISOString()
    });
  }
};

// Export raw winston logger for advanced usage
module.exports.winston = winston;