const jwt = require('jsonwebtoken');
const { cache } = require('../config/redis');
const { errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Access token required', 401);
    }

    const token = authHeader.split(' ')[1];

    // Check if token is blacklisted
    const isBlacklisted = await cache.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return errorResponse(res, 'Token has been revoked. Please login again.', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token expired', 401);
    }
    if (err.name === 'JsonWebTokenError') {
      return errorResponse(res, 'Invalid token', 401);
    }
    logger.error('Auth middleware error:', err);
    return errorResponse(res, 'Authentication failed', 500);
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401);
    }
    if (!roles.includes(req.user.role)) {
      return errorResponse(res, `Access restricted to: ${roles.join(', ')}`, 403);
    }
    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const isBlacklisted = await cache.isTokenBlacklisted(token);
      if (!isBlacklisted) {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        req.token = token;
      }
    }
    next();
  } catch {
    next(); // Continue without auth
  }
};

module.exports = { authenticate, requireRole, optionalAuth };
