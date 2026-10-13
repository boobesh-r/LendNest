import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../database.js';
import { CONFIG } from '../config.js';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { name, email, password, phone, location } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ success: false, message: 'Please provide a valid full name (at least 2 characters).' });
      }

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ success: false, message: 'A valid email address is required.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ success: false, message: 'Please provide a valid email format (e.g. user@example.com).' });
      }

      if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
      }

      // Check if email already registered
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
      if (existing) {
        return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
      }

      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(password, salt);
      // Security: Public registration MUST always be role 'user' to prevent privilege escalation
      const userRole = 'user';

      const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}&backgroundColor=0284c7,0d9488,4f46e5`;

      const stmt = db.prepare(`
        INSERT INTO users (name, email, password_hash, role, phone, avatar_url, location)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const cleanPhone = phone && typeof phone === 'string' ? phone.trim().slice(0, 25) : null;
      const cleanLocation = location && typeof location === 'string' ? location.trim().slice(0, 100) : 'Bengaluru, Karnataka';

      const result = stmt.run(
        name.trim().slice(0, 70),
        normalizedEmail,
        passwordHash,
        userRole,
        cleanPhone,
        avatarUrl,
        cleanLocation
      );

      const userId = Number(result.lastInsertRowid);

      const user = {
        id: userId,
        name: name.trim(),
        email: normalizedEmail,
        role: userRole,
        phone: cleanPhone,
        avatar_url: avatarUrl,
        location: cleanLocation,
      };

      const token = jwt.sign(user, CONFIG.JWT_SECRET, { expiresIn: '7d' });

      return res.status(201).json({
        success: true,
        message: 'Account created successfully!',
        token,
        user,
      });
    } catch (err: any) {
      console.error('[AuthController.register] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to create account.' });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as any;

      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const passwordMatches = bcrypt.compareSync(password, user.password_hash);
      if (!passwordMatches) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const safeUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar_url: user.avatar_url,
        location: user.location,
      };

      const token = jwt.sign(safeUser, CONFIG.JWT_SECRET, { expiresIn: '7d' });

      return res.json({
        success: true,
        message: 'Logged in successfully.',
        token,
        user: safeUser,
      });
    } catch (err: any) {
      console.error('[AuthController.login] Error:', err);
      return res.status(500).json({ success: false, message: 'Login failed due to a server error.' });
    }
  }

  static async getMe(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated.' });
      }

      const user = db.prepare('SELECT id, name, email, role, phone, avatar_url, location, created_at FROM users WHERE id = ?').get(req.user.id) as any;

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      // Compute statistics
      const itemsListed = db.prepare('SELECT COUNT(*) as count FROM items WHERE owner_id = ?').get(user.id) as any;
      const activeBookings = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE renter_id = ? AND status = 'confirmed'").get(user.id) as any;
      const lockerBookings = db.prepare("SELECT COUNT(*) as count FROM locker_bookings WHERE user_id = ? AND status = 'active'").get(user.id) as any;

      // Host earnings calculation
      const earnings = db.prepare(`
        SELECT COALESCE(SUM(b.rental_price), 0) as total_earned
        FROM bookings b
        JOIN items i ON b.item_id = i.id
        WHERE i.owner_id = ? AND b.status IN ('confirmed', 'completed')
      `).get(user.id) as any;

      return res.json({
        success: true,
        user: {
          ...user,
          stats: {
            itemsListed: itemsListed?.count || 0,
            activeBookings: activeBookings?.count || 0,
            activeLockers: lockerBookings?.count || 0,
            totalEarnings: earnings?.total_earned || 0,
          },
        },
      });
    } catch (err: any) {
      console.error('[AuthController.getMe] Error:', err);
      return res.status(500).json({ success: false, message: 'Could not fetch profile.' });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated.' });
      }

      const { name, phone, location, avatar_url } = req.body;

      db.prepare(`
        UPDATE users
        SET name = COALESCE(?, name),
            phone = COALESCE(?, phone),
            location = COALESCE(?, location),
            avatar_url = COALESCE(?, avatar_url)
        WHERE id = ?
      `).run(name?.trim() || null, phone || null, location || null, avatar_url || null, req.user.id);

      const updated = db.prepare('SELECT id, name, email, role, phone, avatar_url, location FROM users WHERE id = ?').get(req.user.id);

      return res.json({
        success: true,
        message: 'Profile updated successfully.',
        user: updated,
      });
    } catch (err: any) {
      console.error('[AuthController.updateProfile] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to update profile.' });
    }
  }
}
