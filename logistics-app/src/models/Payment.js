const { query } = require('../config/database');

const PAYMENT_STATUS = {
  PENDING: 'pending',
  INITIATED: 'initiated',
  SUCCESS: 'success',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

class PaymentModel {
  static STATUS = PAYMENT_STATUS;

  static async create({ bookingId, customerId, amount, paymentMethod, currency = 'INR' }) {
    const result = await query(
      `INSERT INTO payments (booking_id, customer_id, amount, payment_method, currency)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [bookingId, customerId, amount, paymentMethod, currency]
    );
    return result.rows[0];
  }

  static async findByBookingId(bookingId) {
    const result = await query(
      `SELECT * FROM payments WHERE booking_id = $1 ORDER BY created_at DESC`,
      [bookingId]
    );
    return result.rows;
  }

  static async findById(paymentId) {
    const result = await query(
      `SELECT p.*, b.total_fare, b.vehicle_type, b.pickup_address, b.drop_address,
         u.name as customer_name
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       JOIN users u ON p.customer_id = u.id
       WHERE p.id = $1`,
      [paymentId]
    );
    return result.rows[0] || null;
  }

  static async updateStatus(paymentId, status, { transactionId, gatewayResponse, paidAt } = {}) {
    const result = await query(
      `UPDATE payments
       SET status = $1,
           transaction_id = COALESCE($2, transaction_id),
           gateway_response = COALESCE($3, gateway_response),
           paid_at = COALESCE($4, paid_at),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [status, transactionId, gatewayResponse ? JSON.stringify(gatewayResponse) : null, paidAt, paymentId]
    );
    return result.rows[0];
  }

  // Mark cash payment as collected by driver
  static async confirmCashPayment(bookingId) {
    const result = await query(
      `UPDATE payments
       SET status = $1, paid_at = NOW(), updated_at = NOW()
       WHERE booking_id = $2 AND payment_method = 'cash' AND status = 'pending'
       RETURNING *`,
      [PAYMENT_STATUS.SUCCESS, bookingId]
    );
    return result.rows[0];
  }

  // Initiate UPI payment - in production this integrates with Razorpay/PayU
  static async initiateUpi(paymentId, upiId) {
    const mockTransactionRef = `UPI${Date.now()}${Math.floor(Math.random() * 10000)}`;
    const result = await query(
      `UPDATE payments
       SET status = $1, transaction_id = $2,
           gateway_response = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [
        PAYMENT_STATUS.INITIATED,
        mockTransactionRef,
        JSON.stringify({ upiId, transactionRef: mockTransactionRef, initiated: new Date() }),
        paymentId,
      ]
    );
    return {
      payment: result.rows[0],
      transactionRef: mockTransactionRef,
      deepLink: `upi://pay?pa=${upiId}&pn=LogisticsApp&tr=${mockTransactionRef}&am=${result.rows[0]?.amount}&cu=INR`,
    };
  }

  static async getCustomerHistory(customerId, { page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    const result = await query(
      `SELECT p.*, b.pickup_address, b.drop_address, b.vehicle_type
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       WHERE p.customer_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [customerId, limit, offset]
    );
    const countResult = await query(
      `SELECT COUNT(*) FROM payments WHERE customer_id = $1`,
      [customerId]
    );
    return { payments: result.rows, total: parseInt(countResult.rows[0].count) };
  }
}

module.exports = PaymentModel;
