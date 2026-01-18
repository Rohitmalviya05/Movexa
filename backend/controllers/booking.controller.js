const Booking = require("../models/Booking");
const User = require("../models/User");

// CUSTOMER: Create booking
exports.createBooking = async (req, res) => {
  try {
    const booking = await Booking.create({
      customer: req.user.id,
      ...req.body,
      status: "CREATED",
    });

    res.status(201).json({ message: "Booking created ✅", booking });
  } catch (err) {
    res.status(500).json({ error: "Booking creation failed" });
  }
};

// CUSTOMER: My bookings
exports.myBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ customer: req.user.id }).sort({
      createdAt: -1,
    });

    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
};

// DRIVER: toggle online/offline
exports.toggleDriverOnline = async (req, res) => {
  try {
    const driver = await User.findById(req.user.id);
    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    driver.isOnline = !driver.isOnline;
    await driver.save();

    res.json({ message: "Updated ✅", isOnline: driver.isOnline });
  } catch (err) {
    res.status(500).json({ error: "Failed to update status" });
  }
};

// DRIVER: current booking
exports.myDriverBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      driver: req.user.id,
      status: { $in: ["ASSIGNED", "IN_PROGRESS"] },
    }).sort({ createdAt: -1 });

    if (!booking) return res.json({ booking: null });

    res.json({ booking });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch driver booking" });
  }
};

// DRIVER: available booking (only if online + not busy)
exports.getAvailableBooking = async (req, res) => {
  try {
    const driver = await User.findById(req.user.id);

    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    if (!driver.isOnline) {
      return res.status(403).json({ error: "Driver is offline" });
    }

    const current = await Booking.findOne({
      driver: req.user.id,
      status: { $in: ["ASSIGNED", "IN_PROGRESS"] },
    });

    if (current) {
      return res.status(400).json({
        error: "Finish current booking first",
        booking: current,
      });
    }

    const booking = await Booking.findOne({ status: "CREATED" }).sort({
      createdAt: 1,
    });

    if (!booking) {
      return res.json({ booking: null, message: "No bookings available" });
    }

    res.json({ booking });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch available booking" });
  }
};

// DRIVER: accept
exports.acceptBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking || booking.status !== "CREATED") {
      return res.status(400).json({ error: "Booking not available" });
    }

    booking.driver = req.user.id;
    booking.status = "ASSIGNED";
    await booking.save();

    res.json({ message: "Booking accepted ✅", booking });
  } catch (err) {
    res.status(500).json({ error: "Accept failed" });
  }
};

// DRIVER: start
exports.startDelivery = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking || booking.status !== "ASSIGNED") {
      return res.status(400).json({ error: "Cannot start delivery" });
    }

    if (!booking.driver || booking.driver.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not your booking" });
    }

    booking.status = "IN_PROGRESS";
    await booking.save();

    res.json({ message: "Delivery started ✅", booking });
  } catch (err) {
    res.status(500).json({ error: "Start delivery failed" });
  }
};

// DRIVER: complete
exports.completeDelivery = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking || booking.status !== "IN_PROGRESS") {
      return res.status(400).json({ error: "Cannot complete delivery" });
    }

    if (!booking.driver || booking.driver.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not your booking" });
    }

    booking.status = "COMPLETED";
    await booking.save();

    res.json({ message: "Delivery completed ✅", booking });
  } catch (err) {
    res.status(500).json({ error: "Complete delivery failed" });
  }
};
