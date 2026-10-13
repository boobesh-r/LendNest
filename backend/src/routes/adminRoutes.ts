import { Router } from 'express';
import { AdminController } from '../controllers/adminController.js';
import { authMiddleware, adminOnlyMiddleware } from '../middleware/auth.js';

const router = Router();

// Protect all admin routes with authentication and admin role check
router.use(authMiddleware);
router.use(adminOnlyMiddleware);

router.get('/stats', AdminController.getOverviewStats);
router.get('/users', AdminController.getAllUsers);
router.get('/bookings', AdminController.getAllBookings);
router.get('/lockers', AdminController.getAllLockers);
router.put('/lockers/:id/status', AdminController.updateLockerStatus);
router.put('/lockers/locations/:id/coordinates', AdminController.updateLocationCoordinates);
router.get('/access-logs', AdminController.getAllAccessLogs);
router.post('/backup', AdminController.triggerDatabaseBackup);

export default router;
