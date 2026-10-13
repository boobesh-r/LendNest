import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { CONFIG } from '../config.js';
import { detectImageSignature, isImageReferencedInDatabase } from '../services/imageService.js';

// Multer memory storage holds bytes in RAM so we can inspect magic bytes BEFORE touching the disk
const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: CONFIG.MAX_UPLOAD_SIZE_BYTES, // 5 MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype.toLowerCase())) {
      return cb(new Error('INVALID_MIME: Only JPEG, PNG, and WebP image formats are supported.'));
    }
    cb(null, true);
  },
}).single('image');

export class UploadController {
  /**
   * Secure direct product photo upload endpoint.
   * Enforces authentication, 5 MB file size limit, and genuine magic-byte file signature validation.
   */
  static handleUpload(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'You must be logged in to upload photos.' });
    }

    multerUpload(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'Image exceeds maximum allowed size of 5 MB. Please select a smaller photo.',
          });
        }
        return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ success: false, message: err.message || 'Failed to process file upload.' });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No photo file provided. Please choose a JPEG, PNG, or WebP image.',
        });
      }

      // 1. Deep byte inspection (magic numbers verification)
      const detected = detectImageSignature(file.buffer);
      if (!detected.valid || !detected.ext) {
        return res.status(400).json({
          success: false,
          message: detected.error || 'Invalid image content: File does not match real JPEG, PNG, or WebP signatures.',
        });
      }

      // 2. Ensure target upload directory exists
      const uploadsDir = path.resolve(CONFIG.UPLOADS_DIR);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // 3. Generate randomized, cryptographically safe filename
      const safeFilename = `item_${Date.now()}_${crypto.randomUUID().slice(0, 10)}.${detected.ext}`;
      const targetPath = path.resolve(uploadsDir, safeFilename);

      // Path traversal security check
      if (!targetPath.startsWith(uploadsDir)) {
        return res.status(400).json({ success: false, message: 'Security violation: Path traversal prevented.' });
      }

      try {
        fs.writeFileSync(targetPath, file.buffer);
        console.log(`[Uploads] Saved direct product photo: ${safeFilename} (${file.size} bytes)`);

        return res.status(201).json({
          success: true,
          message: 'Photo uploaded successfully.',
          url: `/uploads/${safeFilename}`,
          filename: safeFilename,
          size: file.size,
          mime: detected.mime,
        });
      } catch (writeErr: any) {
        console.error('[Uploads] Error writing file to disk:', writeErr);
        return res.status(500).json({ success: false, message: 'Could not save photo to disk.' });
      }
    });
  }

  /**
   * Safe removal of an uploaded photo (e.g. user replaces or removes photo before saving).
   * Verifies that the file is not currently tied to an active item in SQLite.
   */
  static handleDelete(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const { filename } = req.params;
    if (!filename || !/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(filename)) {
      return res.status(400).json({ success: false, message: 'Invalid or prohibited filename.' });
    }

    const uploadsDir = path.resolve(CONFIG.UPLOADS_DIR);
    const targetPath = path.resolve(uploadsDir, filename);

    if (!targetPath.startsWith(uploadsDir)) {
      return res.status(403).json({ success: false, message: 'Path traversal prevented.' });
    }

    // Never delete files that are currently referenced by catalog items
    const imageUrl = `/uploads/${filename}`;
    if (isImageReferencedInDatabase(imageUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete photo: This image is currently in use by an active listing.',
      });
    }

    if (fs.existsSync(targetPath)) {
      try {
        fs.unlinkSync(targetPath);
        console.log(`[Uploads] User removed unreferenced photo: ${filename}`);
        return res.json({ success: true, message: 'Photo deleted successfully.' });
      } catch (err: any) {
        console.error('[Uploads] Error deleting file:', err);
        return res.status(500).json({ success: false, message: 'Failed to delete photo from disk.' });
      }
    }

    return res.status(404).json({ success: false, message: 'File not found on server.' });
  }
}
