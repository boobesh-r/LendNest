import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', authRateLimiter(15, 15 * 60 * 1000), AuthController.register);
router.post('/login', authRateLimiter(20, 15 * 60 * 1000), AuthController.login);
router.get('/me', authMiddleware, AuthController.getMe);
router.put('/profile', authMiddleware, AuthController.updateProfile);

export default router;
