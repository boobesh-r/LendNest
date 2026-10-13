import { Router } from 'express';
import { UploadController } from '../controllers/uploadController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Authenticated photo upload endpoint
router.post('/', authMiddleware, UploadController.handleUpload);

// Authenticated photo cancellation/deletion endpoint (safely cleans unreferenced files)
router.delete('/:filename', authMiddleware, UploadController.handleDelete);

export default router;
