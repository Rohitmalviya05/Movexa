const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { apiLimiter } = require('./middleware/rateLimiter');
const { globalErrorHandler, notFound } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Routes
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const driverRoutes = require('./routes/drivers');
const paymentRoutes = require('./routes/payments');

const frontendDistPath = path.resolve(__dirname, '../../logistics-frontend/dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');

const createApp = () => {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Body parsing
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // HTTP logging
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
    skip: (req) => req.url === '/health',
  }));

  // Global rate limiter
  app.use('/api/', apiLimiter);

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'logistics-transport-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // API routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/bookings', bookingRoutes);
  app.use('/api/v1/drivers', driverRoutes);
  app.use('/api/v1/payments', paymentRoutes);

  // API docs placeholder
  app.get('/api/v1', (req, res) => {
    res.json({
      name: 'Logistics Transport API',
      version: '1.0.0',
      endpoints: [
        'POST /api/v1/auth/signup',
        'POST /api/v1/auth/login',
        'POST /api/v1/auth/logout',
        'GET  /api/v1/auth/me',
        'GET  /api/v1/bookings/estimate',
        'GET  /api/v1/bookings/vehicle-types',
        'POST /api/v1/bookings',
        'GET  /api/v1/bookings/my',
        'POST /api/v1/bookings/:id/accept',
        'PATCH /api/v1/bookings/:id/status',
        'POST /api/v1/bookings/:id/cancel',
        'POST /api/v1/bookings/:id/rate',
        'POST /api/v1/drivers/profile',
        'PATCH /api/v1/drivers/availability',
        'POST /api/v1/drivers/location',
        'GET  /api/v1/drivers/earnings',
        'GET  /api/v1/payments/booking/:bookingId',
        'POST /api/v1/payments/upi/initiate',
      ],
    });
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(frontendDistPath));

    app.get(/^\/(?!api|health|socket\.io).*/, (req, res, next) => {
      res.sendFile(frontendIndexPath, (err) => {
        if (err) next(err);
      });
    });
  }

  // 404
  app.use(notFound);

  // Global error handler (must be last)
  app.use(globalErrorHandler);

  return app;
};

module.exports = createApp;
