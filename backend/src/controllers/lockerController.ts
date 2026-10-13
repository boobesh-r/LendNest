import { Request, Response } from 'express';
import { db } from '../database.js';
import { LockerService } from '../services/lockerService.js';
import { PaymentService } from '../services/paymentService.js';
import { CONFIG } from '../config.js';

export class LockerController {
  static getLocations(req: Request, res: Response) {
    try {
      const locations = db.prepare(`
        SELECT loc.*,
               COUNT(l.id) as total_lockers,
               SUM(CASE WHEN l.status = 'available' THEN 1 ELSE 0 END) as available_lockers,
               SUM(CASE WHEN l.size = 'Small' AND l.status = 'available' THEN 1 ELSE 0 END) as available_small,
               SUM(CASE WHEN l.size = 'Medium' AND l.status = 'available' THEN 1 ELSE 0 END) as available_medium,
               SUM(CASE WHEN l.size = 'Large' AND l.status = 'available' THEN 1 ELSE 0 END) as available_large
        FROM locker_locations loc
        LEFT JOIN lockers l ON loc.id = l.location_id
        GROUP BY loc.id
        ORDER BY loc.id ASC
      `).all() as any[];

      const enriched = locations.map((loc) => ({
        ...loc,
        operating_hours: loc.id === 1 ? '06:00 AM - 11:30 PM (Metro Hub)' : '24/7 Contactless Smart Kiosk',
        is_virtual_simulation: true,
      }));

      return res.json({
        success: true,
        locations: enriched,
      });
    } catch (err: any) {
      console.error('[LockerController.getLocations] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve locker locations.' });
    }
  }

  static getLocationById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: 'Invalid location ID.' });
      }

      const location = db.prepare(`
        SELECT loc.*,
               COUNT(l.id) as total_lockers,
               SUM(CASE WHEN l.status = 'available' THEN 1 ELSE 0 END) as available_lockers,
               SUM(CASE WHEN l.size = 'Small' AND l.status = 'available' THEN 1 ELSE 0 END) as available_small,
               SUM(CASE WHEN l.size = 'Medium' AND l.status = 'available' THEN 1 ELSE 0 END) as available_medium,
               SUM(CASE WHEN l.size = 'Large' AND l.status = 'available' THEN 1 ELSE 0 END) as available_large
        FROM locker_locations loc
        LEFT JOIN lockers l ON loc.id = l.location_id
        WHERE loc.id = ?
        GROUP BY loc.id
      `).get(id) as any;

      if (!location) {
        return res.status(404).json({ success: false, message: 'Locker hub location not found.' });
      }

      const lockers = db.prepare(`
        SELECT id, locker_number, size, hourly_rate, daily_rate, status
        FROM lockers
        WHERE location_id = ?
        ORDER BY locker_number ASC
      `).all(id);

      return res.json({
        success: true,
        location: {
          ...location,
          operating_hours: location.id === 1 ? '06:00 AM - 11:30 PM (Metro Hub)' : '24/7 Contactless Smart Kiosk',
          is_virtual_simulation: true,
          lockers,
        },
      });
    } catch (err: any) {
      console.error('[LockerController.getLocationById] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve location details.' });
    }
  }

  static getLockers(req: Request, res: Response) {
    try {
      const { locationId, size, status } = req.query;

      let query = `
        SELECT l.*, loc.name as location_name, loc.address as location_address
        FROM lockers l
        JOIN locker_locations loc ON l.location_id = loc.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (locationId) {
        query += ` AND l.location_id = ?`;
        params.push(Number(locationId));
      }

      if (size && size !== 'All') {
        query += ` AND l.size = ?`;
        params.push(size);
      }

      if (status && status !== 'All') {
        query += ` AND l.status = ?`;
        params.push(status);
      }

      query += ` ORDER BY l.locker_number ASC`;

      const lockers = db.prepare(query).all(...params);

      return res.json({
        success: true,
        count: lockers.length,
        lockers,
      });
    } catch (err: any) {
      console.error('[LockerController.getLockers] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve lockers.' });
    }
  }

  static bookLocker(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Please log in to book a smart locker.' });
      }

      const { locker_id, duration_hours, payment_method } = req.body;

      const lockerId = parseInt(String(locker_id), 10);
      if (isNaN(lockerId) || lockerId <= 0) {
        return res.status(400).json({ success: false, message: 'A valid numeric locker ID is required.' });
      }

      const hours = Math.max(1, Math.min(72, Number(duration_hours) || 4));
      const allowedMethods = ['demo_card', 'demo_upi', 'demo_wallet'];
      const safePaymentMethod = allowedMethods.includes(payment_method) ? payment_method : 'demo_card';

      // BEGIN TRANSACTION to prevent concurrent booking race conditions
      db.exec('BEGIN IMMEDIATE;');

      try {
        const locker = db.prepare(`
          SELECT l.*, loc.name as location_name
          FROM lockers l
          JOIN locker_locations loc ON l.location_id = loc.id
          WHERE l.id = ?
        `).get(lockerId) as any;

        if (!locker) {
          db.exec('ROLLBACK;');
          return res.status(404).json({ success: false, message: 'Locker compartment not found.' });
        }

        if (locker.status !== 'available') {
          db.exec('ROLLBACK;');
          return res.status(409).json({
            success: false,
            message: `Locker ${locker.locker_number} is currently ${locker.status}. Please select an available locker.`,
          });
        }

        // Calculate cost
        const totalAmount = hours >= 24 ? Math.ceil(hours / 24) * locker.daily_rate : hours * locker.hourly_rate;

        const startTime = new Date().toISOString();
        const endTime = new Date(Date.now() + hours * 3600 * 1000).toISOString();

        // Reserve the locker atomically
        const updateResult = db.prepare(`UPDATE lockers SET status = 'reserved' WHERE id = ? AND status = 'available'`).run(lockerId);
        if (updateResult.changes === 0) {
          db.exec('ROLLBACK;');
          return res.status(409).json({ success: false, message: 'Locker was just reserved by another user. Please choose another.' });
        }

        // Create locker booking
        const stmt = db.prepare(`
          INSERT INTO locker_bookings (locker_id, user_id, start_time, end_time, duration_hours, total_amount, status)
          VALUES (?, ?, ?, ?, ?, ?, 'active')
        `);

        const result = stmt.run(lockerId, req.user.id, startTime, endTime, hours, totalAmount);
        const lockerBookingId = Number(result.lastInsertRowid);

        // Generate dynamic QR token
        const qrToken = LockerService.generateQrToken(lockerBookingId, hours);

        // Process Demo Payment
        const payment = PaymentService.processDemoPayment({
          userId: req.user.id,
          lockerBookingId,
          amount: totalAmount,
          method: safePaymentMethod as any,
        });

        db.exec('COMMIT;');

        return res.status(201).json({
          success: true,
          message: `Locker ${locker.locker_number} reserved successfully!`,
          booking: {
            id: lockerBookingId,
            lockerNumber: locker.locker_number,
            locationName: locker.location_name,
            size: locker.size,
            startTime,
            endTime,
            durationHours: hours,
            totalAmount,
            qrToken,
            status: 'active',
          },
          payment,
          isSandboxNotice: 'SIMULATION SANDBOX: Smart locker reservation active with virtual hardware simulator.',
        });
      } catch (innerErr) {
        db.exec('ROLLBACK;');
        throw innerErr;
      }
    } catch (err: any) {
      console.error('[LockerController.bookLocker] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to reserve locker.' });
    }
  }

  static getLockerBooking(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const id = parseInt(req.params.id, 10);
      const booking = db.prepare(`
        SELECT lb.*, l.locker_number, l.size, l.status as current_locker_status,
               loc.name as location_name, loc.address as location_address,
               qt.token as qr_token, qt.expires_at, qt.used_count, qt.max_uses, qt.status as qr_status
        FROM locker_bookings lb
        JOIN lockers l ON lb.locker_id = l.id
        JOIN locker_locations loc ON l.location_id = loc.id
        LEFT JOIN qr_tokens qt ON lb.id = qt.locker_booking_id
        WHERE lb.id = ?
      `).get(id) as any;

      if (!booking) {
        return res.status(404).json({ success: false, message: 'Locker booking not found.' });
      }

      if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }

      return res.json({
        success: true,
        booking,
      });
    } catch (err: any) {
      console.error('[LockerController.getLockerBooking] Error:', err);
      return res.status(500).json({ success: false, message: 'Could not fetch locker booking.' });
    }
  }

  static unlockLockerDemo(req: Request, res: Response) {
    try {
      if (!CONFIG.ENABLE_DEMO_SERVICES) {
        return res.status(403).json({
          success: false,
          message: 'Virtual hardware locker unlock simulation is disabled. Sandbox operations are deactivated in this environment.',
        });
      }

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Please log in to unlock a locker.' });
      }

      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ success: false, message: 'QR token is required to unlock.' });
      }

      const result = LockerService.simulateUnlock(token.trim(), req.user.id, req.user.name, req.user.role);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.json(result);
    } catch (err: any) {
      console.error('[LockerController.unlockLockerDemo] Error:', err);
      return res.status(500).json({ success: false, message: 'Locker unlock simulation failed.' });
    }
  }

  static getAccessLogs(req: Request, res: Response) {
    try {
      const logs = db.prepare(`
        SELECT al.*, l.locker_number, loc.name as location_name, u.name as user_name, u.email as user_email
        FROM locker_access_logs al
        JOIN lockers l ON al.locker_id = l.id
        JOIN locker_locations loc ON l.location_id = loc.id
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.timestamp DESC
        LIMIT 50
      `).all();

      return res.json({
        success: true,
        count: logs.length,
        logs,
      });
    } catch (err: any) {
      console.error('[LockerController.getAccessLogs] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve access logs.' });
    }
  }
}
