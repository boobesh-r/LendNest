import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.JWT_SECRET || (isProduction ? '' : 'lendnest_super_secret_jwt_key_2026_dev');

if (isProduction) {
  const isDefaultTemplate =
    jwtSecret.toLowerCase().includes('dev') ||
    jwtSecret.toLowerCase().includes('production_seed') ||
    jwtSecret.toLowerCase().includes('change_this') ||
    jwtSecret.toLowerCase().includes('replace_with') ||
    jwtSecret.toLowerCase().includes('secret_key');

  if (!jwtSecret || jwtSecret.length < 32 || isDefaultTemplate) {
    console.error('\n❌ FATAL PRODUCTION CONFIGURATION ERROR:');
    console.error('   JWT_SECRET is either missing, shorter than 32 characters, or using an unconfigured template placeholder.');
    console.error('   Production startup aborted to protect user credentials.');
    console.error('   Please generate a cryptographically strong secret (e.g. `openssl rand -hex 32`) and set JWT_SECRET in your .env file.\n');
    process.exit(1);
  }
}

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: isProduction,
  JWT_SECRET: jwtSecret || 'lendnest_super_secret_jwt_key_2026_dev',
  DATABASE_PATH: process.env.DATABASE_PATH || path.resolve(__dirname, '../../database/lendnest.sqlite'),
  UPLOADS_DIR: process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.resolve(__dirname, '../../backend/uploads'),
  MAX_UPLOAD_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  CORS_ORIGIN: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173',
  ENABLE_DEMO_SERVICES: process.env.ENABLE_DEMO_SERVICES !== 'false',
};


