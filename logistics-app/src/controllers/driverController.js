const DriverModel = require('../models/Driver');
const { cache } = require('../config/redis');
const { successResponse, errorResponse } = require('../utils/response');

const createProfile = async (req, res, next) => {
  try {
    if (req.user.role !== 'driver') return errorResponse(res, 'Only drivers can create a driver profile', 403);
    const existing = await DriverModel.findByUserId(req.user.id);
    if (existing) return errorResponse(res, 'Driver profile already exists', 409);

    const { vehicleType, vehicleNumber, vehicleModel, licenseNumber } = req.body;
    const profile = await DriverModel.createProfile({
      userId: req.user.id, vehicleType, vehicleNumber, vehicleModel, licenseNumber,
    });
    return successResponse(res, { profile }, 'Driver profile created. Awaiting approval.', 201);
  } catch (err) {
    next(err);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const profile = await DriverModel.findByUserId(req.user.id);
    if (!profile) return errorResponse(res, 'Driver profile not found', 404);
    return successResponse(res, { profile });
  } catch (err) {
    next(err);
  }
};

const setAvailability = async (req, res, next) => {
  try {
    const { isAvailable } = req.body;
    const result = await DriverModel.updateAvailability(req.user.id, isAvailable);
    if (!result) return errorResponse(res, 'Driver profile not found', 404);

    // Remove from geo index if going offline
    if (!isAvailable) {
      await cache.removeDriverLocation(req.user.id.toString());
    }

    return successResponse(res, result, `You are now ${isAvailable ? 'online' : 'offline'}`);
  } catch (err) {
    next(err);
  }
};

const updateLocation = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    await DriverModel.updateLocation(req.user.id, lat, lng);
    await cache.setDriverLocation(req.user.id.toString(), lat, lng);

    // Emit updated location to customer tracking the driver
    const io = req.app.get('io');
    if (io) {
      io.to(`tracking:${req.user.id}`).emit('driver_location_update', {
        driverId: req.user.id, lat, lng, timestamp: new Date(),
      });
    }

    return successResponse(res, { lat, lng }, 'Location updated');
  } catch (err) {
    next(err);
  }
};

const getEarnings = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();
    const earnings = await DriverModel.getEarnings(req.user.id, fromDate, toDate);
    return successResponse(res, { earnings, period: { from: fromDate, to: toDate } });
  } catch (err) {
    next(err);
  }
};

// Admin - approve driver
const approveDriver = async (req, res, next) => {
  try {
    const driver = await DriverModel.findByUserId(req.params.userId);
    if (!driver) return errorResponse(res, 'Driver not found', 404);
    await DriverModel.approve(driver.id);
    return successResponse(res, {}, 'Driver approved');
  } catch (err) {
    next(err);
  }
};

module.exports = { createProfile, getProfile, setAvailability, updateLocation, getEarnings, approveDriver };
