const BookingModel = require('../models/Booking');
const DriverModel = require('../models/Driver');
const PaymentModel = require('../models/Payment');
const { cache } = require('../config/redis');
const { calculateDistance, calculateFare, getSurgeMultiplier } = require('../utils/pricing');
const logger = require('../utils/logger');

class BookingService {
  /**
   * Create a new booking request
   */
  static async createBooking(customerId, {
    pickupAddress, pickupLat, pickupLng,
    dropAddress, dropLat, dropLng,
    loadType, loadWeightKg, vehicleType,
    paymentMethod, notes
  }) {
    // Calculate distance
    const distanceKm = calculateDistance(
      parseFloat(pickupLat), parseFloat(pickupLng),
      parseFloat(dropLat), parseFloat(dropLng)
    );

    if (distanceKm < 0.5) throw { status: 400, message: 'Pickup and drop locations are too close' };

    // Surge pricing
    const surge = await getSurgeMultiplier(pickupLat, pickupLng);

    // Fare calculation
    const fareDetails = calculateFare(vehicleType, distanceKm, surge);

    const booking = await BookingModel.create({
      customerId,
      pickupAddress, pickupLat, pickupLng,
      dropAddress, dropLat, dropLng,
      loadType, loadWeightKg,
      vehicleType,
      distanceKm,
      baseFare: fareDetails.baseFare,
      distanceFare: fareDetails.distanceFare,
      surgeMultiplier: fareDetails.surgeMultiplier,
      totalFare: fareDetails.totalFare,
      paymentMethod,
      notes,
    });

    // Create pending payment record
    await PaymentModel.create({
      bookingId: booking.id,
      customerId,
      amount: fareDetails.totalFare,
      paymentMethod,
    });

    // Cache booking for quick lookup
    await cache.set(`booking:${booking.id}`, booking, 3600);

    logger.info(`Booking created: ${booking.id} by customer: ${customerId}`);

    return { booking, fareDetails };
  }

  /**
   * Get fare estimate before booking
   */
  static async getFareEstimate({ pickupLat, pickupLng, dropLat, dropLng, vehicleType, loadWeightKg }) {
    const distanceKm = calculateDistance(
      parseFloat(pickupLat), parseFloat(pickupLng),
      parseFloat(dropLat), parseFloat(dropLng)
    );

    const surge = await getSurgeMultiplier(pickupLat, pickupLng);
    const fareDetails = calculateFare(vehicleType, distanceKm, surge);

    return { distanceKm, ...fareDetails };
  }

  /**
   * Driver accepts a booking
   */
  static async acceptBooking(bookingId, driverUserId) {
    const driver = await DriverModel.findByUserId(driverUserId);
    if (!driver) throw { status: 404, message: 'Driver profile not found' };
    if (!driver.is_available) throw { status: 400, message: 'You are not available for bookings' };
    if (!driver.is_approved) throw { status: 403, message: 'Driver account not yet approved' };
    if (driver.current_booking_id) throw { status: 400, message: 'You already have an active booking' };

    const updated = await BookingModel.assignDriver(bookingId, driver.id);
    if (!updated) {
      throw { status: 409, message: 'Booking is no longer available (already taken or cancelled)' };
    }

    await DriverModel.setCurrentBooking(driverUserId, bookingId);
    await cache.del(`booking:${bookingId}`);

    return updated;
  }

  /**
   * Update booking lifecycle status
   */
  static async updateStatus(bookingId, driverUserId, newStatus) {
    const driver = await DriverModel.findByUserId(driverUserId);
    if (!driver) throw { status: 404, message: 'Driver not found' };

    const booking = await BookingModel.findById(bookingId);
    if (!booking) throw { status: 404, message: 'Booking not found' };
    if (booking.driver_id !== driver.id) throw { status: 403, message: 'Not your booking' };

    const validTransitions = {
      driver_assigned: ['picked_up', 'cancelled'],
      picked_up: ['in_transit'],
      in_transit: ['delivered'],
      delivered: ['completed'],
    };

    const allowed = validTransitions[booking.status] || [];
    if (!allowed.includes(newStatus)) {
      throw {
        status: 400,
        message: `Cannot transition from '${booking.status}' to '${newStatus}'`,
      };
    }

    const updated = await BookingModel.updateStatus(bookingId, newStatus);

    // On completion, free up driver
    if (newStatus === 'completed') {
      await DriverModel.setCurrentBooking(driverUserId, null);
      // Handle cash payment
      if (booking.payment_method === 'cash') {
        await PaymentModel.confirmCashPayment(bookingId);
      }
    }

    await cache.del(`booking:${bookingId}`);
    return updated;
  }

  /**
   * Cancel booking
   */
  static async cancelBooking(bookingId, userId, role, reason) {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) throw { status: 404, message: 'Booking not found' };

    if (role === 'customer' && booking.customer_id !== userId) {
      throw { status: 403, message: 'Not your booking' };
    }

    const cancelled = await BookingModel.cancel(bookingId, role, reason);
    if (!cancelled) {
      throw { status: 400, message: 'Booking cannot be cancelled in its current state' };
    }

    // Free driver if assigned
    if (booking.driver_id) {
      const driver = await DriverModel.findById(booking.driver_id);
      if (driver) await DriverModel.setCurrentBooking(driver.user_id, null);
    }

    await cache.del(`booking:${bookingId}`);
    return cancelled;
  }

  /**
   * Find and notify nearby drivers
   */
  static async findNearbyDriversForBooking(booking, io) {
    const nearbyFromRedis = await cache.getNearbyDrivers(
      booking.pickup_lat,
      booking.pickup_lng,
      parseFloat(process.env.DRIVER_SEARCH_RADIUS) || 10
    );

    const nearbyDriverUserIds = nearbyFromRedis.map((d) => d.driverId);
    const eligibleDrivers = await DriverModel.findAvailableByVehicleType(
      booking.vehicle_type,
      nearbyDriverUserIds
    );

    // Emit to each eligible driver via socket
    if (io) {
      eligibleDrivers.forEach((driver) => {
        io.to(`driver:${driver.user_id}`).emit('new_booking_request', {
          bookingId: booking.id,
          pickupAddress: booking.pickup_address,
          dropAddress: booking.drop_address,
          distanceKm: booking.distance_km,
          totalFare: booking.total_fare,
          vehicleType: booking.vehicle_type,
          loadType: booking.load_type,
        });
      });
    }

    return eligibleDrivers.length;
  }

  /**
   * Rate a completed booking
   */
  static async rateBooking(bookingId, userId, role, rating, review) {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) throw { status: 404, message: 'Booking not found' };
    if (booking.status !== 'completed') throw { status: 400, message: 'Can only rate completed bookings' };

    if (role === 'customer' && booking.customer_id !== userId) {
      throw { status: 403, message: 'Not your booking' };
    }

    const updated = await BookingModel.addRating(bookingId, role, rating, review);

    if (role === 'customer' && booking.driver_id) {
      const driver = await DriverModel.findById(booking.driver_id);
      if (driver) await DriverModel.updateRating(driver.user_id, rating);
    }

    return updated;
  }
}

module.exports = BookingService;
