const PaymentModel = require('../models/Payment');
const BookingModel = require('../models/Booking');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const getPaymentByBooking = async (req, res, next) => {
  try {
    const booking = await BookingModel.findById(req.params.bookingId);
    if (!booking) return errorResponse(res, 'Booking not found', 404);
    if (booking.customer_id !== req.user.id && req.user.role === 'customer') {
      return errorResponse(res, 'Access denied', 403);
    }
    const payments = await PaymentModel.findByBookingId(req.params.bookingId);
    return successResponse(res, { payments });
  } catch (err) {
    next(err);
  }
};

const initiateUpiPayment = async (req, res, next) => {
  try {
    const { paymentId, upiId } = req.body;
    const payment = await PaymentModel.findById(paymentId);
    if (!payment) return errorResponse(res, 'Payment not found', 404);
    if (payment.customer_id !== req.user.id) return errorResponse(res, 'Access denied', 403);
    if (payment.status === 'success') return errorResponse(res, 'Payment already completed', 400);

    const result = await PaymentModel.initiateUpi(paymentId, upiId);
    return successResponse(res, result, 'UPI payment initiated');
  } catch (err) {
    next(err);
  }
};

// Webhook / callback from payment gateway (simulate)
const paymentCallback = async (req, res, next) => {
  try {
    const { paymentId, transactionId, status, gatewayResponse } = req.body;
    const newStatus = status === 'SUCCESS'
      ? PaymentModel.STATUS.SUCCESS
      : PaymentModel.STATUS.FAILED;

    const updated = await PaymentModel.updateStatus(paymentId, newStatus, {
      transactionId,
      gatewayResponse,
      paidAt: status === 'SUCCESS' ? new Date() : null,
    });

    // Notify customer via socket
    if (status === 'SUCCESS' && updated) {
      const io = req.app.get('io');
      if (io) {
        io.to(`customer:${updated.customer_id}`).emit('payment_success', {
          paymentId: updated.id,
          bookingId: updated.booking_id,
          amount: updated.amount,
        });
      }
    }

    return successResponse(res, { payment: updated }, 'Payment status updated');
  } catch (err) {
    next(err);
  }
};

const getPaymentHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const { payments, total } = await PaymentModel.getCustomerHistory(req.user.id, {
      page: parseInt(page), limit: parseInt(limit),
    });
    return paginatedResponse(res, payments, total, page, limit);
  } catch (err) {
    next(err);
  }
};

module.exports = { getPaymentByBooking, initiateUpiPayment, paymentCallback, getPaymentHistory };
