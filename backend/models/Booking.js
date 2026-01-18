const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    pickup: { type: String, required: true, trim: true },
    drop: { type: String, required: true, trim: true },

    vehicleType: {
      type: String,
      enum: ["bikeParcel", "pickup", "tempo", "miniTruck", "truck"],
      required: true,
    },

    cargoSize: {
      type: String,
      enum: ["small", "medium", "large"],
      default: "small",
    },

    needsHelper: {
      type: Boolean,
      default: false,
    },

    distanceKm: { type: Number, required: true },
    durationMin: { type: Number, required: true },

    fare: { type: Number, required: true },

    status: {
      type: String,
      enum: ["CREATED", "ASSIGNED", "IN_PROGRESS", "COMPLETED"],
      default: "CREATED",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
