# 🚛 Logistics Transport App — Backend

A scalable Node.js/Express backend for a logistics and transportation platform (Uber-style for goods delivery). Supports bikes, autos, pickup trucks, and mini trucks.

---

## 🏗️ Architecture

```
src/
├── config/
│   ├── database.js       # PostgreSQL pool + transaction helper
│   └── redis.js          # Redis client, cache utils, driver geo-tracking
├── controllers/
│   ├── authController.js
│   ├── bookingController.js
│   ├── driverController.js
│   └── paymentController.js
├── middleware/
│   ├── auth.js           # JWT authenticate, requireRole, optionalAuth
│   ├── errorHandler.js   # Validation errors, global handler, 404
│   └── rateLimiter.js    # Per-route rate limiting
├── models/
│   ├── User.js
│   ├── Driver.js
│   ├── Booking.js
│   └── Payment.js
├── routes/
│   ├── auth.js
│   ├── bookings.js
│   ├── drivers.js
│   └── payments.js
├── services/
│   ├── authService.js    # JWT generation, signup, login
│   └── bookingService.js # Core booking logic, driver matching
├── socket/
│   └── socketHandler.js  # Socket.IO real-time events
├── utils/
│   ├── logger.js         # Winston logger
│   ├── pricing.js        # Haversine distance + fare calculation
│   └── response.js       # Standardized API responses
├── app.js                # Express app factory
└── server.js             # Entry point: HTTP + Socket.IO
migrations/
├── migrate.js            # Create all tables + indexes
└── seed.js               # Sample data for development
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### 1. Clone & Install

```bash
git clone <repo>
cd logistics-transport-app
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your DB/Redis credentials
```

### 3. Setup Database

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE logistics_db;"

# Run migrations
npm run migrate

# Seed sample data
npm run seed
```

### 4. Start Server

```bash
npm run dev   # Development with nodemon
npm start     # Production
```

---

## 📡 API Reference

All responses follow this structure:
```json
{
  "success": true,
  "message": "...",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 🔐 Authentication

#### POST `/api/v1/auth/signup`
```json
{
  "name": "Rahul Sharma",
  "phone": "9876543210",
  "email": "rahul@example.com",
  "password": "password123",
  "role": "customer"
}
```

#### POST `/api/v1/auth/login`
```json
{ "phone": "9876543210", "password": "password123" }
```

Response:
```json
{
  "user": { "id": 1, "name": "Rahul", "role": "customer" },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

#### POST `/api/v1/auth/refresh`
```json
{ "refreshToken": "eyJ..." }
```

#### POST `/api/v1/auth/logout` 🔒
#### GET  `/api/v1/auth/me` 🔒
#### PATCH `/api/v1/auth/profile` 🔒
#### POST `/api/v1/auth/change-password` 🔒

---

### 📦 Bookings

#### GET `/api/v1/bookings/estimate`
```
?pickup_lat=22.75&pickup_lng=75.89&drop_lat=22.71&drop_lng=75.85
&vehicle_type=bike&load_weight_kg=5
```

Response:
```json
{
  "distanceKm": 4.5,
  "baseFare": 30,
  "distanceFare": 36,
  "totalFare": 66,
  "breakdown": {
    "base": "₹30 (base fare)",
    "distance": "₹8/km × 4.5km = ₹36",
    "surge": "No surge",
    "total": "₹66"
  }
}
```

#### GET `/api/v1/bookings/vehicle-types`

#### POST `/api/v1/bookings` 🔒 (customer)
```json
{
  "pickupAddress": "Vijay Nagar, Indore",
  "pickupLat": 22.7533,
  "pickupLng": 75.8937,
  "dropAddress": "Palasia, Indore",
  "dropLat": 22.7196,
  "dropLng": 75.8577,
  "loadType": "parcel",
  "loadWeightKg": 5,
  "vehicleType": "bike",
  "paymentMethod": "upi",
  "notes": "Please handle with care"
}
```

#### GET `/api/v1/bookings/my` 🔒 (customer)
```
?page=1&limit=10&status=completed
```

#### GET `/api/v1/bookings/:id` 🔒

#### POST `/api/v1/bookings/:id/accept` 🔒 (driver)

#### PATCH `/api/v1/bookings/:id/status` 🔒 (driver)
```json
{ "status": "picked_up" }
```
Status flow: `driver_assigned` → `picked_up` → `in_transit` → `delivered` → `completed`

#### POST `/api/v1/bookings/:id/cancel` 🔒
```json
{ "reason": "Changed my mind" }
```

#### POST `/api/v1/bookings/:id/rate` 🔒
```json
{ "rating": 4.5, "review": "Fast delivery!" }
```

#### GET `/api/v1/bookings/driver/my` 🔒 (driver)

---

### 🚗 Drivers

#### POST `/api/v1/drivers/profile` 🔒 (driver)
```json
{
  "vehicleType": "bike",
  "vehicleNumber": "MH12AB1234",
  "vehicleModel": "Honda Activa 6G",
  "licenseNumber": "MH1220230001"
}
```

#### GET `/api/v1/drivers/profile` 🔒 (driver)

#### PATCH `/api/v1/drivers/availability` 🔒 (driver)
```json
{ "isAvailable": true }
```

#### POST `/api/v1/drivers/location` 🔒 (driver)
```json
{ "lat": 22.7533, "lng": 75.8937 }
```

#### GET `/api/v1/drivers/earnings` 🔒 (driver)
```
?from=2024-01-01&to=2024-12-31
```

---

### 💳 Payments

#### GET `/api/v1/payments/booking/:bookingId` 🔒
#### POST `/api/v1/payments/upi/initiate` 🔒 (customer)
```json
{ "paymentId": 1, "upiId": "name@upi" }
```

#### POST `/api/v1/payments/callback` (payment gateway webhook)
```json
{
  "paymentId": 1,
  "transactionId": "TXN123456",
  "status": "SUCCESS",
  "gatewayResponse": { ... }
}
```

#### GET `/api/v1/payments/history` 🔒 (customer)

---

## 🔌 WebSocket Events

Connect with JWT:
```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'eyJ...' }
});
```

### Driver → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `driver:go_online` | — | Mark driver available |
| `driver:go_offline` | — | Mark driver unavailable |
| `driver:location_update` | `{ lat, lng }` | Send live location |

### Customer → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `customer:track_driver` | `{ bookingId }` | Start tracking driver |
| `customer:stop_tracking` | `{ driverUserId }` | Stop tracking |
| `ping` | — | Heartbeat |

### Server → Client
| Event | Payload | Recipient |
|-------|---------|-----------|
| `new_booking_request` | booking details | Driver |
| `booking_accepted` | `{ bookingId }` | Customer |
| `booking_status_updated` | `{ bookingId, status }` | Customer |
| `driver_location_update` | `{ driverId, lat, lng }` | Tracking customer |
| `payment_success` | `{ paymentId, amount }` | Customer |

---

## 🚗 Vehicle Types & Pricing

| Vehicle | Max Load | Base Fare | Per KM |
|---------|----------|-----------|--------|
| Bike | 20 kg | ₹30 | ₹8 |
| Auto | 100 kg | ₹50 | ₹12 |
| Pickup Truck | 750 kg | ₹100 | ₹20 |
| Mini Truck | 2000 kg | ₹200 | ₹35 |

Pricing is configurable via environment variables.

---

## 🗄️ Database Schema

**Core tables:** `users`, `driver_profiles`, `bookings`, `payments`, `refresh_tokens`, `audit_log`

**Key design decisions:**
- Normalized schema — no data duplication
- ENUM types for status fields
- Partial indexes for performance
- `updated_at` auto-trigger on all tables
- FK constraints with ON DELETE CASCADE
- JSONB for flexible gateway responses

---

## 🔒 Security Features

- **JWT** access tokens (7d) + refresh tokens (30d)
- **Token blacklisting** via Redis on logout
- **bcrypt** password hashing (12 rounds)
- **Helmet** security headers
- **CORS** configuration
- **Rate limiting**: auth (20/15min), API (100/min), bookings (10/min)
- **Input validation** via express-validator on all routes
- Role-based access control (customer / driver)

---

## 📝 Test Accounts (after seeding)

Password for all accounts: `password123`

| Role | Phone | Vehicle |
|------|-------|---------|
| Customer | 9876543210 | — |
| Customer | 9876543211 | — |
| Driver | 9876543220 | Bike |
| Driver | 9876543221 | Auto |
| Driver | 9876543222 | Pickup |
| Driver | 9876543223 | Mini Truck |
