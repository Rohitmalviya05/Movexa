const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");

const bookingController = require("../controllers/booking.controller");

// Customer
router.post("/create", auth, role("customer"), bookingController.createBooking);
router.get("/my", auth, role("customer"), bookingController.myBookings);

// Driver
router.post("/driver/online-toggle", auth, role("driver"), bookingController.toggleDriverOnline);
router.get("/driver/current", auth, role("driver"), bookingController.myDriverBooking);
router.get("/available", auth, role("driver"), bookingController.getAvailableBooking);

router.post("/accept/:id", auth, role("driver"), bookingController.acceptBooking);
router.post("/start/:id", auth, role("driver"), bookingController.startDelivery);
router.post("/complete/:id", auth, role("driver"), bookingController.completeDelivery);

module.exports = router;
