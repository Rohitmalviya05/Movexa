const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

const VEHICLE_TYPES = ['bike', 'auto', 'pickup', 'mini_truck'];

// Create driver profile (driver role required)
router.post('/profile',
  authenticate,
  requireRole('driver'),
  [
    body('vehicleType').isIn(VEHICLE_TYPES),
    body('vehicleNumber').trim().notEmpty().toUpperCase().withMessage('Vehicle number required'),
    body('vehicleModel').trim().notEmpty(),
    body('licenseNumber').trim().notEmpty().toUpperCase(),
  ],
  validate,
  driverController.createProfile
);

router.get('/profile', authenticate, requireRole('driver'), driverController.getProfile);

// Toggle availability
router.patch('/availability',
  authenticate,
  requireRole('driver'),
  [body('isAvailable').isBoolean()],
  validate,
  driverController.setAvailability
);

// Update real-time location
router.post('/location',
  authenticate,
  requireRole('driver'),
  [
    body('lat').isFloat({ min: -90, max: 90 }),
    body('lng').isFloat({ min: -180, max: 180 }),
  ],
  validate,
  driverController.updateLocation
);

// Earnings report
router.get('/earnings', authenticate, requireRole('driver'), driverController.getEarnings);

// Admin: approve driver (in production this would be admin-role restricted)
router.patch('/:userId/approve', authenticate, driverController.approveDriver);

module.exports = router;
