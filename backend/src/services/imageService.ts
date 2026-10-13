import fs from 'fs';
import path from 'path';
import { db } from '../database.js';
import { CONFIG } from '../config.js';

export interface ImageSignatureResult {
  valid: boolean;
  ext?: 'jpg' | 'png' | 'webp';
  mime?: string;
  error?: string;
}

/**
 * Validates genuine image content by checking byte signatures (magic numbers).
 * Strictly accepts only real JPEG, PNG, and WebP images.
 */
export function detectImageSignature(buffer: Buffer): ImageSignatureResult {
  if (!buffer || buffer.length < 12) {
    return { valid: false, error: 'File buffer is too small to be a valid image.' };
  }

  // Check JPEG (0xFF 0xD8 0xFF)
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, ext: 'jpg', mime: 'image/jpeg' };
  }

  // Check PNG (0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A)
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, ext: 'png', mime: 'image/png' };
  }

  // Check WebP (RIFF .... WEBP)
  if (
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50 // P
  ) {
    return { valid: true, ext: 'webp', mime: 'image/webp' };
  }

  return {
    valid: false,
    error: 'Unsupported image format or invalid byte signature. Only genuine JPEG, PNG, and WebP files are accepted.',
  };
}

/**
 * Checks whether an uploaded image path is still referenced by any item in the database.
 */
export function isImageReferencedInDatabase(imageUrl: string, excludeItemId?: number): boolean {
  if (!imageUrl) return false;

  let query = 'SELECT COUNT(*) as count FROM items WHERE image_url = ?';
  const params: any[] = [imageUrl];

  if (excludeItemId !== undefined) {
    query += ' AND id != ?';
    params.push(excludeItemId);
  }

  try {
    const row = db.prepare(query).get(...params) as { count: number } | undefined;
    return !!(row && row.count > 0);
  } catch (err) {
    console.error('[ImageService] Error checking image references in database:', err);
    // Erring on the side of caution: preserve file if query fails
    return true;
  }
}

/**
 * Safely removes an uploaded image from disk IF AND ONLY IF no other item references it.
 * Preserves remote URLs (e.g. Unsplash) and protects against directory traversal.
 */
export function cleanupOrphanedItemImage(imageUrl?: string | null, excludeItemId?: number): boolean {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return false;
  }

  // Only manage local uploads (e.g. /uploads/item_...)
  if (!imageUrl.startsWith('/uploads/') && !imageUrl.startsWith('/api/uploads/')) {
    return false;
  }

  const filename = path.basename(imageUrl);
  // Strict sanitization: alphanumeric, underscores, hyphens, and standard extension
  if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(filename)) {
    console.warn(`[ImageService] Suspicious filename rejected for cleanup: ${filename}`);
    return false;
  }

  // Prevent deleting if still referenced by another listing
  if (isImageReferencedInDatabase(imageUrl, excludeItemId)) {
    console.log(`[ImageService] Image ${filename} is still referenced elsewhere in the catalog; preserving on disk.`);
    return false;
  }

  const uploadsDir = path.resolve(CONFIG.UPLOADS_DIR);
  const targetPath = path.resolve(uploadsDir, filename);

  // Path traversal guard
  if (!targetPath.startsWith(uploadsDir)) {
    console.warn(`[ImageService] Path traversal attempt detected during cleanup: ${targetPath}`);
    return false;
  }

  if (fs.existsSync(targetPath)) {
    try {
      fs.unlinkSync(targetPath);
      console.log(`[ImageService] Cleaned up unreferenced image: ${filename}`);
      return true;
    } catch (err) {
      console.error(`[ImageService] Failed to unlink file ${targetPath}:`, err);
      return false;
    }
  }

  return false;
}
