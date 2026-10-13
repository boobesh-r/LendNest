import { Router } from 'express';
import { BookingController } from '../controllers/bookingController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/', authMiddleware, BookingController.createBooking);
router.get('/my-bookings', authMiddleware, BookingController.getMyBookings);
router.get('/:id', authMiddleware, BookingController.getBookingById);
router.put('/:id/status', authMiddleware, BookingController.updateBookingStatus);
router.put('/:id/assign-locker', authMiddleware, BookingController.assignLockerHub);
router.post('/:id/cancel', authMiddleware, BookingController.cancelBooking);

export default router;
