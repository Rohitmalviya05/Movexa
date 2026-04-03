/**
 * Database Migration
 * Run: node migrations/migrate.js
 */
require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const { Pool } = require('pg');

const pool = new Pool({
  host: '13.228.184.177',
  port: 5432,
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_Xb9ZzDPjAM1w',
  ssl: { rejectUnauthorized: false },
  options: 'endpoint=ep-silent-meadow-a1252okq-pooler'
});

const migrations = [
  // Extensions
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
  `CREATE EXTENSION IF NOT EXISTS "postgis"`,  // For spatial queries if available

  // ENUM types
  `DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('customer', 'driver', 'admin');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `DO $$ BEGIN
    CREATE TYPE vehicle_type AS ENUM ('bike', 'auto', 'pickup', 'mini_truck');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM (
      'pending', 'accepted', 'driver_assigned', 'picked_up',
      'in_transit', 'delivered', 'completed', 'cancelled'
    );
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'initiated', 'success', 'failed', 'refunded');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('cash', 'upi', 'card', 'wallet');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `DO $$ BEGIN
    CREATE TYPE load_type AS ENUM (
      'documents', 'parcel', 'grocery', 'furniture',
      'appliances', 'construction', 'other'
    );
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // ── Users ────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    phone         VARCHAR(15) NOT NULL UNIQUE,
    email         VARCHAR(150) UNIQUE,
    password_hash TEXT NOT NULL,
    role          user_role NOT NULL DEFAULT 'customer',
    is_verified   BOOLEAN NOT NULL DEFAULT false,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)`,
  `CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role)`,

  // ── Refresh tokens ───────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // ── Driver profiles ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS driver_profiles (
    id                  SERIAL PRIMARY KEY,
    user_id             INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    vehicle_type        vehicle_type NOT NULL,
    vehicle_number      VARCHAR(20) NOT NULL UNIQUE,
    vehicle_model       VARCHAR(80) NOT NULL,
    license_number      VARCHAR(30) NOT NULL UNIQUE,
    is_available        BOOLEAN NOT NULL DEFAULT false,
    is_approved         BOOLEAN NOT NULL DEFAULT false,
    current_booking_id  INT,
    current_lat         DECIMAL(10,8),
    current_lng         DECIMAL(11,8),
    location_updated_at TIMESTAMPTZ,
    rating              DECIMAL(3,2) NOT NULL DEFAULT 5.00,
    total_trips         INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_driver_profiles_user_id      ON driver_profiles(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_driver_profiles_vehicle_type  ON driver_profiles(vehicle_type)`,
  `CREATE INDEX IF NOT EXISTS idx_driver_profiles_is_available  ON driver_profiles(is_available)`,

  // ── Bookings ─────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS bookings (
    id                 SERIAL PRIMARY KEY,
    customer_id        INT NOT NULL REFERENCES users(id),
    driver_id          INT REFERENCES driver_profiles(id),

    -- Locations
    pickup_address     TEXT NOT NULL,
    pickup_lat         DECIMAL(10,8) NOT NULL,
    pickup_lng         DECIMAL(11,8) NOT NULL,
    drop_address       TEXT NOT NULL,
    drop_lat           DECIMAL(10,8) NOT NULL,
    drop_lng           DECIMAL(11,8) NOT NULL,

    -- Load details
    load_type          load_type NOT NULL,
    load_weight_kg     DECIMAL(8,2) NOT NULL,
    vehicle_type       vehicle_type NOT NULL,

    -- Pricing
    distance_km        DECIMAL(8,2) NOT NULL,
    base_fare          DECIMAL(10,2) NOT NULL,
    distance_fare      DECIMAL(10,2) NOT NULL,
    surge_multiplier   DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    total_fare         DECIMAL(10,2) NOT NULL,

    -- Payment
    payment_method     payment_method NOT NULL DEFAULT 'cash',

    -- Status & lifecycle
    status             booking_status NOT NULL DEFAULT 'pending',
    notes              TEXT,
    cancelled_by       VARCHAR(20),
    cancellation_reason TEXT,

    -- Ratings
    customer_rating             DECIMAL(3,2) CHECK (customer_rating BETWEEN 1 AND 5),
    customer_review             TEXT,
    driver_rating_for_customer  DECIMAL(3,2) CHECK (driver_rating_for_customer BETWEEN 1 AND 5),

    -- Timestamps
    accepted_at        TIMESTAMPTZ,
    picked_up_at       TIMESTAMPTZ,
    delivered_at       TIMESTAMPTZ,
    completed_at       TIMESTAMPTZ,
    cancelled_at       TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_bookings_customer_id  ON bookings(customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_driver_id    ON bookings(driver_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_status       ON bookings(status)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_type ON bookings(vehicle_type)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_created_at   ON bookings(created_at DESC)`,

  // Add FK from driver_profiles.current_booking_id -> bookings.id (after bookings table created)
  `DO $$ BEGIN
    ALTER TABLE driver_profiles
      ADD CONSTRAINT fk_current_booking
      FOREIGN KEY (current_booking_id) REFERENCES bookings(id);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // ── Payments ──────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS payments (
    id               SERIAL PRIMARY KEY,
    booking_id       INT NOT NULL REFERENCES bookings(id),
    customer_id      INT NOT NULL REFERENCES users(id),
    amount           DECIMAL(10,2) NOT NULL,
    currency         CHAR(3) NOT NULL DEFAULT 'INR',
    payment_method   payment_method NOT NULL,
    status           payment_status NOT NULL DEFAULT 'pending',
    transaction_id   VARCHAR(100) UNIQUE,
    gateway_response JSONB,
    paid_at          TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_payments_booking_id  ON payments(booking_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_status      ON payments(status)`,

  // ── Audit log (optional but good for production) ─────────────────────
  `CREATE TABLE IF NOT EXISTS audit_log (
    id          SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(id),
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   INT,
    meta        JSONB,
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC)`,

  // ── updated_at trigger function ───────────────────────────────────────
  `CREATE OR REPLACE FUNCTION set_updated_at()
   RETURNS TRIGGER AS $$
   BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
   $$ LANGUAGE plpgsql`,

  `DROP TRIGGER IF EXISTS trg_users_updated_at ON users`,
  `CREATE TRIGGER trg_users_updated_at
   BEFORE UPDATE ON users
   FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,

  `DROP TRIGGER IF EXISTS trg_driver_profiles_updated_at ON driver_profiles`,
  `CREATE TRIGGER trg_driver_profiles_updated_at
   BEFORE UPDATE ON driver_profiles
   FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,

  `DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings`,
  `CREATE TRIGGER trg_bookings_updated_at
   BEFORE UPDATE ON bookings
   FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,

  `DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments`,
  `CREATE TRIGGER trg_payments_updated_at
   BEFORE UPDATE ON payments
   FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
];

async function migrate() {
  const client = await pool.connect();
  console.log('🔧 Running migrations...\n');
  try {
    for (const sql of migrations) {
      const preview = sql.trim().substring(0, 60).replace(/\s+/g, ' ');
      try {
        await client.query(sql);
        console.log(`  ✅ ${preview}...`);
      } catch (err) {
        console.error(`  ❌ FAILED: ${preview}`);
        console.error(`     ${err.message}`);
        throw err;
      }
    }
    console.log('\n✅ All migrations completed successfully!');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('\n💥 Migration failed:', err.message);
  process.exit(1);
});
