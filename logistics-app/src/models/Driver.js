const { query } = require('../config/database');

class DriverModel {
  static async createProfile({ userId, vehicleType, vehicleNumber, vehicleModel, licenseNumber }) {
    const result = await query(
      `INSERT INTO driver_profiles
         (user_id, vehicle_type, vehicle_number, vehicle_model, license_number)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, vehicleType, vehicleNumber, vehicleModel, licenseNumber]
    );
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const result = await query(
      `SELECT dp.*, u.name, u.phone, u.email, u.is_verified, u.is_active
       FROM driver_profiles dp
       JOIN users u ON dp.user_id = u.id
       WHERE dp.user_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  static async findById(driverProfileId) {
    const result = await query(
      `SELECT dp.*, u.name, u.phone, u.email
       FROM driver_profiles dp
       JOIN users u ON dp.user_id = u.id
       WHERE dp.id = $1`,
      [driverProfileId]
    );
    return result.rows[0] || null;
  }

  static async updateAvailability(userId, isAvailable) {
    const result = await query(
      `UPDATE driver_profiles
       SET is_available = $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING id, is_available`,
      [isAvailable, userId]
    );
    return result.rows[0];
  }

  static async updateLocation(userId, lat, lng) {
    const result = await query(
      `UPDATE driver_profiles
       SET current_lat = $1, current_lng = $2, location_updated_at = NOW()
       WHERE user_id = $3
       RETURNING id`,
      [lat, lng, userId]
    );
    return result.rows[0];
  }

  static async findAvailableByVehicleType(vehicleType, nearbyDriverIds = []) {
    if (nearbyDriverIds.length === 0) return [];
    const placeholders = nearbyDriverIds.map((_, i) => `$${i + 2}`).join(', ');
    const result = await query(
      `SELECT dp.*, u.name, u.phone
       FROM driver_profiles dp
       JOIN users u ON dp.user_id = u.id
       WHERE dp.vehicle_type = $1
         AND dp.is_available = true
         AND dp.is_approved = true
         AND u.is_active = true
         AND dp.user_id IN (${placeholders})
       ORDER BY dp.rating DESC`,
      [vehicleType, ...nearbyDriverIds]
    );
    return result.rows;
  }

  static async setCurrentBooking(userId, bookingId) {
    await query(
      `UPDATE driver_profiles
       SET current_booking_id = $1, is_available = $2, updated_at = NOW()
       WHERE user_id = $3`,
      [bookingId, bookingId === null, userId]
    );
  }

  static async updateRating(userId, newRating) {
    await query(
      `UPDATE driver_profiles
       SET rating = (rating * total_trips + $1) / (total_trips + 1),
           total_trips = total_trips + 1,
           updated_at = NOW()
       WHERE user_id = $2`,
      [newRating, userId]
    );
  }

  static async getEarnings(userId, fromDate, toDate) {
    const result = await query(
      `SELECT
         COUNT(*) as total_trips,
         SUM(b.total_fare) as total_earnings,
         AVG(b.total_fare) as avg_fare
       FROM bookings b
       JOIN driver_profiles dp ON b.driver_id = dp.id
       WHERE dp.user_id = $1
         AND b.status = 'completed'
         AND b.created_at BETWEEN $2 AND $3`,
      [userId, fromDate, toDate]
    );
    return result.rows[0];
  }

  static async approve(driverProfileId) {
    await query(
      `UPDATE driver_profiles SET is_approved = true, updated_at = NOW() WHERE id = $1`,
      [driverProfileId]
    );
  }
}

module.exports = DriverModel;
