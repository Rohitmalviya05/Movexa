const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

// node-fetch for Node 22+
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// Connect DB
connectDB();

const app = express();
app.use(express.json());

/**
 * ✅ CORS FIX (Netlify + Local)
 * IMPORTANT:
 * - Do NOT use "*" with credentials
 * - Keep only ONE cors() middleware
 */
const allowedOrigins = [
  "https://movexaaa.netlify.app",
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://localhost:5173"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Postman etc.
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.options("*", cors());


// ✅ Enable CORS for all requests
app.use(cors(corsOptions));

// ✅ Handle Preflight requests properly
app.options("*", cors(corsOptions));

/* ---------------- ROUTES ---------------- */
const authRoutes = require("./routes/auth.routes");
const bookingRoutes = require("./routes/booking.routes");

app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);

/* ---------------- HEALTH CHECK ---------------- */
app.get("/", (req, res) => {
  res.json({ status: "Movexa Cargo backend running" });
});

/* ---------------- UTILITY: GEO CODING ---------------- */
async function getCoordinates(place) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    place
  )}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.length) throw new Error("Location not found");

  return { lat: data[0].lat, lon: data[0].lon };
}

/* ---------------- FARE API ---------------- */
app.post("/api/route-fare", async (req, res) => {
  try {
    const {
      pickup,
      drop,
      vehicleType,
      cargoSize = "small",
      needsHelper = false,
    } = req.body;

    if (!pickup || !drop || !vehicleType) {
      return res.status(400).json({ error: "Missing data" });
    }

    const pricing = {
      bikeParcel: { base: 20, perKm: 6 },
      pickup: { base: 80, perKm: 12 },
      tempo: { base: 120, perKm: 18 },
      miniTruck: { base: 180, perKm: 25 },
      truck: { base: 300, perKm: 35 },
    };

    const cargoMultipliers = {
      small: 1.0,
      medium: 1.15,
      large: 1.35,
    };

    if (!pricing[vehicleType]) {
      return res.status(400).json({ error: "Invalid vehicle type" });
    }

    if (!cargoMultipliers[cargoSize]) {
      return res.status(400).json({ error: "Invalid cargo size" });
    }

    const start = await getCoordinates(pickup);
    const end = await getCoordinates(drop);

    const routeURL = `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=false`;
    const routeRes = await fetch(routeURL);
    const routeData = await routeRes.json();

    if (!routeData.routes || !routeData.routes.length) {
      throw new Error("Route not found");
    }

    const distanceKm = routeData.routes[0].distance / 1000;
    const durationMin = routeData.routes[0].duration / 60;

    const baseFare = pricing[vehicleType].base + pricing[vehicleType].perKm * distanceKm;
    const helperFee = needsHelper ? 150 : 0;
    const fare = baseFare * cargoMultipliers[cargoSize] + helperFee;

    res.json({
      pickup,
      drop,
      vehicleType,
      cargoSize,
      needsHelper,
      distanceKm: Number(distanceKm.toFixed(2)),
      durationMin: Number(durationMin.toFixed(1)),
      fare: Math.round(fare),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- START SERVER ---------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Movexa Cargo running on port ${PORT}`));
