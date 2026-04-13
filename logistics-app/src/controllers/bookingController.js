const BookingService = require('../services/bookingService');
const BookingModel = require('../models/Booking');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { calculateDistance, calculateFare, getEligibleVehicles, getSurgeMultiplier, VEHICLE_TYPES } = require('../utils/pricing');
const logger = require('../utils/logger');

const getEstimate = async (req, res, next) => {
  try {
    const { pickup_lat, pickup_lng, drop_lat, drop_lng, vehicle_type, load_weight_kg } = req.query;

    const distanceKm = calculateDistance(
      parseFloat(pickup_lat), parseFloat(pickup_lng),
      parseFloat(drop_lat), parseFloat(drop_lng)
    );

    const surge = await getSurgeMultiplier(pickup_lat, pickup_lng);

    // If specific vehicle requested
    if (vehicle_type) {
      const fare = calculateFare(vehicle_type, distanceKm, surge);
      return successResponse(res, { distanceKm, vehicleType: vehicle_type, ...fare });
    }

    // Return estimates for all eligible vehicles
    const weight = parseFloat(load_weight_kg) || 0;
    const eligible = getEligibleVehicles(weight);
    const estimates = eligible.map((v) => ({
      vehicleType: v.type,
      label: v.label,
      description: v.description,
      maxWeightKg: v.maxWeightKg,
      distanceKm,
      ...calculateFare(v.type, distanceKm, surge),
    }));

    return successResponse(res, { distanceKm, surgeMultiplier: surge, estimates });
  } catch (err) {
    if (err.message?.includes('Unknown vehicle type')) {
      return errorResponse(res, err.message, 400);
    }
    next(err);
  }
};

const getVehicleTypes = async (req, res) => {
  const types = Object.values(VEHICLE_TYPES).map(({ type, label, description, maxWeightKg, maxVolumeCubicFt }) => ({
    type, label, description, maxWeightKg, maxVolumeCubicFt,
  }));
  return successResponse(res, { vehicleTypes: types });
};

const createBooking = async (req, res, next) => {
  try {
    logger.info('createBooking called with user:', req.user.id);
    logger.info('Request body:', req.body);
    const result = await BookingService.createBooking(req.user.id, req.body);
    logger.info('Booking created successfully, result:', result);

    // Notify nearby drivers via socket
    const io = req.app.get('io');
    if (io) {
      BookingService.findNearbyDriversForBooking(result.booking, io).catch(() => {});
    }

    return successResponse(res, result, 'Booking created successfully', 201);
  } catch (err) {
    logger.error('createBooking error:', err);
    if (err.status) return errorResponse(res, err.message, err.status);
    next(err);
  }
};

const getMyBookings = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const { bookings, total } = await BookingModel.findByCustomer(req.user.id, {
      page: parseInt(page), limit: parseInt(limit), status
    });
    return paginatedResponse(res, bookings, total, page, limit);
  } catch (err) {
    next(err);
  }
};

const getBookingById = async (req, res, next) => {
  try {
    const booking = await BookingModel.findById(req.params.id);
    if (!booking) return errorResponse(res, 'Booking not found', 404);

    // Authorization: customer owns it, or driver is assigned to it
    const user = req.user;
    const isCustomer = booking.customer_id === user.id;
    const isAssignedDriver = user.role === 'driver'; // driver check via driver_id done in service
    if (!isCustomer && !isAssignedDriver) {
      return errorResponse(res, 'Access denied', 403);
    }

    return successResponse(res, { booking });
  } catch (err) {
    next(err);
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const cancelled = await BookingService.cancelBooking(
      req.params.id, req.user.id, req.user.role, reason || 'Cancelled by user'
    );
    return successResponse(res, { booking: cancelled }, 'Booking cancelled');
  } catch (err) {
    if (err.status) return errorResponse(res, err.message, err.status);
    next(err);
  }
};

const rateBooking = async (req, res, next) => {
  try {
    const { rating, review } = req.body;
    const updated = await BookingService.rateBooking(
      req.params.id, req.user.id, req.user.role, rating, review
    );
    return successResponse(res, { booking: updated }, 'Rating submitted');
  } catch (err) {
    if (err.status) return errorResponse(res, err.message, err.status);
    next(err);
  }
};

// Driver-specific controllers
const getDriverBookings = async (req, res, next) => {
  try {
    const DriverModel = require('../models/Driver');
    const driver = await DriverModel.findByUserId(req.user.id);
    if (!driver) return errorResponse(res, 'Driver profile not found', 404);

    const { page = 1, limit = 10, status } = req.query;
    const { bookings, total } = await BookingModel.findByDriver(driver.id, {
      page: parseInt(page), limit: parseInt(limit), status
    });
    return paginatedResponse(res, bookings, total, page, limit);
  } catch (err) {
    next(err);
  }
};

const acceptBooking = async (req, res, next) => {
  try {
    const booking = await BookingService.acceptBooking(req.params.id, req.user.id);
    const io = req.app.get('io');
    if (io) {
      io.to(`customer:${booking.customer_id}`).emit('booking_accepted', {
        bookingId: booking.id,
        message: 'A driver has accepted your booking',
      });
    }
    return successResponse(res, { booking }, 'Booking accepted');
  } catch (err) {
    if (err.status) return errorResponse(res, err.message, err.status);
    next(err);
  }
};

const updateBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const updated = await BookingService.updateStatus(req.params.id, req.user.id, status);

    const io = req.app.get('io');
    if (io) {
      io.to(`customer:${updated.customer_id}`).emit('booking_status_updated', {
        bookingId: updated.id,
        status: updated.status,
      });
    }

    return successResponse(res, { booking: updated }, `Status updated to ${status}`);
  } catch (err) {
    if (err.status) return errorResponse(res, err.message, err.status);
    next(err);
  }
};

module.exports = {
  getEstimate, getVehicleTypes, createBooking,
  getMyBookings, getBookingById, cancelBooking, rateBooking,
  getDriverBookings, acceptBooking, updateBookingStatus,
};
