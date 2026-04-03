const { query, transaction } = require('../config/database');

const BOOKING_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DRIVER_ASSIGNED: 'driver_assigned',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

class BookingModel {
  static STATUS = BOOKING_STATUS;

  static async create({
    customerId, pickupAddress, pickupLat, pickupLng,
    dropAddress, dropLat, dropLng, loadType, loadWeightKg,
    vehicleType, distanceKm, baseFare, distanceFare,
    surgeMultiplier, totalFare, paymentMethod, notes
  }) {
    const result = await query(
      `INSERT INTO bookings (
         customer_id, pickup_address, pickup_lat, pickup_lng,
         drop_address, drop_lat, drop_lng, load_type, load_weight_kg,
         vehicle_type, distance_km, base_fare, distance_fare,
         surge_multiplier, total_fare, payment_method, notes
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        customerId, pickupAddress, pickupLat, pickupLng,
        dropAddress, dropLat, dropLng, loadType, loadWeightKg,
        vehicleType, distanceKm, baseFare, distanceFare,
        surgeMultiplier, totalFare, paymentMethod, notes
      ]
    );
    return result.rows[0];
  }

  static async findById(bookingId) {
    const result = await query(
      `SELECT b.*,
         u.name as customer_name, u.phone as customer_phone,
         du.name as driver_name, du.phone as driver_phone,
         dp.vehicle_number, dp.vehicle_model, dp.rating as driver_rating
       FROM bookings b
       JOIN users u ON b.customer_id = u.id
       LEFT JOIN driver_profiles dp ON b.driver_id = dp.id
       LEFT JOIN users du ON dp.user_id = du.id
       WHERE b.id = $1`,
      [bookingId]
    );
    return result.rows[0] || null;
  }

  static async findByCustomer(customerId, { page = 1, limit = 10, status } = {}) {
    const offset = (page - 1) * limit;
    const conditions = ['b.customer_id = $1'];
    const params = [customerId];

    if (status) {
      params.push(status);
      conditions.push(`b.status = $${params.length}`);
    }

    const where = conditions.join(' AND ');
    const result = await query(
      `SELECT b.*,
         du.name as driver_name, du.phone as driver_phone,
         dp.vehicle_number
       FROM bookings b
       LEFT JOIN driver_profiles dp ON b.driver_id = dp.id
       LEFT JOIN users du ON dp.user_id = du.id
       WHERE ${where}
       ORDER BY b.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM bookings b WHERE ${where}`,
      params
    );

    return {
      bookings: result.rows,
      total: parseInt(countResult.rows[0].count),
    };
  }

  static async findByDriver(driverProfileId, { page = 1, limit = 10, status } = {}) {
    const offset = (page - 1) * limit;
    const conditions = ['b.driver_id = $1'];
    const params = [driverProfileId];

    if (status) {
      params.push(status);
      conditions.push(`b.status = $${params.length}`);
    }

    const where = conditions.join(' AND ');
    const result = await query(
      `SELECT b.*, u.name as customer_name, u.phone as customer_phone
       FROM bookings b
       JOIN users u ON b.customer_id = u.id
       WHERE ${where}
       ORDER BY b.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM bookings b WHERE ${where}`,
      params
    );

    return {
      bookings: result.rows,
      total: parseInt(countResult.rows[0].count),
    };
  }

  static async assignDriver(bookingId, driverProfileId) {
    const result = await query(
      `UPDATE bookings
       SET driver_id = $1, status = $2, accepted_at = NOW(), updated_at = NOW()
       WHERE id = $3 AND status = $4
       RETURNING *`,
      [driverProfileId, BOOKING_STATUS.DRIVER_ASSIGNED, bookingId, BOOKING_STATUS.PENDING]
    );
    return result.rows[0] || null;
  }

  static async updateStatus(bookingId, status, extraFields = {}) {
    const timeMap = {
      [BOOKING_STATUS.PICKED_UP]: 'picked_up_at',
      [BOOKING_STATUS.DELIVERED]: 'delivered_at',
      [BOOKING_STATUS.COMPLETED]: 'completed_at',
      [BOOKING_STATUS.CANCELLED]: 'cancelled_at',
    };

    const timeField = timeMap[status];
    const timeClause = timeField ? `, ${timeField} = NOW()` : '';

    // Build extra fields
    const extraClauses = Object.keys(extraFields)
      .map((k, i) => `, ${k} = $${i + 3}`)
      .join('');
    const extraValues = Object.values(extraFields);

    const result = await query(
      `UPDATE bookings
       SET status = $1, updated_at = NOW()${timeClause}${extraClauses}
       WHERE id = $2
       RETURNING *`,
      [status, bookingId, ...extraValues]
    );
    return result.rows[0] || null;
  }

  static async cancel(bookingId, cancelledBy, reason) {
    const result = await query(
      `UPDATE bookings
       SET status = $1, cancelled_by = $2, cancellation_reason = $3,
           cancelled_at = NOW(), updated_at = NOW()
       WHERE id = $4 AND status NOT IN ('completed', 'cancelled')
       RETURNING *`,
      [BOOKING_STATUS.CANCELLED, cancelledBy, reason, bookingId]
    );
    return result.rows[0] || null;
  }

  static async findPendingNear(vehicleType) {
    const result = await query(
      `SELECT * FROM bookings
       WHERE status = $1 AND vehicle_type = $2
       ORDER BY created_at ASC
       LIMIT 50`,
      [BOOKING_STATUS.PENDING, vehicleType]
    );
    return result.rows;
  }

  static async addRating(bookingId, ratedBy, rating, review) {
    const field = ratedBy === 'customer' ? 'customer_rating' : 'driver_rating_for_customer';
    const reviewField = ratedBy === 'customer' ? 'customer_review' : null;

    let sql = `UPDATE bookings SET ${field} = $1, updated_at = NOW()`;
    const params = [rating];

    if (reviewField && review) {
      params.push(review);
      sql += `, ${reviewField} = $${params.length}`;
    }

    params.push(bookingId);
    sql += ` WHERE id = $${params.length} RETURNING *`;

    const result = await query(sql, params);
    return result.rows[0];
  }
}

module.exports = BookingModel;
