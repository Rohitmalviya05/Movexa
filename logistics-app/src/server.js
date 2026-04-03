require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const createApp = require('./app');
const { initSocket } = require('./socket/socketHandler');
const { pool } = require('./config/database');
const { getRedisClient } = require('./config/redis');
const logger = require('./utils/logger');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const PORT = parseInt(process.env.PORT) || 3000;

const start = async () => {
  try {
    // Test DB connection
    await pool.query('SELECT 1');
    logger.info('✅ PostgreSQL connection verified');

    // Test Redis connection (optional)
    try {
      const redis = getRedisClient();
      await redis.ping();
      logger.info('✅ Redis connection verified');
    } catch (redisErr) {
      logger.warn('⚠️ Redis not available, continuing without Redis');
    }

    // Create Express app
    const app = createApp();
    const server = http.createServer(app);

    // Initialize Socket.IO
    const io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    initSocket(io);
    app.set('io', io);

    // Start listening
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
      logger.info(`📋 API docs: http://localhost:${PORT}/api/v1`);
      logger.info(`❤️  Health:   http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await pool.end();
        logger.info('PostgreSQL pool closed');
        const redisClient = getRedisClient();
        await redisClient.quit();
        logger.info('Redis connection closed');
        process.exit(0);
      });
      // Force exit after 10s
      setTimeout(() => process.exit(1), 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection:', reason);
    });

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
      process.exit(1);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
