const rateLimit = require('express-rate-limit');
const { errorResponse } = require('../utils/response');

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => errorResponse(res, message, 429),
  });

const authLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  20,
  'Too many auth attempts. Please try again after 15 minutes.'
);

const apiLimiter = createLimiter(
  60 * 1000, // 1 minute
  100,
  'Too many requests. Please slow down.'
);

const bookingLimiter = createLimiter(
  60 * 1000,
  10,
  'Too many booking requests. Please wait a moment.'
);

module.exports = { authLimiter, apiLimiter, bookingLimiter };
