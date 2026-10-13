import { Request, Response } from 'express';
import { db } from '../database.js';
import { createDatabaseBackup } from '../utils/backup.js';

export class AdminController {
  static getOverviewStats(req: Request, res: Response) {
    try {
      const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
      const itemsCount = db.prepare('SELECT COUNT(*) as count FROM items').get() as any;
      const itemBookingsCount = db.prepare('SELECT COUNT(*) as count FROM bookings').get() as any;
      const lockerBookingsCount = db.prepare('SELECT COUNT(*) as count FROM locker_bookings').get() as any;

      const totalItemVolume = db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total FROM bookings WHERE status != 'cancelled'
      `).get() as any;

      const totalLockerVolume = db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total FROM locker_bookings WHERE status != 'cancelled'
      `).get() as any;

      const activeItemRentals = db.prepare(`
        SELECT COUNT(*) as count FROM bookings WHERE status = 'confirmed'
      `).get() as any;

      const lockersOccupied = db.prepare(`
        SELECT COUNT(*) as count FROM lockers WHERE status IN ('reserved', 'occupied')
      `).get() as any;

      const lockersMaintenance = db.prepare(`
        SELECT COUNT(*) as count FROM lockers WHERE status = 'maintenance'
      `).get() as any;

      const lockersAvailable = db.prepare(`
        SELECT COUNT(*) as count FROM lockers WHERE status = 'available'
      `).get() as any;

      return res.json({
        success: true,
        stats: {
          totalUsers: usersCount.count,
          totalListings: itemsCount.count,
          totalItemBookings: itemBookingsCount.count,
          totalLockerBookings: lockerBookingsCount.count,
          activeItemRentals: activeItemRentals.count,
          lockersOccupied: lockersOccupied.count,
          lockersMaintenance: lockersMaintenance.count,
          lockersAvailable: lockersAvailable.count,
          grossRentalVolume: Number(totalItemVolume.total) + Number(totalLockerVolume.total),
          itemVolume: Number(totalItemVolume.total),
          lockerVolume: Number(totalLockerVolume.total),
        },
      });
    } catch (err: any) {
      console.error('[AdminController.getOverviewStats] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to compute admin statistics.' });
    }
  }

  static getAllUsers(req: Request, res: Response) {
    try {
      const users = db.prepare(`
        SELECT u.id, u.name, u.email, u.role, u.phone, u.location, u.avatar_url, u.created_at,
               COUNT(DISTINCT i.id) as listings_count,
               COUNT(DISTINCT b.id) as bookings_count
        FROM users u
        LEFT JOIN items i ON u.id = i.owner_id
        LEFT JOIN bookings b ON u.id = b.renter_id
        GROUP BY u.id
        ORDER BY u.created_at DESC
      `).all();

      return res.json({ success: true, users });
    } catch (err: any) {
      console.error('[AdminController.getAllUsers] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve users.' });
    }
  }

  static getAllBookings(req: Request, res: Response) {
    try {
      const bookings = db.prepare(`
        SELECT b.*, i.title as item_title, i.category as item_category,
               renter.name as renter_name, renter.email as renter_email,
               owner.name as owner_name, owner.email as owner_email,
               p.transaction_ref, p.status as payment_status, p.method as payment_method
        FROM bookings b
        JOIN items i ON b.item_id = i.id
        JOIN users renter ON b.renter_id = renter.id
        JOIN users owner ON i.owner_id = owner.id
        LEFT JOIN payments p ON b.id = p.booking_id
        ORDER BY b.created_at DESC
      `).all();

      return res.json({ success: true, bookings });
    } catch (err: any) {
      console.error('[AdminController.getAllBookings] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve bookings.' });
    }
  }

  static getAllLockers(req: Request, res: Response) {
    try {
      const lockers = db.prepare(`
        SELECT l.*, loc.name as location_name, loc.address as location_address, loc.city
        FROM lockers l
        JOIN locker_locations loc ON l.location_id = loc.id
        ORDER BY loc.name ASC, l.locker_number ASC
      `).all();

      return res.json({ success: true, lockers });
    } catch (err: any) {
      console.error('[AdminController.getAllLockers] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve lockers.' });
    }
  }

  static updateLockerStatus(req: Request, res: Response) {
    try {
      const lockerId = parseInt(req.params.id, 10);
      const { status } = req.body;

      if (!['available', 'maintenance', 'reserved', 'occupied'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid locker status value.' });
      }

      const locker = db.prepare('SELECT * FROM lockers WHERE id = ?').get(lockerId) as any;
      if (!locker) {
        return res.status(404).json({ success: false, message: 'Locker not found.' });
      }

      db.prepare('UPDATE lockers SET status = ? WHERE id = ?').run(status, lockerId);

      // Audit log the status update
      db.prepare(`
        INSERT INTO locker_access_logs (locker_id, user_id, action, status, details)
        VALUES (?, ?, 'MAINTENANCE_TOGGLED', 'SUCCESS', ?)
      `).run(
        lockerId,
        req.user?.id || null,
        `Admin status changed from ${locker.status} to ${status} by ${req.user?.name || 'Admin'}`
      );

      return res.json({
        success: true,
        message: `Locker ${locker.locker_number} status updated to '${status}'.`,
        lockerId,
        status,
      });
    } catch (err: any) {
      console.error('[AdminController.updateLockerStatus] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to update locker status.' });
    }
  }

  static getAllAccessLogs(req: Request, res: Response) {
    try {
      const logs = db.prepare(`
        SELECT al.*, l.locker_number, loc.name as location_name, u.name as user_name, u.email as user_email
        FROM locker_access_logs al
        JOIN lockers l ON al.locker_id = l.id
        JOIN locker_locations loc ON l.location_id = loc.id
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.timestamp DESC
        LIMIT 100
      `).all();

      return res.json({ success: true, logs });
    } catch (err: any) {
      console.error('[AdminController.getAllAccessLogs] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve access logs.' });
    }
  }

  static triggerDatabaseBackup(req: Request, res: Response) {
    try {
      const backupResult = createDatabaseBackup();
      return res.json({
        success: true,
        message: 'Point-in-time database snapshot created successfully.',
        backup: backupResult,
      });
    } catch (err: any) {
      console.error('[AdminController.triggerDatabaseBackup] Error:', err);
      return res.status(500).json({ success: false, message: 'Database backup failed.' });
    }
  }

  static updateLocationCoordinates(req: Request, res: Response) {
    try {
      const locationId = parseInt(req.params.id, 10);
      if (isNaN(locationId) || locationId <= 0) {
        return res.status(400).json({ success: false, message: 'Valid location ID is required.' });
      }

      const { lat, lng, name, address, city, postal_code } = req.body;

      const numLat = Number(lat);
      const numLng = Number(lng);

      if (isNaN(numLat) || numLat < -90 || numLat > 90) {
        return res.status(400).json({
          success: false,
          message: 'Valid real latitude between -90 and 90 is required.',
        });
      }

      if (isNaN(numLng) || numLng < -180 || numLng > 180) {
        return res.status(400).json({
          success: false,
          message: 'Valid real longitude between -180 and 180 is required.',
        });
      }

      const location = db.prepare('SELECT * FROM locker_locations WHERE id = ?').get(locationId) as any;
      if (!location) {
        return res.status(404).json({ success: false, message: 'Locker hub location not found.' });
      }

      db.prepare(`
        UPDATE locker_locations
        SET lat = ?,
            lng = ?,
            name = COALESCE(?, name),
            address = COALESCE(?, address),
            city = COALESCE(?, city),
            postal_code = COALESCE(?, postal_code)
        WHERE id = ?
      `).run(
        numLat,
        numLng,
        name?.trim() || null,
        address?.trim() || null,
        city?.trim() || null,
        postal_code?.trim() || null,
        locationId
      );

      // Audit log the update
      const hubLocker = db.prepare('SELECT id FROM lockers WHERE location_id = ? LIMIT 1').get(locationId) as any;
      const auditLockerId = hubLocker ? hubLocker.id : 1;

      db.prepare(`
        INSERT INTO locker_access_logs (locker_id, user_id, action, status, details)
        VALUES (?, ?, 'HUB_COORDINATES_UPDATED', 'SUCCESS', ?)
      `).run(
        auditLockerId,
        req.user?.id || null,
        `Admin configured coordinates for hub #${locationId} (${location.name}) to [${numLat}, ${numLng}] by ${req.user?.name || 'Admin'}`
      );

      const updated = db.prepare('SELECT * FROM locker_locations WHERE id = ?').get(locationId);

      return res.json({
        success: true,
        message: `Coordinates for '${location.name}' updated successfully to [${numLat}, ${numLng}].`,
        location: updated,
      });
    } catch (err: any) {
      console.error('[AdminController.updateLocationCoordinates] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to update hub coordinates.' });
    }
  }
}

