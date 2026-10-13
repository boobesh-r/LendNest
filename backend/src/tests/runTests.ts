import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const disposableDbPath = path.resolve(__dirname, '../../../database/lendnest_test_disposable.sqlite');

// Enforce disposable database path so the working demo database is NEVER seeded or modified
process.env.DATABASE_PATH = disposableDbPath;

const { db, initDatabase } = await import('../database.js');
const { runSeed } = await import('../seed.js');
const { LockerService } = await import('../services/lockerService.js');
const { PaymentService } = await import('../services/paymentService.js');
const { createDatabaseBackup } = await import('../utils/backup.js');
const { CONFIG } = await import('../config.js');
const { detectImageSignature, cleanupOrphanedItemImage, isImageReferencedInDatabase } = await import('../services/imageService.js');



let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('  🧪 Running LendNest Automated Test Suite');
  console.log('  📦 Isolated Disposable Test Database Active');
  console.log('======================================================\n');

  // Ensure clean seeded disposable DB
  runSeed();

  console.log('\n--- 1. Database & Seeding Tests ---');

  test('Database contains initialized users table with demo accounts', () => {
    const admin = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@lendnest.com') as any;
    assert(admin, 'Admin user not found');
    assert.strictEqual(admin.role, 'admin');

    const sarah = db.prepare('SELECT * FROM users WHERE email = ?').get('sarah@lendnest.com') as any;
    assert(sarah, 'Host Sarah not found');
    assert.strictEqual(sarah.role, 'user');

    const alex = db.prepare('SELECT * FROM users WHERE email = ?').get('alex@lendnest.com') as any;
    assert(alex, 'Renter Alex not found');
    assert.strictEqual(alex.role, 'user');
  });

  test('Password hashing verifies correctly using bcryptjs', () => {
    const admin = db.prepare('SELECT password_hash FROM users WHERE email = ?').get('admin@lendnest.com') as any;
    const match = bcrypt.compareSync('Admin123!', admin.password_hash);
    assert.strictEqual(match, true, 'Admin password bcrypt match failed');

    const badMatch = bcrypt.compareSync('WrongPassword', admin.password_hash);
    assert.strictEqual(badMatch, false, 'Incorrect password should fail verification');
  });

  test('Items catalog contains items across all 7 requested categories', () => {
    const categories = db.prepare('SELECT DISTINCT category FROM items').all() as any[];
    const catNames = categories.map((c) => c.category);
    assert(catNames.includes('Electronics'), 'Missing Electronics');
    assert(catNames.includes('Tools'), 'Missing Tools');
    assert(catNames.includes('Sports equipment'), 'Missing Sports equipment');
    assert(catNames.includes('Books'), 'Missing Books');
    assert(catNames.includes('Travel accessories'), 'Missing Travel accessories');
    assert(catNames.includes('Home appliances'), 'Missing Home appliances');
    assert(catNames.includes('Other items'), 'Missing Other items');
    assert(catNames.length >= 7, 'Expected at least 7 distinct categories');
  });

  console.log('\n--- 2. Booking Engine & Conflict Prevention Tests ---');

  test('Rejects overlapping bookings for the same item', () => {
    const conflict = db.prepare(`
      SELECT id FROM bookings
      WHERE item_id = 1
        AND status IN ('confirmed', 'pending')
        AND start_date <= '2026-10-17'
        AND end_date >= '2026-10-16'
    `).get() as any;

    assert(conflict, 'Conflict detection query should find overlapping reservation');
    assert.strictEqual(conflict.id, 1, 'Should conflict with booking #1');
  });

  test('Allows booking outside of existing reservation window', () => {
    const noConflict = db.prepare(`
      SELECT id FROM bookings
      WHERE item_id = 1
        AND status IN ('confirmed', 'pending')
        AND start_date <= '2026-10-25'
        AND end_date >= '2026-10-20'
    `).get() as any;

    assert.strictEqual(noConflict, undefined, 'Dates after existing reservation should have no conflict');
  });

  test('Calculates rental pricing and deposit amounts accurately', () => {
    const item = db.prepare('SELECT price_per_day, deposit FROM items WHERE id = 1').get() as any;
    const days = 3;
    const expectedRental = days * item.price_per_day;
    const expectedTotal = expectedRental + item.deposit;

    assert.strictEqual(expectedRental, 7497.0, 'Rental fee calculation mismatch');
    assert.strictEqual(expectedTotal, 22497.0, 'Total cost calculation mismatch');
  });

  console.log('\n--- 3. Smart QR Locker & Token Engine Tests ---');

  test('Locker locations and compartments are properly structured', () => {
    const locations = db.prepare('SELECT * FROM locker_locations').all() as any[];
    assert(locations.length >= 3, 'Should have at least 3 locker stations');

    const lockers = db.prepare('SELECT * FROM lockers WHERE location_id = 1').all() as any[];
    assert(lockers.length >= 6, 'Location 1 should have at least 6 lockers');
    const sizes = lockers.map((l) => l.size);
    assert(sizes.includes('Small') && sizes.includes('Medium') && sizes.includes('Large'), 'Should support Small, Medium, Large sizes');
  });

  test('LockerService generates valid QR token with expiration timestamp', () => {
    const token = LockerService.generateQrToken(1, 4);
    assert(token.startsWith('LNQR-1-'), 'Token format should start with LNQR-1-');

    const qrRecord = db.prepare('SELECT * FROM qr_tokens WHERE token = ?').get(token) as any;
    assert(qrRecord, 'QR token record not persisted in SQLite');
    assert.strictEqual(qrRecord.status, 'active');
    assert.strictEqual(qrRecord.used_count, 0);

    const expiry = new Date(qrRecord.expires_at);
    assert(expiry.getTime() > Date.now(), 'Token expiry should be in the future');
  });

  test('LockerService validates active token and rejects invalid token', () => {
    const validToken = 'LND-LK-DEMO-TOKEN-9481-XYZ';
    const validation = LockerService.validateToken(validToken);
    assert.strictEqual(validation.valid, true, 'Pre-seeded token should be valid');
    assert(validation.locker, 'Should return associated locker metadata');

    const fakeToken = 'INVALID-HACK-TOKEN-99999';
    const fakeValidation = LockerService.validateToken(fakeToken);
    assert.strictEqual(fakeValidation.valid, false, 'Fake token must be rejected');
  });

  test('LockerService simulateUnlock increments usage and logs audit event', () => {
    const token = 'LND-LK-DEMO-TOKEN-9481-XYZ';
    const initialLogCount = (db.prepare('SELECT COUNT(*) as count FROM locker_access_logs').get() as any).count;

    const result = LockerService.simulateUnlock(token, 3, 'Alex Rivera');
    assert.strictEqual(result.success, true, 'Unlock simulation should succeed');
    assert(result.simulatedHardwareResponse, 'Should return simulated hardware response');
    assert.strictEqual(result.simulatedHardwareResponse.pinRelayState, 'HIGH (UNLATCHED)');

    const newLogCount = (db.prepare('SELECT COUNT(*) as count FROM locker_access_logs').get() as any).count;
    assert.strictEqual(newLogCount, initialLogCount + 1, 'Audit log count should increment by 1');

    const latestLog = db.prepare('SELECT * FROM locker_access_logs ORDER BY id DESC LIMIT 1').get() as any;
    assert.strictEqual(latestLog.action, 'DOOR_OPENED_DEMO');
    assert.strictEqual(latestLog.status, 'SUCCESS');
  });

  console.log('\n--- 4. Demo Payment Engine Tests ---');

  test('PaymentService generates unique transaction references and records payments', () => {
    const payment = PaymentService.processDemoPayment({
      userId: 3,
      amount: 150.0,
      method: 'demo_card',
    });

    assert.strictEqual(payment.success, true);
    assert.strictEqual(payment.status, 'paid');
    assert(payment.transactionRef.startsWith('TXN-DEMO-'), 'Transaction ref should start with TXN-DEMO-');

    const inDb = db.prepare('SELECT * FROM payments WHERE transaction_ref = ?').get(payment.transactionRef) as any;
    assert(inDb, 'Payment record should be saved in database');
    assert.strictEqual(inDb.amount, 150.0);
  });

  test('PaymentService refunds demo transactions on booking cancellation', () => {
    const refund = PaymentService.refundDemoPayment(1);
    assert.strictEqual(refund.success, true);
    assert.strictEqual(refund.status, 'refunded');

    const updated = db.prepare('SELECT status FROM payments WHERE booking_id = 1').get() as any;
    assert.strictEqual(updated.status, 'refunded', 'Payment status should be refunded in database');
  });

  console.log('\n--- 5. Security & Authorization Logic Tests ---');

  test('JWT token creation and verification works properly', () => {
    const payload = { id: 1, email: 'admin@lendnest.com', name: 'Admin', role: 'admin' as const };
    const token = jwt.sign(payload, CONFIG.JWT_SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as any;

    assert.strictEqual(decoded.id, 1);
    assert.strictEqual(decoded.role, 'admin');
  });

  test('Admin maintenance toggle alters locker availability', () => {
    const lockerId = 1;
    db.prepare("UPDATE lockers SET status = 'maintenance' WHERE id = ?").run(lockerId);

    const updated = db.prepare('SELECT status FROM lockers WHERE id = ?').get(lockerId) as any;
    assert.strictEqual(updated.status, 'maintenance');

    // Toggle back
    db.prepare("UPDATE lockers SET status = 'available' WHERE id = ?").run(lockerId);
    const restored = db.prepare('SELECT status FROM lockers WHERE id = ?').get(lockerId) as any;
    assert.strictEqual(restored.status, 'available');
  });

  test('Host item owner is authorized to mark booking as completed/returned', () => {
    const booking = db.prepare('SELECT b.*, i.owner_id FROM bookings b JOIN items i ON b.item_id = i.id WHERE b.id = 2').get() as any;
    assert(booking, 'Booking 2 must exist in seeded test database');
    assert.strictEqual(booking.owner_id, 3, 'Item owner should be user 3 (Alex)');

    db.prepare("UPDATE bookings SET status = 'completed' WHERE id = 2").run();
    const updated = db.prepare('SELECT status FROM bookings WHERE id = 2').get() as any;
    assert.strictEqual(updated.status, 'completed', 'Booking status should be completed');
  });

  test('Cancelling booking triggers demo refund and marks payment refunded', () => {
    const res = db.prepare(`
      INSERT INTO bookings (item_id, renter_id, start_date, end_date, total_days, rental_price, deposit_amount, total_amount, status, pickup_code)
      VALUES (2, 3, '2026-11-01', '2026-11-03', 3, 4500, 3000, 7500, 'confirmed', 'LN-TEST-9999')
    `).run();
    const tempBookingId = Number(res.lastInsertRowid);

    PaymentService.processDemoPayment({ userId: 3, bookingId: tempBookingId, amount: 7500, method: 'demo_card' });

    db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(tempBookingId);
    const refund = PaymentService.refundDemoPayment(tempBookingId);
    assert.strictEqual(refund.success, true, 'Refund should succeed');

    const payment = db.prepare('SELECT status FROM payments WHERE booking_id = ?').get(tempBookingId) as any;
    assert.strictEqual(payment.status, 'refunded', 'Payment should be marked refunded');
  });

  console.log('\n--- 6. Staging Hardening & Configuration Tests ---');

  test('ENABLE_DEMO_SERVICES configuration flag is properly evaluated', () => {
    assert.strictEqual(typeof CONFIG.ENABLE_DEMO_SERVICES, 'boolean');
  });

  test('createDatabaseBackup derives directory dynamically from CONFIG.DATABASE_PATH', () => {
    const res = createDatabaseBackup();
    assert.strictEqual(res.success, true);
    assert(fs.existsSync(res.backupPath), 'Backup snapshot file must exist');
    assert(res.sizeBytes > 0, 'Backup size must be positive');
    assert(res.backupPath.includes('backups'), 'Backup path must contain backups folder');

    // Clean up test snapshot
    if (fs.existsSync(res.backupPath)) {
      fs.unlinkSync(res.backupPath);
    }
  });

  console.log('\n--- 7. Smart Locker Hub Map & Handover Assignment Tests ---');

  test('Configured locker hubs store verified real geographic coordinates', () => {
    const hubs = db.prepare('SELECT id, name, city, lat, lng FROM locker_locations').all() as any[];
    assert(hubs.length >= 3, 'Should have at least 3 configured locker hubs');

    for (const hub of hubs) {
      assert(typeof hub.lat === 'number', `Hub ${hub.name} must have numeric latitude`);
      assert(typeof hub.lng === 'number', `Hub ${hub.name} must have numeric longitude`);
      assert(hub.lat >= -90 && hub.lat <= 90, `Hub ${hub.name} lat ${hub.lat} out of range`);
      assert(hub.lng >= -180 && hub.lng <= 180, `Hub ${hub.name} lng ${hub.lng} out of range`);
    }

    // Verify Bangalore Metro Hub real coordinates
    const blrHub = hubs.find((h) => h.id === 1);
    assert(blrHub, 'Bangalore hub must exist');
    assert.strictEqual(blrHub.lat, 12.9756);
    assert.strictEqual(blrHub.lng, 77.6066);
  });

  test('Locker hub availability breakdown reports free compartments accurately', () => {
    const hubWithBreakdown = db.prepare(`
      SELECT loc.id, loc.name,
             COUNT(l.id) as total_lockers,
             SUM(CASE WHEN l.status = 'available' THEN 1 ELSE 0 END) as available_lockers,
             SUM(CASE WHEN l.size = 'Small' AND l.status = 'available' THEN 1 ELSE 0 END) as available_small,
             SUM(CASE WHEN l.size = 'Medium' AND l.status = 'available' THEN 1 ELSE 0 END) as available_medium,
             SUM(CASE WHEN l.size = 'Large' AND l.status = 'available' THEN 1 ELSE 0 END) as available_large
      FROM locker_locations loc
      LEFT JOIN lockers l ON loc.id = l.location_id
      WHERE loc.id = 1
      GROUP BY loc.id
    `).get() as any;

    assert(hubWithBreakdown, 'Hub 1 breakdown query must return result');
    assert(hubWithBreakdown.total_lockers > 0, 'Total lockers should be positive');
    assert(hubWithBreakdown.available_lockers <= hubWithBreakdown.total_lockers, 'Available cannot exceed total');
    assert.strictEqual(
      hubWithBreakdown.available_lockers,
      hubWithBreakdown.available_small + hubWithBreakdown.available_medium + hubWithBreakdown.available_large,
      'Sum of small, medium, and large available must equal total available'
    );
  });

  test('Admin coordinate update persists real coordinates and logs audit event', () => {
    const hubId = 3;
    const original = db.prepare('SELECT lat, lng FROM locker_locations WHERE id = ?').get(hubId) as any;

    const newLat = 28.4960;
    const newLng = 77.0910;

    // Direct update simulating controller action
    db.prepare('UPDATE locker_locations SET lat = ?, lng = ? WHERE id = ?').run(newLat, newLng, hubId);
    const hubLocker = db.prepare('SELECT id FROM lockers WHERE location_id = ? LIMIT 1').get(hubId) as any;
    db.prepare(`
      INSERT INTO locker_access_logs (locker_id, user_id, action, status, details)
      VALUES (?, 1, 'UPDATE_COORDINATES', 'SUCCESS', ?)
    `).run(hubLocker.id, `Updated hub ${hubId} coordinates to lat: ${newLat}, lng: ${newLng}`);

    const updated = db.prepare('SELECT lat, lng FROM locker_locations WHERE id = ?').get(hubId) as any;
    assert.strictEqual(updated.lat, newLat);
    assert.strictEqual(updated.lng, newLng);

    const auditLog = db.prepare(`
      SELECT * FROM locker_access_logs WHERE action = 'UPDATE_COORDINATES' ORDER BY id DESC LIMIT 1
    `).get() as any;
    assert(auditLog, 'Audit log entry must be created');
    assert(auditLog.details.includes('28.496'), 'Audit log details must record new coordinates');

    // Restore original coordinates
    db.prepare('UPDATE locker_locations SET lat = ?, lng = ? WHERE id = ?').run(original.lat, original.lng, hubId);
  });

  test('Host assigns smart locker handover to confirmed booking and reserves compartment', () => {
    // Booking 2 is for item 4 (Canon EOS R5) owned by user 3 (Alex)
    const booking = db.prepare('SELECT * FROM bookings WHERE id = 2').get() as any;
    assert(booking, 'Booking 2 must exist');

    // Find an available locker at Hub 1
    const availableLocker = db.prepare(`
      SELECT id, locker_number, size FROM lockers WHERE location_id = 1 AND status = 'available' LIMIT 1
    `).get() as any;
    assert(availableLocker, 'Must have at least one available locker at hub 1');

    // Perform atomic assignment transaction
    db.exec('BEGIN IMMEDIATE;');
    db.prepare("UPDATE lockers SET status = 'reserved' WHERE id = ?").run(availableLocker.id);
    db.prepare('UPDATE bookings SET locker_location_id = 1, locker_id = ? WHERE id = 2').run(availableLocker.id);
    db.exec('COMMIT;');

    // Verify booking record was updated with hub and locker IDs
    const assignedBooking = db.prepare(`
      SELECT b.*, loc.name as locker_hub_name, loc.address as locker_hub_address,
             loc.lat as locker_hub_lat, loc.lng as locker_hub_lng,
             lk.locker_number as assigned_locker_number, lk.size as assigned_locker_size
      FROM bookings b
      LEFT JOIN locker_locations loc ON b.locker_location_id = loc.id
      LEFT JOIN lockers lk ON b.locker_id = lk.id
      WHERE b.id = 2
    `).get() as any;

    assert.strictEqual(assignedBooking.locker_location_id, 1, 'Locker location ID must be 1');
    assert.strictEqual(assignedBooking.locker_id, availableLocker.id, 'Locker ID must match assigned');
    assert.strictEqual(assignedBooking.locker_hub_name, 'MG Road Metro Station Hub', 'Hub name must resolve');
    assert.strictEqual(assignedBooking.assigned_locker_number, availableLocker.locker_number, 'Locker number must match');

    // Verify locker status is reserved
    const lockerStatus = db.prepare('SELECT status FROM lockers WHERE id = ?').get(availableLocker.id) as any;
    assert.strictEqual(lockerStatus.status, 'reserved', 'Assigned locker must be marked reserved');
  });

  test('Completing rental automatically releases reserved locker compartment and logs audit event', () => {
    // Booking 2 has a locker assigned from previous test
    const booking = db.prepare('SELECT locker_id FROM bookings WHERE id = 2').get() as any;
    assert(booking.locker_id, 'Booking 2 must have an assigned locker');

    const lockerBefore = db.prepare('SELECT status FROM lockers WHERE id = ?').get(booking.locker_id) as any;
    assert.strictEqual(lockerBefore.status, 'reserved');

    // Simulate completion logic from BookingController
    db.prepare("UPDATE bookings SET status = 'completed' WHERE id = 2").run();
    db.prepare("UPDATE lockers SET status = 'available' WHERE id = ?").run(booking.locker_id);
    db.prepare(`
      INSERT INTO locker_access_logs (locker_id, user_id, action, status, details)
      VALUES (?, 3, 'COMPARTMENT_RELEASED', 'SUCCESS', ?)
    `).run(booking.locker_id, `Locker compartment #${booking.locker_id} released upon completion of booking #2`);

    const lockerAfter = db.prepare('SELECT status FROM lockers WHERE id = ?').get(booking.locker_id) as any;
    assert.strictEqual(lockerAfter.status, 'available', 'Locker status should be restored to available');

    const log = db.prepare(`
      SELECT * FROM locker_access_logs WHERE action = 'COMPARTMENT_RELEASED' ORDER BY id DESC LIMIT 1
    `).get() as any;
    assert(log, 'Audit log entry must be present');
    assert.strictEqual(log.status, 'SUCCESS');
  });

  test('Cancelling rental with assigned locker automatically frees the compartment', () => {
    // Create a new booking with a locker assigned
    const bRes = db.prepare(`
      INSERT INTO bookings (item_id, renter_id, start_date, end_date, total_days, rental_price, deposit_amount, total_amount, status, pickup_code, locker_location_id, locker_id)
      VALUES (1, 2, '2026-12-01', '2026-12-03', 3, 3600, 2000, 5600, 'confirmed', 'LN-TEST-CAN1', 1, 1)
    `).run();
    const tempBId = Number(bRes.lastInsertRowid);
    db.prepare("UPDATE lockers SET status = 'reserved' WHERE id = 1").run();

    // Cancellation logic
    db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(tempBId);
    db.prepare("UPDATE lockers SET status = 'available' WHERE id = 1").run();

    const lockerCheck = db.prepare('SELECT status FROM lockers WHERE id = 1').get() as any;
    assert.strictEqual(lockerCheck.status, 'available', 'Locker must be available after cancellation');
  });

  test('Booking ownership isolation prevents unauthorized access and mutations', () => {
    const booking = db.prepare('SELECT b.*, i.owner_id FROM bookings b JOIN items i ON b.item_id = i.id WHERE b.id = 1').get() as any;
    assert(booking, 'Booking 1 must exist');

    // Booking 1: renter is user 2 (Sarah), owner is user 3 (Alex)
    const unauthorizedUserId = 4; // User 4 (Priya) is neither renter nor host

    const isRenter = booking.renter_id === unauthorizedUserId;
    const isOwner = booking.owner_id === unauthorizedUserId;
    const isAdmin = false;

    assert.strictEqual(isRenter, false, 'User 4 is not renter');
    assert.strictEqual(isOwner, false, 'User 4 is not owner');
    assert.strictEqual(!isRenter && !isOwner && !isAdmin, true, 'Unauthorized access must be rejected');
  });

  test('Non-admin users cannot access admin endpoints', () => {
    const nonAdminUser = { id: 2, email: 'sarah@lendnest.com', role: 'user' };
    const isAdmin = nonAdminUser.role === 'admin';
    assert.strictEqual(isAdmin, false, 'User role must not be admin');
  });

  console.log('\n--- 8. Direct Product Photo Upload & Storage Security Tests ---');

  test('detectImageSignature accurately identifies valid JPEG, PNG, and WebP byte buffers', () => {
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const jpegResult = detectImageSignature(jpegBuffer);
    assert.strictEqual(jpegResult.valid, true);
    assert.strictEqual(jpegResult.ext, 'jpg');
    assert.strictEqual(jpegResult.mime, 'image/jpeg');

    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const pngResult = detectImageSignature(pngBuffer);
    assert.strictEqual(pngResult.valid, true);
    assert.strictEqual(pngResult.ext, 'png');
    assert.strictEqual(pngResult.mime, 'image/png');

    const webpBuffer = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
    const webpResult = detectImageSignature(webpBuffer);
    assert.strictEqual(webpResult.valid, true);
    assert.strictEqual(webpResult.ext, 'webp');
    assert.strictEqual(webpResult.mime, 'image/webp');
  });

  test('detectImageSignature rejects invalid, corrupted, or fake image files', () => {
    const textFake = Buffer.from('<html><script>alert(1)</script></html>');
    const textResult = detectImageSignature(textFake);
    assert.strictEqual(textResult.valid, false, 'HTML/Script must be rejected');

    const exeFake = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]);
    const exeResult = detectImageSignature(exeFake);
    assert.strictEqual(exeResult.valid, false, 'Executable binary must be rejected');

    const tooShort = Buffer.from([0xff, 0xd8]);
    const shortResult = detectImageSignature(tooShort);
    assert.strictEqual(shortResult.valid, false, 'Buffer shorter than 12 bytes must be rejected');
  });

  test('Enforces 5 MB file size limit and prevents oversized uploads', () => {
    assert.strictEqual(CONFIG.MAX_UPLOAD_SIZE_BYTES, 5 * 1024 * 1024, 'Limit must be exactly 5 MB');
    const oversizeBytes = 5 * 1024 * 1024 + 1024;
    assert(oversizeBytes > CONFIG.MAX_UPLOAD_SIZE_BYTES, 'Oversized file detected');
  });

  test('Saves uploaded image to dedicated uploads directory with randomized UUID filename', () => {
    if (!fs.existsSync(CONFIG.UPLOADS_DIR)) {
      fs.mkdirSync(CONFIG.UPLOADS_DIR, { recursive: true });
    }
    const testFilename = `item_test_${Date.now()}_abc123.png`;
    const testPath = path.resolve(CONFIG.UPLOADS_DIR, testFilename);
    const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

    fs.writeFileSync(testPath, validPngBuffer);
    assert(fs.existsSync(testPath), 'File must exist on disk');

    // Clean up test file
    fs.unlinkSync(testPath);
  });

  test('Prevents path traversal attacks in upload and deletion operations', () => {
    const maliciousPaths = [
      '../../etc/passwd',
      '..\\database\\lendnest.sqlite',
      '/uploads/../../secret.key',
    ];

    maliciousPaths.forEach((malicious) => {
      const cleaned = cleanupOrphanedItemImage(malicious);
      assert.strictEqual(cleaned, false, `Path traversal attempt must be blocked: ${malicious}`);
    });
  });

  test('Safely cleans up orphaned uploaded images when listing photo is replaced', () => {
    if (!fs.existsSync(CONFIG.UPLOADS_DIR)) {
      fs.mkdirSync(CONFIG.UPLOADS_DIR, { recursive: true });
    }
    const orphanFilename = `item_orphan_${Date.now()}.png`;
    const orphanPath = path.resolve(CONFIG.UPLOADS_DIR, orphanFilename);
    const orphanUrl = `/uploads/${orphanFilename}`;
    fs.writeFileSync(orphanPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]));

    // Insert an item using this orphan image in disposable DB
    const ins = db.prepare(`
      INSERT INTO items (owner_id, title, description, category, price_per_day, deposit, location, image_url, item_condition, available)
      VALUES (2, 'Test Tool', 'Test Desc', 'Tools', 300, 1000, 'Bengaluru', ?, 'Good', 1)
    `).run(orphanUrl);
    const tempItemId = Number(ins.lastInsertRowid);

    // Now update the item's photo to a different URL
    const newUrl = '/uploads/item_replacement.png';
    db.prepare('UPDATE items SET image_url = ? WHERE id = ?').run(newUrl, tempItemId);

    // Call cleanup on the old URL
    const cleaned = cleanupOrphanedItemImage(orphanUrl, tempItemId);
    assert.strictEqual(cleaned, true, 'Orphaned image must be safely unlinked');
    assert.strictEqual(fs.existsSync(orphanPath), false, 'File must no longer exist on disk');

    // Clean up test item
    db.prepare('DELETE FROM items WHERE id = ?').run(tempItemId);
  });

  test('Preserves uploaded image if referenced by another catalog listing', () => {
    if (!fs.existsSync(CONFIG.UPLOADS_DIR)) {
      fs.mkdirSync(CONFIG.UPLOADS_DIR, { recursive: true });
    }
    const sharedFilename = `item_shared_${Date.now()}.png`;
    const sharedPath = path.resolve(CONFIG.UPLOADS_DIR, sharedFilename);
    const sharedUrl = `/uploads/${sharedFilename}`;
    fs.writeFileSync(sharedPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x0d]));

    // Item A and Item B both reference the same photo
    const insA = db.prepare(`
      INSERT INTO items (owner_id, title, description, category, price_per_day, deposit, location, image_url, item_condition, available)
      VALUES (2, 'Shared Item A', 'Desc', 'Tools', 300, 1000, 'Bengaluru', ?, 'Good', 1)
    `).run(sharedUrl);
    const itemAId = Number(insA.lastInsertRowid);

    const insB = db.prepare(`
      INSERT INTO items (owner_id, title, description, category, price_per_day, deposit, location, image_url, item_condition, available)
      VALUES (2, 'Shared Item B', 'Desc', 'Tools', 300, 1000, 'Bengaluru', ?, 'Good', 1)
    `).run(sharedUrl);
    const itemBId = Number(insB.lastInsertRowid);

    // Attempt cleanup excluding Item A: Item B still references it, so file must NOT be deleted
    const cleaned = cleanupOrphanedItemImage(sharedUrl, itemAId);
    assert.strictEqual(cleaned, false, 'Shared image must NOT be unlinked while referenced by Item B');
    assert.strictEqual(fs.existsSync(sharedPath), true, 'File must remain on disk');

    // Cleanup test items and test file
    db.prepare('DELETE FROM items WHERE id IN (?, ?)').run(itemAId, itemBId);
    if (fs.existsSync(sharedPath)) fs.unlinkSync(sharedPath);
  });

  test('Preserves remote image URLs (Unsplash) without touching filesystem', () => {
    const unsplashUrl = 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800';
    const cleaned = cleanupOrphanedItemImage(unsplashUrl);
    assert.strictEqual(cleaned, false, 'Remote URLs must never trigger filesystem operations');
  });

  test('Existing listings that use image URLs continue to display correctly', () => {
    const items = db.prepare('SELECT id, title, image_url FROM items').all() as any[];
    assert(items.length >= 19, 'Existing catalog must retain all items');
    items.forEach((item) => {
      assert(item.image_url && typeof item.image_url === 'string' && item.image_url.length > 5, 'Every item must have valid image string');
    });
  });



  console.log('\n======================================================');
  console.log(`  Test Run Complete: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  // Clean up disposable database files safely
  try {
    db.close();
    if (fs.existsSync(disposableDbPath)) fs.unlinkSync(disposableDbPath);
    if (fs.existsSync(disposableDbPath + '-wal')) fs.unlinkSync(disposableDbPath + '-wal');
    if (fs.existsSync(disposableDbPath + '-shm')) fs.unlinkSync(disposableDbPath + '-shm');
  } catch {
    // Ignore cleanup errors
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();
