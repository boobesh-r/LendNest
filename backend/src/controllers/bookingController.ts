import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../database.js';
import { PaymentService } from '../services/paymentService.js';

export class BookingController {
  static createBooking(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Please log in to make a booking.' });
      }

      const { item_id, start_date, end_date, renter_notes, payment_method = 'demo_card' } = req.body;

      const itemId = parseInt(String(item_id), 10);
      if (isNaN(itemId) || itemId <= 0) {
        return res.status(400).json({ success: false, message: 'A valid numeric item ID is required.' });
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!start_date || !end_date || !dateRegex.test(start_date) || !dateRegex.test(end_date)) {
        return res.status(400).json({ success: false, message: 'Valid start and end dates in YYYY-MM-DD format are required.' });
      }

      // Check date bounds
      const todayStr = new Date().toISOString().split('T')[0];
      if (start_date < todayStr) {
        return res.status(400).json({ success: false, message: 'Rental start date cannot be in the past.' });
      }

      if (end_date < start_date) {
        return res.status(400).json({ success: false, message: 'Rental end date cannot be earlier than start date.' });
      }

      // Calculate days (inclusive)
      const start = new Date(start_date + 'T00:00:00Z');
      const end = new Date(end_date + 'T00:00:00Z');
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      if (diffDays > 90) {
        return res.status(400).json({ success: false, message: 'Maximum booking duration is 90 days.' });
      }

      const allowedMethods = ['demo_card', 'demo_upi', 'demo_wallet'];
      const safePaymentMethod = allowedMethods.includes(payment_method) ? payment_method : 'demo_card';
      const cleanNotes = renter_notes && typeof renter_notes === 'string' ? renter_notes.trim().slice(0, 500) : null;

      // BEGIN TRANSACTION to prevent concurrent booking conflicts
      db.exec('BEGIN IMMEDIATE;');

      try {
        const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId) as any;
        if (!item) {
          db.exec('ROLLBACK;');
          return res.status(404).json({ success: false, message: 'Item listing not found.' });
        }

        if (item.available === 0) {
          db.exec('ROLLBACK;');
          return res.status(400).json({ success: false, message: 'This item is currently marked unavailable by its owner.' });
        }

        if (item.owner_id === req.user.id) {
          db.exec('ROLLBACK;');
          return res.status(400).json({ success: false, message: 'You cannot rent an item you already own!' });
        }

        // Conflict check within transaction
        const conflict = db.prepare(`
          SELECT id, start_date, end_date
          FROM bookings
          WHERE item_id = ?
            AND status IN ('confirmed', 'pending')
            AND start_date <= ?
            AND end_date >= ?
        `).get(itemId, end_date, start_date) as any;

        if (conflict) {
          db.exec('ROLLBACK;');
          return res.status(409).json({
            success: false,
            message: `Item is already reserved from ${conflict.start_date} to ${conflict.end_date}. Please choose alternate dates.`,
          });
        }

        // Cost calculation from verified database record
        const rentalPrice = diffDays * item.price_per_day;
        const depositAmount = item.deposit || 0;
        const totalAmount = rentalPrice + depositAmount;

        // Generate secure unique pickup code
        const randomCode = Math.floor(1000 + Math.random() * 9000);
        const pickupCode = `LN-PICK-${randomCode}`;

        const stmt = db.prepare(`
          INSERT INTO bookings (item_id, renter_id, start_date, end_date, total_days, rental_price, deposit_amount, total_amount, status, pickup_code, renter_notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)
        `);

        const result = stmt.run(
          itemId,
          req.user.id,
          start_date,
          end_date,
          diffDays,
          rentalPrice,
          depositAmount,
          totalAmount,
          pickupCode,
          cleanNotes
        );

        const bookingId = Number(result.lastInsertRowid);

        // Process Demo Payment
        const payment = PaymentService.processDemoPayment({
          userId: req.user.id,
          bookingId,
          amount: totalAmount,
          method: safePaymentMethod as any,
        });

        db.exec('COMMIT;');

        const newBooking = db.prepare(`
          SELECT b.*, i.title as item_title, i.image_url as item_image, i.location as item_location,
                 u.name as owner_name, u.phone as owner_phone, u.email as owner_email
          FROM bookings b
          JOIN items i ON b.item_id = i.id
          JOIN users u ON i.owner_id = u.id
          WHERE b.id = ?
        `).get(bookingId);

        return res.status(201).json({
          success: true,
          message: 'Rental booking confirmed!',
          booking: newBooking,
          payment,
        });
      } catch (innerErr) {
        db.exec('ROLLBACK;');
        throw innerErr;
      }
    } catch (err: any) {
      console.error('[BookingController.createBooking] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to process booking.' });
    }
  }

  static getMyBookings(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      // 1. Item bookings made by user
      const itemBookings = db.prepare(`
        SELECT b.*, i.title as item_title, i.category as item_category, i.image_url as item_image,
               i.location as item_location, u.name as owner_name, u.phone as owner_phone, u.avatar_url as owner_avatar,
               p.transaction_ref, p.status as payment_status,
               loc.name as locker_hub_name, loc.address as locker_hub_address, loc.city as locker_hub_city,
               loc.lat as locker_hub_lat, loc.lng as locker_hub_lng,
               lk.locker_number as assigned_locker_number, lk.size as assigned_locker_size
        FROM bookings b
        JOIN items i ON b.item_id = i.id
        JOIN users u ON i.owner_id = u.id
        LEFT JOIN payments p ON b.id = p.booking_id
        LEFT JOIN locker_locations loc ON b.locker_location_id = loc.id
        LEFT JOIN lockers lk ON b.locker_id = lk.id
        WHERE b.renter_id = ?
        ORDER BY b.created_at DESC
      `).all(req.user.id);

      // 2. Item bookings received for items owned by user
      const incomingBookings = db.prepare(`
        SELECT b.*, i.title as item_title, i.image_url as item_image,
               renter.name as renter_name, renter.email as renter_email, renter.phone as renter_phone,
               loc.name as locker_hub_name, loc.address as locker_hub_address, loc.city as locker_hub_city,
               loc.lat as locker_hub_lat, loc.lng as locker_hub_lng,
               lk.locker_number as assigned_locker_number, lk.size as assigned_locker_size
        FROM bookings b
        JOIN items i ON b.item_id = i.id
        JOIN users renter ON b.renter_id = renter.id
        LEFT JOIN locker_locations loc ON b.locker_location_id = loc.id
        LEFT JOIN lockers lk ON b.locker_id = lk.id
        WHERE i.owner_id = ?
        ORDER BY b.created_at DESC
      `).all(req.user.id);

      // 3. Smart Locker bookings made by user
      const lockerBookings = db.prepare(`
        SELECT lb.*, l.locker_number, l.size as locker_size, loc.name as location_name, loc.address as location_address,
               qt.token as qr_token, qt.expires_at as token_expires_at, qt.used_count, qt.status as qr_status,
               p.transaction_ref, p.status as payment_status
        FROM locker_bookings lb
        JOIN lockers l ON lb.locker_id = l.id
        JOIN locker_locations loc ON l.location_id = loc.id
        LEFT JOIN qr_tokens qt ON lb.id = qt.locker_booking_id
        LEFT JOIN payments p ON lb.id = p.locker_booking_id
        WHERE lb.user_id = ?
        ORDER BY lb.created_at DESC
      `).all(req.user.id);

      return res.json({
        success: true,
        itemBookings,
        incomingBookings,
        lockerBookings,
      });
    } catch (err: any) {
      console.error('[BookingController.getMyBookings] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve bookings.' });
    }
  }

  static getBookingById(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const id = parseInt(req.params.id, 10);
      const booking = db.prepare(`
        SELECT b.*, i.title as item_title, i.image_url as item_image, i.location as item_location,
               i.owner_id, owner.name as owner_name, owner.email as owner_email, owner.phone as owner_phone,
               renter.name as renter_name, renter.email as renter_email,
               p.transaction_ref, p.status as payment_status, p.method as payment_method,
               loc.name as locker_hub_name, loc.address as locker_hub_address, loc.city as locker_hub_city,
               loc.lat as locker_hub_lat, loc.lng as locker_hub_lng,
               lk.locker_number as assigned_locker_number, lk.size as assigned_locker_size
        FROM bookings b
        JOIN items i ON b.item_id = i.id
        JOIN users owner ON i.owner_id = owner.id
        JOIN users renter ON b.renter_id = renter.id
        LEFT JOIN payments p ON b.id = p.booking_id
        LEFT JOIN locker_locations loc ON b.locker_location_id = loc.id
        LEFT JOIN lockers lk ON b.locker_id = lk.id
        WHERE b.id = ?
      `).get(id) as any;

      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found.' });
      }

      // Authorization check: Must be renter, owner, or admin
      if (booking.renter_id !== req.user.id && booking.owner_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied. You do not own this booking.' });
      }

      return res.json({
        success: true,
        booking,
      });
    } catch (err: any) {
      console.error('[BookingController.getBookingById] Error:', err);
      return res.status(500).json({ success: false, message: 'Could not fetch booking.' });
    }
  }

  static cancelBooking(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const id = parseInt(req.params.id, 10);
      const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as any;

      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found.' });
      }

      const item = db.prepare('SELECT owner_id FROM items WHERE id = ?').get(booking.item_id) as any;
      const isOwner = item && item.owner_id === req.user.id;
      const isRenter = booking.renter_id === req.user.id;
      const isAdmin = req.user.role === 'admin';

      if (!isRenter && !isOwner && !isAdmin) {
        return res.status(403).json({ success: false, message: 'You do not have permission to cancel this booking.' });
      }

      if (booking.status === 'cancelled') {
        return res.status(400).json({ success: false, message: 'This booking is already cancelled.' });
      }

      if (booking.status === 'completed') {
        return res.status(400).json({ success: false, message: 'Completed rentals cannot be cancelled.' });
      }

      // Update status
      db.prepare(`UPDATE bookings SET status = 'cancelled' WHERE id = ?`).run(id);

      // Release assigned locker compartment if one was reserved
      if (booking.locker_id) {
        db.prepare("UPDATE lockers SET status = 'available' WHERE id = ?").run(booking.locker_id);
        db.prepare(`
          INSERT INTO locker_access_logs (locker_id, user_id, action, status, details)
          VALUES (?, ?, 'COMPARTMENT_RELEASED', 'SUCCESS', ?)
        `).run(
          booking.locker_id,
          req.user.id,
          `Locker compartment #${booking.locker_id} released back to available upon cancellation of booking #${id}`
        );
      }

      // Refund demo payment
      const refund = PaymentService.refundDemoPayment(id);

      return res.json({
        success: true,
        message: 'Booking cancelled successfully. Demo refund initiated.',
        refund,
      });
    } catch (err: any) {
      console.error('[BookingController.cancelBooking] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to cancel booking.' });
    }
  }

  static updateBookingStatus(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: 'Valid booking ID is required.' });
      }

      const { status } = req.body;
      const validStatuses = ['confirmed', 'completed', 'cancelled'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be one of: confirmed, completed, cancelled.',
        });
      }

      const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as any;
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found.' });
      }

      const item = db.prepare('SELECT owner_id FROM items WHERE id = ?').get(booking.item_id) as any;
      const isOwner = item && item.owner_id === req.user.id;
      const isRenter = booking.renter_id === req.user.id;
      const isAdmin = req.user.role === 'admin';

      if (!isOwner && !isRenter && !isAdmin) {
        return res.status(403).json({ success: false, message: 'You are not authorized to update this booking.' });
      }

      // Business logic rules for status transitions:
      // 1. Only the owner or admin can mark a rental as 'completed'
      if (status === 'completed' && !isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only the item host or an administrator can mark a rental as completed/returned.',
        });
      }

      // 2. Completed rentals cannot be modified
      if (booking.status === 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Completed rentals cannot have their status changed.',
        });
      }

      // 3. Cancelled rentals cannot be directly modified to completed
      if (booking.status === 'cancelled' && status === 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Cannot complete a previously cancelled booking.',
        });
      }

      if (booking.status === status) {
        return res.json({
          success: true,
          message: `Booking is already ${status}.`,
          booking,
        });
      }

      db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, id);

      // Release assigned locker compartment if booking is completed or cancelled
      if (booking.locker_id && (status === 'completed' || status === 'cancelled')) {
        db.prepare("UPDATE lockers SET status = 'available' WHERE id = ?").run(booking.locker_id);
        db.prepare(`
          INSERT INTO locker_access_logs (locker_id, user_id, action, status, details)
          VALUES (?, ?, 'COMPARTMENT_RELEASED', 'SUCCESS', ?)
        `).run(
          booking.locker_id,
          req.user.id,
          `Locker compartment #${booking.locker_id} released back to available upon completion/cancellation (${status}) of booking #${id}`
        );
      }

      let refund = null;
      if (status === 'cancelled') {
        refund = PaymentService.refundDemoPayment(id);
      }

      const updatedBooking = db.prepare(`
        SELECT b.*, i.title as item_title, i.image_url as item_image,
               renter.name as renter_name, renter.email as renter_email, renter.phone as renter_phone
        FROM bookings b
        JOIN items i ON b.item_id = i.id
        JOIN users renter ON b.renter_id = renter.id
        WHERE b.id = ?
      `).get(id);

      return res.json({
        success: true,
        message: status === 'completed'
          ? 'Rental marked as completed and gear returned successfully!'
          : status === 'cancelled'
          ? 'Booking cancelled successfully. Demo refund initiated.'
          : 'Booking status updated successfully.',
        booking: updatedBooking,
        refund,
      });
    } catch (err: any) {
      console.error('[BookingController.updateBookingStatus] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to update booking status.' });
    }
  }

  static assignLockerHub(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ success: false, message: 'Valid booking ID is required.' });
      }

      const { locker_location_id, size_preference } = req.body;
      const locationId = parseInt(String(locker_location_id), 10);
      if (isNaN(locationId) || locationId <= 0) {
        return res.status(400).json({ success: false, message: 'Valid locker hub location ID is required.' });
      }

      // Check booking and item ownership
      const booking = db.prepare(`
        SELECT b.*, i.owner_id, i.title as item_title
        FROM bookings b
        JOIN items i ON b.item_id = i.id
        WHERE b.id = ?
      `).get(id) as any;

      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found.' });
      }

      // Authorization check: Only the item host or admin can assign a locker hub
      if (booking.owner_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Only the listing host can assign a handover locker hub.',
        });
      }

      if (booking.status !== 'confirmed') {
        return res.status(400).json({
          success: false,
          message: `Cannot assign a locker hub to a ${booking.status} booking. Booking must be active/confirmed.`,
        });
      }

      const hub = db.prepare('SELECT * FROM locker_locations WHERE id = ?').get(locationId) as any;
      if (!hub) {
        return res.status(404).json({ success: false, message: 'Locker hub location not found.' });
      }

      // Atomic lock & assignment transaction
      db.exec('BEGIN IMMEDIATE;');

      try {
        // Query for available locker compartment
        let availableLocker: any = null;
        if (size_preference && ['Small', 'Medium', 'Large'].includes(size_preference)) {
          availableLocker = db.prepare(`
            SELECT id, locker_number, size
            FROM lockers
            WHERE location_id = ? AND status = 'available' AND size = ?
            ORDER BY id ASC
            LIMIT 1
          `).get(locationId, size_preference);
        }

        if (!availableLocker) {
          availableLocker = db.prepare(`
            SELECT id, locker_number, size
            FROM lockers
            WHERE location_id = ? AND status = 'available'
            ORDER BY id ASC
            LIMIT 1
          `).get(locationId);
        }

        if (!availableLocker) {
          db.exec('ROLLBACK;');
          return res.status(409).json({
            success: false,
            message: `No available locker compartments currently free at ${hub.name}. Please select another hub or choose direct handover.`,
          });
        }

        // Release previous locker if this booking had one assigned
        if (booking.locker_id && booking.locker_id !== availableLocker.id) {
          db.prepare("UPDATE lockers SET status = 'available' WHERE id = ?").run(booking.locker_id);
        }

        // Reserve the new locker compartment
        db.prepare("UPDATE lockers SET status = 'reserved' WHERE id = ?").run(availableLocker.id);

        // Update the booking record
        db.prepare(`
          UPDATE bookings
          SET locker_location_id = ?,
              locker_id = ?
          WHERE id = ?
        `).run(locationId, availableLocker.id, id);

        // Audit log the handover locker reservation
        db.prepare(`
          INSERT INTO locker_access_logs (locker_id, user_id, action, status, details)
          VALUES (?, ?, 'HANDOVER_LOCKER_ASSIGNED', 'SUCCESS', ?)
        `).run(
          availableLocker.id,
          req.user.id,
          `Host ${req.user.name} assigned locker compartment ${availableLocker.locker_number} at ${hub.name} for booking #${id} (${booking.item_title})`
        );

        db.exec('COMMIT;');

        const updatedBooking = db.prepare(`
          SELECT b.*, i.title as item_title, i.image_url as item_image,
                 loc.name as locker_hub_name, loc.address as locker_hub_address, loc.city as locker_hub_city,
                 loc.lat as locker_hub_lat, loc.lng as locker_hub_lng,
                 lk.locker_number as assigned_locker_number, lk.size as assigned_locker_size,
                 renter.name as renter_name, renter.email as renter_email, renter.phone as renter_phone
          FROM bookings b
          JOIN items i ON b.item_id = i.id
          JOIN users renter ON b.renter_id = renter.id
          LEFT JOIN locker_locations loc ON b.locker_location_id = loc.id
          LEFT JOIN lockers lk ON b.locker_id = lk.id
          WHERE b.id = ?
        `).get(id);

        return res.json({
          success: true,
          message: `Locker compartment ${availableLocker.locker_number} at ${hub.name} assigned successfully for item handover!`,
          booking: updatedBooking,
          assignedHub: {
            id: hub.id,
            name: hub.name,
            address: hub.address,
            city: hub.city,
            lat: hub.lat,
            lng: hub.lng,
            lockerNumber: availableLocker.locker_number,
            lockerSize: availableLocker.size,
            pickupInstructions: `Handover scheduled at ${hub.name}. Drop off or retrieve gear using compartment ${availableLocker.locker_number} and pickup code ${booking.pickup_code}.`,
          },
          simulationNotice: 'SIMULATION SANDBOX: Contactless smart locker reservation active. Physical IoT relay simulated.',
        });
      } catch (innerErr) {
        db.exec('ROLLBACK;');
        throw innerErr;
      }
    } catch (err: any) {
      console.error('[BookingController.assignLockerHub] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to assign locker hub.' });
    }
  }
}
