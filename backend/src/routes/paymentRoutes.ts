import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/simulate', authMiddleware, PaymentController.simulatePayment);
router.get('/:ref', authMiddleware, PaymentController.getPaymentByReference);
router.post('/refund', authMiddleware, PaymentController.simulateRefund);

export default router;
