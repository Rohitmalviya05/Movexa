const jwt = require('jsonwebtoken');
const { cache } = require('../config/redis');
const DriverModel = require('../models/Driver');
const BookingModel = require('../models/Booking');
const logger = require('../utils/logger');

const initSocket = (io) => {
  // Middleware: authenticate socket connections via JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication required'));

      const isBlacklisted = await cache.isTokenBlacklisted(token);
      if (isBlacklisted) return next(new Error('Token revoked'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, role } = socket.user;
    logger.info(`Socket connected: userId=${userId} role=${role} socketId=${socket.id}`);

    // Join personal room for direct messages
    if (role === 'customer') socket.join(`customer:${userId}`);
    if (role === 'driver') socket.join(`driver:${userId}`);

    // ─── Driver Events ──────────────────────────────────────────────

    // Driver sends live location updates
    socket.on('driver:location_update', async ({ lat, lng }) => {
      if (role !== 'driver') return;
      try {
        await DriverModel.updateLocation(userId, lat, lng);
        await cache.setDriverLocation(userId.toString(), lat, lng);

        // Broadcast to customers tracking this driver
        socket.to(`tracking:${userId}`).emit('driver_location_update', {
          driverId: userId, lat, lng, timestamp: new Date(),
        });
      } catch (err) {
        logger.error('Location update error:', err);
      }
    });

    // Driver goes online
    socket.on('driver:go_online', async () => {
      if (role !== 'driver') return;
      try {
        await DriverModel.updateAvailability(userId, true);
        socket.emit('driver:status', { isAvailable: true });
        logger.info(`Driver ${userId} went online`);
      } catch (err) {
        socket.emit('error', { message: 'Failed to update availability' });
      }
    });

    // Driver goes offline
    socket.on('driver:go_offline', async () => {
      if (role !== 'driver') return;
      try {
        await DriverModel.updateAvailability(userId, false);
        await cache.removeDriverLocation(userId.toString());
        socket.emit('driver:status', { isAvailable: false });
        logger.info(`Driver ${userId} went offline`);
      } catch (err) {
        socket.emit('error', { message: 'Failed to update availability' });
      }
    });

    // ─── Customer Events ─────────────────────────────────────────────

    // Customer starts tracking a driver
    socket.on('customer:track_driver', async ({ bookingId }) => {
      if (role !== 'customer') return;
      try {
        const booking = await BookingModel.findById(bookingId);
        if (!booking) return socket.emit('error', { message: 'Booking not found' });
        if (booking.customer_id !== userId) return socket.emit('error', { message: 'Not your booking' });

        if (booking.driver_id) {
          const driver = await DriverModel.findById(booking.driver_id);
          if (driver) {
            // Join room to receive driver's location updates
            socket.join(`tracking:${driver.user_id}`);
            socket.emit('tracking_started', {
              driverId: driver.user_id,
              driverName: driver.name,
              vehicleNumber: driver.vehicle_number,
            });
          }
        }
      } catch (err) {
        socket.emit('error', { message: 'Failed to start tracking' });
      }
    });

    // Customer stops tracking
    socket.on('customer:stop_tracking', ({ driverUserId }) => {
      socket.leave(`tracking:${driverUserId}`);
    });

    // ─── Ping/Heartbeat ──────────────────────────────────────────────

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // ─── Disconnect ──────────────────────────────────────────────────

    socket.on('disconnect', async (reason) => {
      logger.info(`Socket disconnected: userId=${userId} reason=${reason}`);
      // Drivers going offline on disconnect is optional - we rely on heartbeat TTL in Redis
    });

    socket.on('error', (err) => {
      logger.error(`Socket error for user ${userId}:`, err);
    });
  });

  return io;
};

module.exports = { initSocket };
