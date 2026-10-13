import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { CONFIG } from './config.js';
import { initDatabase } from './database.js';
import authRoutes from './routes/authRoutes.js';
import itemRoutes from './routes/itemRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import lockerRoutes from './routes/lockerRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust reverse proxy (Caddy / Nginx / Cloudflare) for accurate client IP in rate limiting
app.set('trust proxy', 1);

// Initialize SQLite database schema
initDatabase();

// Ensure dedicated uploads directory exists
if (!fs.existsSync(CONFIG.UPLOADS_DIR)) {
  fs.mkdirSync(CONFIG.UPLOADS_DIR, { recursive: true });
}

// Serve uploaded product photos through controlled static routes with security headers
const serveUploads = express.static(CONFIG.UPLOADS_DIR, {
  dotfiles: 'deny',
  maxAge: '7d',
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  },
});

app.use('/uploads', serveUploads);
app.use('/api/uploads', serveUploads);

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (CONFIG.IS_PRODUCTION) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Production-aware CORS configuration
const allowedOrigins = CONFIG.CORS_ORIGIN
  ? CONFIG.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || !CONFIG.IS_PRODUCTION || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked request from origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'LendNest Smart Rental & Sharing Platform',
    version: '1.0.0',
    environment: CONFIG.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Mount modular REST API routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/lockers', lockerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Static frontend serving if production bundle exists
const frontendDist = process.env.FRONTEND_DIST || path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  console.log(`[Frontend] Serving static production bundle from: ${frontendDist}`);
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {

  console.log('[Frontend] Static frontend bundle not found; running in API-only mode.');
}

// Global Error Handler
app.use(errorHandler);

const PORT = CONFIG.PORT;
app.listen(PORT, () => {
  console.log(`
=====================================================
  🌿 LendNest Smart Rental Platform Backend
  Borrow Smart. Share More.
=====================================================
  📡 Server listening on: http://localhost:${PORT}
  🌍 Environment:         ${CONFIG.NODE_ENV}
  🔗 API Health:          http://localhost:${PORT}/api/health
  👥 Auth Endpoints:      http://localhost:${PORT}/api/auth
  📦 Items Endpoints:     http://localhost:${PORT}/api/items
  📅 Bookings Endpoints:  http://localhost:${PORT}/api/bookings
  🔐 Locker Endpoints:    http://localhost:${PORT}/api/lockers
  💳 Payment Endpoints:   http://localhost:${PORT}/api/payments
  🛡️ Admin Endpoints:     http://localhost:${PORT}/api/admin
=====================================================${
    !CONFIG.IS_PRODUCTION
      ? `
  Demo Accounts (Development Mode Only):
    Admin: admin@lendnest.com / Admin123!
    Host:  sarah@lendnest.com / User123!
    Renter: alex@lendnest.com / User123!`
      : `
  [PRODUCTION MODE ACTIVE - Demo credentials hidden]`
  }
=====================================================
`);
});
