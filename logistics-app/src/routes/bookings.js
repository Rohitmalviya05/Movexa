const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');
const { bookingLimiter } = require('../middleware/rateLimiter');

const VEHICLE_TYPES = ['bike', 'auto', 'pickup', 'mini_truck'];
const LOAD_TYPES = ['documents', 'parcel', 'grocery', 'furniture', 'appliances', 'construction', 'other'];
const PAYMENT_METHODS = ['cash', 'upi'];
const DRIVER_STATUSES = ['picked_up', 'in_transit', 'delivered', 'completed'];
const BOOKING_STATUSES = ['pending', 'driver_assigned', 'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled'];

// Fare estimate (public or auth)
router.get('/estimate',
  [
    query('pickup_lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid pickup latitude'),
    query('pickup_lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid pickup longitude'),
    query('drop_lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid drop latitude'),
    query('drop_lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid drop longitude'),
    query('vehicle_type').optional().isIn(VEHICLE_TYPES),
    query('load_weight_kg').optional().isFloat({ min: 0 }),
  ],
  validate,
  bookingController.getEstimate
);

// Vehicle types list
router.get('/vehicle-types', bookingController.getVehicleTypes);

// Customer: create booking
router.post('/',
  authenticate,
  requireRole('customer'),
  bookingLimiter,
  [
    body('pickupAddress').notEmpty().withMessage('Pickup address required'),
    body('pickupLat').isFloat({ min: -90, max: 90 }),
    body('pickupLng').isFloat({ min: -180, max: 180 }),
    body('dropAddress').notEmpty().withMessage('Drop address required'),
    body('dropLat').isFloat({ min: -90, max: 90 }),
    body('dropLng').isFloat({ min: -180, max: 180 }),
    body('loadType').isIn(LOAD_TYPES).withMessage(`Load type must be one of: ${LOAD_TYPES.join(', ')}`),
    body('loadWeightKg').isFloat({ min: 0.1, max: 5000 }).withMessage('Weight must be between 0.1 and 5000 kg'),
    body('vehicleType').isIn(VEHICLE_TYPES).withMessage(`Vehicle type must be one of: ${VEHICLE_TYPES.join(', ')}`),
    body('paymentMethod').isIn(PAYMENT_METHODS).withMessage('Payment method must be cash or upi'),
    body('notes').optional().isLength({ max: 500 }),
  ],
  validate,
  bookingController.createBooking
);

// Customer: my bookings
router.get('/my',
  authenticate,
  requireRole('customer'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('status').optional().isIn(BOOKING_STATUSES),
  ],
  validate,
  bookingController.getMyBookings
);

// Driver: available bookings / driver's bookings
router.get('/driver/my',
  authenticate,
  requireRole('driver'),
  bookingController.getDriverBookings
);

// Driver: accept booking
router.post('/:id/accept',
  authenticate,
  requireRole('driver'),
  bookingController.acceptBooking
);

// Driver: update booking status
router.patch('/:id/status',
  authenticate,
  requireRole('driver'),
  [
    body('status').isIn(DRIVER_STATUSES).withMessage(`Status must be one of: ${DRIVER_STATUSES.join(', ')}`),
  ],
  validate,
  bookingController.updateBookingStatus
);

// Cancel booking (customer or driver)
router.post('/:id/cancel',
  authenticate,
  [body('reason').optional().isLength({ max: 300 })],
  validate,
  bookingController.cancelBooking
);

// Rate a completed booking
router.post('/:id/rate',
  authenticate,
  [
    body('rating').isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('review').optional().isLength({ max: 500 }),
  ],
  validate,
  bookingController.rateBooking
);

// Get single booking
router.get('/:id', authenticate, bookingController.getBookingById);

module.exports = router;
