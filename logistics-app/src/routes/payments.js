const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

router.get('/booking/:bookingId', authenticate, paymentController.getPaymentByBooking);

router.post('/upi/initiate',
  authenticate,
  requireRole('customer'),
  [
    body('paymentId').notEmpty(),
    body('upiId').matches(/^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/).withMessage('Enter a valid UPI ID (e.g. name@upi)'),
  ],
  validate,
  paymentController.initiateUpiPayment
);

// Payment gateway webhook (no auth - secured by gateway secret in production)
router.post('/callback', paymentController.paymentCallback);

router.get('/history', authenticate, requireRole('customer'), paymentController.getPaymentHistory);

module.exports = router;
