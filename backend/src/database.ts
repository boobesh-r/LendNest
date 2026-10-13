import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { CONFIG } from './config.js';

const dbPath = path.isAbsolute(CONFIG.DATABASE_PATH)
  ? CONFIG.DATABASE_PATH
  : path.resolve(process.cwd(), CONFIG.DATABASE_PATH);

// Ensure the directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new DatabaseSync(dbPath);

// Enable pragmas
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      phone TEXT,
      avatar_url TEXT,
      location TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      price_per_day REAL NOT NULL,
      deposit REAL NOT NULL DEFAULT 0,
      location TEXT NOT NULL,
      image_url TEXT NOT NULL,
      item_condition TEXT NOT NULL DEFAULT 'Excellent',
      available INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      renter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      total_days INTEGER NOT NULL,
      rental_price REAL NOT NULL,
      deposit_amount REAL NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed',
      pickup_code TEXT NOT NULL,
      renter_notes TEXT,
      locker_location_id INTEGER REFERENCES locker_locations(id),
      locker_id INTEGER REFERENCES lockers(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS locker_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      total_lockers INTEGER NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lockers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id INTEGER NOT NULL REFERENCES locker_locations(id) ON DELETE CASCADE,
      locker_number TEXT NOT NULL,
      size TEXT NOT NULL,
      hourly_rate REAL NOT NULL,
      daily_rate REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS locker_bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      locker_id INTEGER NOT NULL REFERENCES lockers(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration_hours INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS qr_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      locker_booking_id INTEGER NOT NULL REFERENCES locker_bookings(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used_count INTEGER NOT NULL DEFAULT 0,
      max_uses INTEGER NOT NULL DEFAULT 15,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS locker_access_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      locker_id INTEGER NOT NULL REFERENCES lockers(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
      locker_booking_id INTEGER REFERENCES locker_bookings(id) ON DELETE SET NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      status TEXT NOT NULL DEFAULT 'paid',
      method TEXT NOT NULL,
      transaction_ref TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
    CREATE INDEX IF NOT EXISTS idx_items_owner ON items(owner_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_item ON bookings(item_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_renter ON bookings(renter_id);
    CREATE INDEX IF NOT EXISTS idx_lockers_location ON lockers(location_id);
    CREATE INDEX IF NOT EXISTS idx_locker_bookings_user ON locker_bookings(user_id);
  `);

  // Non-destructive column additions for existing databases (preserves all data)
  try {
    const bookingCols = db.prepare('PRAGMA table_info(bookings)').all() as any[];
    const hasLocation = bookingCols.some((c) => c.name === 'locker_location_id');
    const hasLocker = bookingCols.some((c) => c.name === 'locker_id');

    if (!hasLocation) {
      db.exec('ALTER TABLE bookings ADD COLUMN locker_location_id INTEGER REFERENCES locker_locations(id);');
    }
    if (!hasLocker) {
      db.exec('ALTER TABLE bookings ADD COLUMN locker_id INTEGER REFERENCES lockers(id);');
    }
  } catch (err) {
    console.error('[Database] Safe migration note:', err);
  }

  console.log(`[Database] SQLite connected & schema initialized at: ${dbPath}`);
}
