import crypto from 'crypto';
import { db } from '../database.js';

export interface QrValidationResult {
  valid: boolean;
  message: string;
  lockerBooking?: any;
  locker?: any;
  qrRecord?: any;
}

export class LockerService {
  /**
   * Generates a secure, cryptographically random single-use or timed QR token for a locker booking.
   */
  static generateQrToken(lockerBookingId: number, durationHours: number = 24): string {
    const rawRandom = crypto.randomBytes(16).toString('hex').toUpperCase();
    const token = `LNQR-${lockerBookingId}-${rawRandom.substring(0, 8)}-${Date.now().toString(36).toUpperCase()}`;

    // Expiry: based on booking duration plus buffer
    const expiryDate = new Date(Date.now() + durationHours * 3600 * 1000);
    const expiresAt = expiryDate.toISOString();

    const stmt = db.prepare(`
      INSERT INTO qr_tokens (locker_booking_id, token, expires_at, used_count, max_uses, status)
      VALUES (?, ?, ?, 0, 20, 'active')
    `);
    stmt.run(lockerBookingId, token, expiresAt);

    return token;
  }

  /**
   * Validates a scanned QR token against active database records.
   * Ensures token is active, not expired, and matches an ongoing booking.
   */
  static validateToken(token: string): QrValidationResult {
    const qrRecord = db.prepare(`SELECT * FROM qr_tokens WHERE token = ?`).get(token) as any;

    if (!qrRecord) {
      return { valid: false, message: 'Invalid QR token. No matching locker booking found.' };
    }

    if (qrRecord.status !== 'active') {
      return { valid: false, message: `QR token is ${qrRecord.status}. Access denied.` };
    }

    const now = new Date();
    const expiresAt = new Date(qrRecord.expires_at);
    if (now > expiresAt) {
      db.prepare(`UPDATE qr_tokens SET status = 'expired' WHERE id = ?`).run(qrRecord.id);
      return { valid: false, message: 'QR token has expired. Please renew your locker booking.' };
    }

    if (qrRecord.used_count >= qrRecord.max_uses) {
      db.prepare(`UPDATE qr_tokens SET status = 'used' WHERE id = ?`).run(qrRecord.id);
      return { valid: false, message: 'QR token usage limit exceeded. Token expired.' };
    }

    const booking = db.prepare(`
      SELECT b.*, l.locker_number, l.size, l.status as locker_status, l.location_id, loc.name as location_name
      FROM locker_bookings b
      JOIN lockers l ON b.locker_id = l.id
      JOIN locker_locations loc ON l.location_id = loc.id
      WHERE b.id = ?
    `).get(qrRecord.locker_booking_id) as any;

    if (!booking) {
      return { valid: false, message: 'Associated locker booking not found.' };
    }

    if (booking.status !== 'active') {
      return { valid: false, message: `Booking status is '${booking.status}'. Locker access is not permitted.` };
    }

    return {
      valid: true,
      message: 'QR token successfully validated.',
      lockerBooking: booking,
      locker: {
        id: booking.locker_id,
        number: booking.locker_number,
        size: booking.size,
        location: booking.location_name,
      },
      qrRecord,
    };
  }

  /**
   * Simulates opening a physical locker.
   * Records audit event in database and emits hardware command in production.
   */
  static simulateUnlock(token: string, userId: number, userName: string = 'User', userRole: string = 'user') {
    const validation = this.validateToken(token);

    if (!validation.valid || !validation.lockerBooking) {
      // Log failed access attempt
      if (validation.qrRecord?.locker_booking_id) {
        const bk = db.prepare('SELECT locker_id FROM locker_bookings WHERE id = ?').get(validation.qrRecord.locker_booking_id) as any;
        if (bk) {
          db.prepare(`
            INSERT INTO locker_access_logs (locker_id, user_id, action, status, details)
            VALUES (?, ?, 'ACCESS_DENIED', 'FAILED', ?)
          `).run(bk.locker_id, userId, validation.message);
        }
      }
      return { success: false, message: validation.message };
    }

    const booking = validation.lockerBooking;

    // Security: Only the user who reserved the locker or an admin can trigger an unlock
    if (booking.user_id !== userId && userRole !== 'admin') {
      db.prepare(`
        INSERT INTO locker_access_logs (locker_id, user_id, action, status, details)
        VALUES (?, ?, 'UNAUTHORIZED_UNLOCK_ATTEMPT', 'FAILED', ?)
      `).run(booking.locker_id, userId, `Unauthorized unlock attempt for Locker ${booking.locker_number} by ${userName} (ID ${userId})`);
      return { success: false, message: 'Access denied. You can only unlock smart lockers reserved by your account.' };
    }

    // Increment usage count
    db.prepare(`
      UPDATE qr_tokens
      SET used_count = used_count + 1
      WHERE id = ?
    `).run(validation.qrRecord.id);

    // Update locker status to occupied if it was reserved
    db.prepare(`
      UPDATE lockers
      SET status = 'occupied'
      WHERE id = ? AND status = 'reserved'
    `).run(booking.locker_id);

    // Record success access log
    const logDetails = `Simulated door solenoid unlatched for Locker ${booking.locker_number} (${booking.location_name}) by ${userName}. Token usage: ${validation.qrRecord.used_count + 1}/${validation.qrRecord.max_uses}.`;
    db.prepare(`
      INSERT INTO locker_access_logs (locker_id, user_id, action, status, details)
      VALUES (?, ?, 'DOOR_OPENED_DEMO', 'SUCCESS', ?)
    `).run(booking.locker_id, userId, logDetails);

    return {
      success: true,
      message: `Locker ${booking.locker_number} successfully unlocked! Door latch released for 30 seconds.`,
      lockerNumber: booking.locker_number,
      locationName: booking.location_name,
      size: booking.size,
      remainingUses: validation.qrRecord.max_uses - (validation.qrRecord.used_count + 1),
      simulatedHardwareResponse: {
        pinRelayState: 'HIGH (UNLATCHED)',
        reedSwitchContact: 'OPEN',
        opticalSensorStatus: 'PACKAGE_DETECTED',
        timeoutSeconds: 30,
        firmwareEcho: 'DEMO-ESP32-SOLENOID-OK',
      },
    };
  }
}
