import bcrypt from 'bcryptjs';
import { db, initDatabase } from './database.js';

export function runSeed() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    console.error('\n⚠️  SECURITY BLOCKED: Refusing to seed database in production mode!');
    console.error('    Seeding in production wipes existing data and inserts known demo credentials.');
    console.error('    If you explicitly intend to reset production data, set ALLOW_PRODUCTION_SEED=true.\n');
    return;
  }

  initDatabase();

  console.log('[Seed] Seeding database with realistic demo data in INR...');

  // Clear existing data
  db.exec(`
    DELETE FROM locker_access_logs;
    DELETE FROM payments;
    DELETE FROM qr_tokens;
    DELETE FROM locker_bookings;
    DELETE FROM lockers;
    DELETE FROM locker_locations;
    DELETE FROM bookings;
    DELETE FROM items;
    DELETE FROM users;
  `);

  const passwordSalt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('Admin123!', passwordSalt);
  const userHash = bcrypt.hashSync('User123!', passwordSalt);

  // 1. Insert Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, phone, avatar_url, location)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(
    1,
    'System Administrator',
    'admin@lendnest.com',
    adminHash,
    'admin',
    '+91 98450 12834',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'Bengaluru, Karnataka'
  );

  insertUser.run(
    2,
    'Sarah Jenkins',
    'sarah@lendnest.com',
    userHash,
    'user',
    '+91 98201 34981',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'Bengaluru, Karnataka'
  );

  insertUser.run(
    3,
    'Alex Rivera',
    'alex@lendnest.com',
    userHash,
    'user',
    '+91 98802 78290',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'Mumbai, Maharashtra'
  );

  insertUser.run(
    4,
    'David Chen',
    'david@lendnest.com',
    userHash,
    'user',
    '+91 98110 44129',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    'Delhi NCR'
  );

  // 2. Insert Items (7 categories with realistic INR pricing)
  const insertItem = db.prepare(`
    INSERT INTO items (id, owner_id, title, description, category, price_per_day, deposit, location, image_url, item_condition, available)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const itemsData = [
    // Electronics
    [
      1,
      2,
      'Sony Alpha A7 IV Full-Frame Camera + 24-70mm GM Lens',
      'Professional 33MP hybrid camera with 4K 60p 10-bit video, ideal for weddings, video shoots, and photography trips. Comes with 2 batteries and 128GB fast SD card.',
      'Electronics',
      2499.0,
      15000.0,
      'Bengaluru, Karnataka',
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80',
      'Excellent',
      1,
    ],
    [
      2,
      2,
      'DJI Mini 3 Pro 4K Lightweight Drone with RC Controller',
      'Sub-249g lightweight drone with tri-directional obstacle sensing and 4K HDR video. Includes 3 intelligent flight batteries and charging hub.',
      'Electronics',
      1899.0,
      10000.0,
      'Bengaluru, Karnataka',
      'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800&auto=format&fit=crop&q=80',
      'Like New',
      1,
    ],
    [
      3,
      4,
      'Meta Quest 3 VR Headset (512GB) + Elite Strap',
      'Next-gen mixed reality headset with vivid color passthrough and enhanced audio. Preloaded with popular demo games. Cleaned and sanitized between rentals.',
      'Electronics',
      1299.0,
      6000.0,
      'Delhi NCR',
      'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?w=800&auto=format&fit=crop&q=80',
      'Excellent',
      1,
    ],
    [
      4,
      4,
      'Anker Nebula Capsule II Smart Portable Projector',
      'Pocket-sized cinema projector featuring 720p HD DLP display, Android TV, 2.5 hours battery life, and built-in 8W speaker. Great for backyard movie nights.',
      'Electronics',
      899.0,
      4000.0,
      'Delhi NCR',
      'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80',
      'Good',
      1,
    ],

    // Tools
    [
      5,
      3,
      'Bosch Professional 18V Brushless Combi Drill Kit',
      'High-torque impact hammer drill with two 4.0Ah batteries, rapid charger, and a 50-piece titanium drill/driver bit set in heavy-duty L-BOXX case.',
      'Tools',
      499.0,
      2000.0,
      'Mumbai, Maharashtra',
      'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&auto=format&fit=crop&q=80',
      'Excellent',
      1,
    ],
    [
      6,
      3,
      'Kärcher K5 Premium Smart Control Pressure Washer',
      '2100 PSI high performance electric pressure washer with Bluetooth app guidance, 3-in-1 Multi Jet lance, and integrated hose reel. Perfect for patios and cars.',
      'Tools',
      799.0,
      3000.0,
      'Mumbai, Maharashtra',
      'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?w=800&auto=format&fit=crop&q=80',
      'Like New',
      1,
    ],
    [
      7,
      2,
      'DeWalt 12-Inch Sliding Compound Miter Saw',
      'Precision double-bevel miter saw with XPS cross-cut positioning system and carbide blade. Cuts up to 2x14 dimensional lumber.',
      'Tools',
      999.0,
      4500.0,
      'Bengaluru, Karnataka',
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop&q=80',
      'Good',
      1,
    ],

    // Sports equipment
    [
      8,
      2,
      'Red Paddle Co Inflatable SUP Stand Up Paddleboard Kit',
      'Premium 10ft 6in all-around inflatable paddleboard with lightweight carbon paddle, dual-chamber Titan pump, coiled leash, and wheeled travel bag.',
      'Sports equipment',
      1199.0,
      5000.0,
      'Bengaluru, Karnataka',
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop&q=80',
      'Excellent',
      1,
    ],
    [
      9,
      3,
      'MSR Hubba Hubba 3-Person Ultralight Backpacking Tent',
      'Freestanding 3-season ultralight tent weighing just 3.6 lbs. Easy setup with Easton Syclone poles and waterproof DuraShield coating.',
      'Sports equipment',
      699.0,
      3000.0,
      'Mumbai, Maharashtra',
      'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&auto=format&fit=crop&q=80',
      'Excellent',
      1,
    ],
    [
      10,
      4,
      'Specialized Rockhopper Elite 29-inch Mountain Bike (Size M)',
      'Trail-ready hardtail mountain bike with RockShox Judy air fork, Shimano Deore 1x11 drivetrain, and hydraulic disc brakes. Helmet and pump included.',
      'Sports equipment',
      899.0,
      4000.0,
      'Delhi NCR',
      'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&auto=format&fit=crop&q=80',
      'Like New',
      1,
    ],

    // Books
    [
      11,
      4,
      'Software Architecture & System Design Reference Compendium',
      'Collection of top engineering volumes including Designing Data-Intensive Applications, Clean Architecture, and Cloud Patterns.',
      'Books',
      149.0,
      500.0,
      'Delhi NCR',
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
      'Excellent',
      1,
    ],
    [
      12,
      2,
      'Lonely Planet Epic Hikes & Journeys of the World (Hardcover)',
      'Inspiring 320-page full-color guide with detailed topographic maps, gear recommendations, and first-hand narratives.',
      'Books',
      99.0,
      400.0,
      'Bengaluru, Karnataka',
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=80',
      'Like New',
      1,
    ],

    // Travel accessories
    [
      13,
      3,
      'Samsonite Proxis Hardside Lightweight Luggage (Large 28")',
      'Made from Roxkin multi-layered material for superior bounce-back impact resistance. Built-in TSA lock, smooth double wheels, and USB charging slot.',
      'Travel accessories',
      599.0,
      2500.0,
      'Mumbai, Maharashtra',
      'https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=800&auto=format&fit=crop&q=80',
      'Like New',
      1,
    ],
    [
      14,
      2,
      'Steamery Cirrus No.3 Handheld Steamer & Iron Hybrid',
      'Scandinavian minimalist fabric steamer that delivers hot, dry steam with a heated ironing face plate. Eradicates wrinkles and freshens clothes in 25 seconds.',
      'Travel accessories',
      349.0,
      1500.0,
      'Bengaluru, Karnataka',
      'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=800&auto=format&fit=crop&q=80',
      'Excellent',
      1,
    ],
    [
      15,
      4,
      'Osprey Farpoint 40L Carry-On Travel Backpack',
      'TSA carry-on approved travel pack with stowable harness and hipbelt, padded laptop sleeve, and lockable slider zippers.',
      'Travel accessories',
      399.0,
      1500.0,
      'Delhi NCR',
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
      'Excellent',
      1,
    ],

    // Home appliances
    [
      16,
      2,
      'Dyson V15 Detect Absolute Cordless Vacuum',
      'Powerful cordless vacuum with green laser illumination revealing invisible dust on hard floors, piezo sensor, and anti-tangle Hair Screw tool.',
      'Home appliances',
      999.0,
      5000.0,
      'Bengaluru, Karnataka',
      'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800&auto=format&fit=crop&q=80',
      'Like New',
      1,
    ],
    [
      17,
      3,
      'Bissell SpotClean Pro Portable Carpet & Upholstery Cleaner',
      'Combines superior suction, scrubbing action, and professional cleaning solution to eliminate tough pet stains, sofa spills, and auto interior grime.',
      'Home appliances',
      649.0,
      2500.0,
      'Mumbai, Maharashtra',
      'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800&auto=format&fit=crop&q=80',
      'Excellent',
      1,
    ],

    // Other items
    [
      18,
      4,
      'Yamaha P-125 88-Key Weighted Action Digital Piano',
      'Pure CF Sound Engine with Graded Hammer Standard (GHS) weighted action keyboard. Includes heavy-duty stand, sustain pedal, and adjustable bench.',
      'Other items',
      1299.0,
      6000.0,
      'Delhi NCR',
      'https://images.unsplash.com/photo-1520523839898-507127053c37?w=800&auto=format&fit=crop&q=80',
      'Excellent',
      1,
    ],
    [
      19,
      2,
      'Folding Wooden Party Table & 6 Padded Chairs Set',
      'Sturdy solid birch wood 6ft table with folding legs and six ergonomic padded chairs. Folds flat for simple transport.',
      'Other items',
      749.0,
      2000.0,
      'Bengaluru, Karnataka',
      'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?w=800&auto=format&fit=crop&q=80',
      'Good',
      1,
    ],
  ];

  for (const item of itemsData) {
    insertItem.run(...item);
  }

  // 3. Insert Locker Locations (Metro hubs)
  const insertLocation = db.prepare(`
    INSERT INTO locker_locations (id, name, address, city, postal_code, total_lockers, lat, lng)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertLocation.run(
    1,
    'MG Road Metro Station Hub',
    'MG Road Concourse Level B',
    'Bengaluru',
    '560001',
    12,
    12.9756,
    77.6066
  );

  insertLocation.run(
    2,
    'Hiranandani Tech Innovation Kiosk',
    'Central Avenue, Main Atrium, Powai',
    'Mumbai',
    '400076',
    8,
    19.1197,
    72.9056
  );

  insertLocation.run(
    3,
    'DLF Cyber Hub Galleria',
    'Building 10, Ground Floor East Entrance',
    'Gurugram',
    '122002',
    10,
    28.4952,
    77.0895
  );

  // 4. Insert Lockers (Hourly & daily rates in INR)
  const insertLocker = db.prepare(`
    INSERT INTO lockers (id, location_id, locker_number, size, hourly_rate, daily_rate, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const lockersData = [
    // Location 1 (Bengaluru MG Road)
    [1, 1, 'CM-101', 'Small', 40.0, 250.0, 'available'],
    [2, 1, 'CM-102', 'Small', 40.0, 250.0, 'available'],
    [3, 1, 'CM-103', 'Medium', 70.0, 450.0, 'available'],
    [4, 1, 'CM-104', 'Medium', 70.0, 450.0, 'reserved'],
    [5, 1, 'CM-105', 'Large', 120.0, 750.0, 'available'],
    [6, 1, 'CM-106', 'Large', 120.0, 750.0, 'maintenance'],

    // Location 2 (Mumbai Tech Kiosk)
    [7, 2, 'TH-201', 'Small', 45.0, 280.0, 'available'],
    [8, 2, 'TH-202', 'Medium', 75.0, 480.0, 'available'],
    [9, 2, 'TH-203', 'Medium', 75.0, 480.0, 'available'],
    [10, 2, 'TH-204', 'Large', 130.0, 800.0, 'occupied'],

    // Location 3 (Gurugram Cyber Hub)
    [11, 3, 'WG-301', 'Small', 40.0, 250.0, 'available'],
    [12, 3, 'WG-302', 'Medium', 70.0, 450.0, 'available'],
    [13, 3, 'WG-303', 'Large', 120.0, 750.0, 'available'],
  ];

  for (const locker of lockersData) {
    insertLocker.run(...locker);
  }

  // 5. Seed Sample Item Booking for Alex (in INR)
  const insertBooking = db.prepare(`
    INSERT INTO bookings (id, item_id, renter_id, start_date, end_date, total_days, rental_price, deposit_amount, total_amount, status, pickup_code, renter_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertBooking.run(
    1,
    1, // Sony Camera
    3, // Alex
    '2026-10-15',
    '2026-10-18',
    3,
    7497.0,   // 3 days * 2499
    15000.0,  // deposit
    22497.0,  // total
    'confirmed',
    'LN-PICK-7842',
    'Will pick up around 10 AM on Saturday morning.'
  );

  insertBooking.run(
    2,
    5, // Bosch drill
    2, // Sarah
    '2026-10-01',
    '2026-10-03',
    2,
    998.0,   // 2 days * 499
    2000.0,  // deposit
    2998.0,  // total
    'completed',
    'LN-PICK-1092',
    'Weekend shelf building project.'
  );

  // 6. Seed Sample Locker Booking & QR Token (in INR)
  const insertLockerBooking = db.prepare(`
    INSERT INTO locker_bookings (id, locker_id, user_id, start_time, end_time, duration_hours, total_amount, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertLockerBooking.run(
    1,
    4, // CM-104
    3, // Alex
    '2026-10-11T12:00:00Z',
    '2026-10-11T18:00:00Z',
    6,
    420.0, // 6 hours * 70.0
    'active'
  );

  const insertQR = db.prepare(`
    INSERT INTO qr_tokens (id, locker_booking_id, token, expires_at, used_count, max_uses, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertQR.run(
    1,
    1,
    'LND-LK-DEMO-TOKEN-9481-XYZ',
    '2026-12-31T23:59:59Z',
    1,
    15,
    'active'
  );

  // 7. Seed Sample Locker Access Log
  const insertLog = db.prepare(`
    INSERT INTO locker_access_logs (locker_id, user_id, action, status, details)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertLog.run(
    4,
    3,
    'DOOR_OPENED_DEMO',
    'SUCCESS',
    'Simulated door unlock via verified QR Token LND-LK-DEMO-TOKEN-9481-XYZ by user Alex Rivera'
  );

  // 8. Seed Sample Payments in INR
  const insertPayment = db.prepare(`
    INSERT INTO payments (id, booking_id, locker_booking_id, user_id, amount, currency, status, method, transaction_ref)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertPayment.run(
    1,
    1,
    null,
    3,
    22497.0,
    'INR',
    'paid',
    'demo_card',
    'TXN-DEMO-873210-ITEM'
  );

  insertPayment.run(
    2,
    null,
    1,
    3,
    420.0,
    'INR',
    'paid',
    'demo_upi',
    'TXN-DEMO-664129-LOCKER'
  );

  console.log('[Seed] Database successfully populated with realistic demo users, items, lockers, bookings, and logs in INR!');
}

if (process.argv[1]?.includes('seed')) {
  runSeed();
}
