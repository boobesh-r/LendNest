import { Router } from 'express';
import { LockerController } from '../controllers/lockerController.js';
import { authMiddleware, adminOnlyMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/locations', LockerController.getLocations);
router.get('/locations/:id', LockerController.getLocationById);
router.get('/lockers', LockerController.getLockers);
router.post('/book', authMiddleware, LockerController.bookLocker);
router.get('/booking/:id', authMiddleware, LockerController.getLockerBooking);
router.post('/unlock-demo', authMiddleware, LockerController.unlockLockerDemo);
router.get('/access-logs', authMiddleware, adminOnlyMiddleware, LockerController.getAccessLogs);

export default router;
