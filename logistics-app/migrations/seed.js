/**
 * Seed file — inserts sample data for development/testing
 * Run: node migrations/seed.js
 */
require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: '13.228.184.177',
  port: 5432,
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_Xb9ZzDPjAM1w',
  ssl: { rejectUnauthorized: false },
  options: 'endpoint=ep-silent-meadow-a1252okq-pooler'
});

async function seed() {
  const client = await pool.connect();
  console.log('🌱 Seeding database...\n');

  try {
    const hash = await bcrypt.hash('password123', 12);

    // Customers
    const customers = await client.query(
      `INSERT INTO users (name, phone, email, password_hash, role, is_verified)
       VALUES
         ('Rahul Sharma',  '9876543210', 'rahul@example.com',  $1, 'customer', true),
         ('Priya Patel',   '9876543211', 'priya@example.com',  $1, 'customer', true),
         ('Ankit Mehta',   '9876543212', 'ankit@example.com',  $1, 'customer', true)
       ON CONFLICT (phone) DO NOTHING
       RETURNING id, name`,
      [hash]
    );
    console.log('  ✅ Customers seeded:', customers.rows.map(r => r.name).join(', '));

    // Drivers
    const drivers = await client.query(
      `INSERT INTO users (name, phone, email, password_hash, role, is_verified)
       VALUES
         ('Ramesh Kumar',  '9876543220', 'ramesh@example.com', $1, 'driver', true),
         ('Suresh Yadav',  '9876543221', 'suresh@example.com', $1, 'driver', true),
         ('Vijay Singh',   '9876543222', 'vijay@example.com',  $1, 'driver', true),
         ('Mohan Verma',   '9876543223', 'mohan@example.com',  $1, 'driver', true)
       ON CONFLICT (phone) DO NOTHING
       RETURNING id, name`,
      [hash]
    );
    console.log('  ✅ Drivers seeded:', drivers.rows.map(r => r.name).join(', '));

    // Driver profiles
    if (drivers.rows.length > 0) {
      const driverData = [
        { vehicleType: 'bike',       vehicleNumber: 'MH12AB1234', model: 'Honda Activa 6G',    license: 'MH1220230001' },
        { vehicleType: 'auto',       vehicleNumber: 'MH12CD5678', model: 'Bajaj RE Compact',   license: 'MH1220230002' },
        { vehicleType: 'pickup',     vehicleNumber: 'MH12EF9012', model: 'Tata Ace Gold',      license: 'MH1220230003' },
        { vehicleType: 'mini_truck', vehicleNumber: 'MH12GH3456', model: 'Mahindra Bolero PU', license: 'MH1220230004' },
      ];

      for (let i = 0; i < Math.min(drivers.rows.length, driverData.length); i++) {
        const driver = drivers.rows[i];
        const data = driverData[i];
        await client.query(
          `INSERT INTO driver_profiles
             (user_id, vehicle_type, vehicle_number, vehicle_model, license_number,
              is_available, is_approved, rating, total_trips,
              current_lat, current_lng)
           VALUES ($1,$2,$3,$4,$5, true, true, $6, $7, $8, $9)
           ON CONFLICT (user_id) DO NOTHING`,
          [driver.id, data.vehicleType, data.vehicleNumber, data.model, data.license,
           (4.2 + Math.random() * 0.7).toFixed(2),
           Math.floor(Math.random() * 200),
           // Indore area coordinates
           (22.70 + Math.random() * 0.1).toFixed(6),
           (75.85 + Math.random() * 0.1).toFixed(6)]
        );
      }
      console.log('  ✅ Driver profiles seeded');
    }

    // Sample completed booking
    if (customers.rows.length > 0 && drivers.rows.length > 0) {
      const custId = customers.rows[0]?.id;
      const driverProfile = await client.query(
        `SELECT id FROM driver_profiles WHERE user_id = $1`, [drivers.rows[0]?.id]
      );
      const dpId = driverProfile.rows[0]?.id;

      if (custId && dpId) {
        const booking = await client.query(
          `INSERT INTO bookings (
             customer_id, driver_id, pickup_address, pickup_lat, pickup_lng,
             drop_address, drop_lat, drop_lng, load_type, load_weight_kg,
             vehicle_type, distance_km, base_fare, distance_fare, surge_multiplier,
             total_fare, payment_method, status, customer_rating, customer_review,
             accepted_at, picked_up_at, delivered_at, completed_at
           ) VALUES (
             $1, $2,
             'Vijay Nagar, Indore', 22.7533, 75.8937,
             'Palasia, Indore', 22.7196, 75.8577,
             'parcel', 5.0, 'bike', 4.5, 30, 36, 1.0, 66,
             'cash', 'completed', 4.5, 'Good and fast delivery!',
             NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1.5 hours',
             NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '25 minutes'
           ) ON CONFLICT DO NOTHING RETURNING id`,
          [custId, dpId]
        );

        if (booking.rows[0]) {
          await client.query(
            `INSERT INTO payments (booking_id, customer_id, amount, payment_method, status, paid_at)
             VALUES ($1, $2, 66, 'cash', 'success', NOW() - INTERVAL '25 minutes')`,
            [booking.rows[0].id, custId]
          );
          console.log('  ✅ Sample booking + payment seeded');
        }
      }
    }

    console.log('\n🎉 Seeding complete!\n');
    console.log('📱 Test accounts (password: password123):');
    console.log('   Customer:  9876543210');
    console.log('   Driver:    9876543220 (bike)');
    console.log('   Driver:    9876543221 (auto)');
    console.log('   Driver:    9876543222 (pickup)');
    console.log('   Driver:    9876543223 (mini_truck)');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
