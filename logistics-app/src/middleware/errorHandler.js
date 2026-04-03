const { validationResult } = require('express-validator');
const { errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

// Express-validator error handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(
      res,
      'Validation failed',
      422,
      errors.array().map((e) => ({ field: e.path, message: e.msg }))
    );
  }
  next();
};

// Global error handler
const globalErrorHandler = (err, req, res, next) => {
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  // PostgreSQL errors
  if (err.code === '23505') {
    return errorResponse(res, 'A record with this data already exists', 409);
  }
  if (err.code === '23503') {
    return errorResponse(res, 'Referenced record not found', 400);
  }

  if (err.status) {
    return errorResponse(res, err.message, err.status);
  }

  return errorResponse(res, 'Internal server error', 500);
};

// 404 handler
const notFound = (req, res) => {
  return errorResponse(res, `Route ${req.originalUrl} not found`, 404);
};

module.exports = { validate, globalErrorHandler, notFound };
