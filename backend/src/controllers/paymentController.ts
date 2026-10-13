import { Request, Response } from 'express';
import { db } from '../database.js';
import { PaymentService } from '../services/paymentService.js';
import { CONFIG } from '../config.js';

export class PaymentController {
  static simulatePayment(req: Request, res: Response) {
    try {
      if (!CONFIG.ENABLE_DEMO_SERVICES) {
        return res.status(403).json({
          success: false,
          message: 'Simulated payment processing is disabled. Sandbox operations are deactivated in this environment.',
        });
      }

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const { bookingId, lockerBookingId, amount, method = 'demo_card' } = req.body;

      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid payment amount.' });
      }

      // Verify booking authorization if associated with item booking
      if (bookingId) {
        const booking = db.prepare('SELECT renter_id, total_amount FROM bookings WHERE id = ?').get(bookingId) as any;
        if (!booking) {
          return res.status(404).json({ success: false, message: 'Associated booking not found.' });
        }
        if (booking.renter_id !== req.user.id && req.user.role !== 'admin') {
          return res.status(403).json({ success: false, message: 'Access denied. You do not own this booking.' });
        }
      }

      // Verify locker booking authorization if associated with locker
      if (lockerBookingId) {
        const lockerBooking = db.prepare('SELECT user_id, total_amount FROM locker_bookings WHERE id = ?').get(lockerBookingId) as any;
        if (!lockerBooking) {
          return res.status(404).json({ success: false, message: 'Associated locker booking not found.' });
        }
        if (lockerBooking.user_id !== req.user.id && req.user.role !== 'admin') {
          return res.status(403).json({ success: false, message: 'Access denied. You do not own this locker reservation.' });
        }
      }

      const allowedMethods = ['demo_card', 'demo_upi', 'demo_wallet'];
      const safeMethod = allowedMethods.includes(method) ? method : 'demo_card';

      const result = PaymentService.processDemoPayment({
        userId: req.user.id,
        amount: Number(amount),
        method: safeMethod as any,
        bookingId: bookingId ? Number(bookingId) : null,
        lockerBookingId: lockerBookingId ? Number(lockerBookingId) : null,
      });

      return res.json({
        ...result,
        isSandboxSimulation: true,
        notice: 'DEMO TRANSACTION: Simulated in sandbox environment. No actual bank or payment card transfer occurred.',
      });
    } catch (err: any) {
      console.error('[PaymentController.simulatePayment] Error:', err);
      return res.status(500).json({ success: false, message: 'Payment simulation failed.' });
    }
  }

  static getPaymentByReference(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const { ref } = req.params;
      const payment = db.prepare('SELECT * FROM payments WHERE transaction_ref = ?').get(ref) as any;

      if (!payment) {
        return res.status(404).json({ success: false, message: 'Payment reference not found.' });
      }

      // Security: Payer or Admin only
      if (payment.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied. You are not authorized to view this transaction.' });
      }

      return res.json({ success: true, payment });
    } catch (err: any) {
      console.error('[PaymentController.getPaymentByReference] Error:', err);
      return res.status(500).json({ success: false, message: 'Could not fetch payment record.' });
    }
  }

  static simulateRefund(req: Request, res: Response) {
    try {
      if (!CONFIG.ENABLE_DEMO_SERVICES) {
        return res.status(403).json({
          success: false,
          message: 'Simulated refund processing is disabled. Sandbox operations are deactivated in this environment.',
        });
      }

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const { bookingId, lockerBookingId } = req.body;

      if (bookingId) {
        const booking = db.prepare('SELECT renter_id FROM bookings WHERE id = ?').get(bookingId) as any;
        if (!booking) {
          return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        if (booking.renter_id !== req.user.id && req.user.role !== 'admin') {
          return res.status(403).json({ success: false, message: 'Access denied. You do not have permission to refund this booking.' });
        }
      }

      if (lockerBookingId) {
        const lockerBooking = db.prepare('SELECT user_id FROM locker_bookings WHERE id = ?').get(lockerBookingId) as any;
        if (!lockerBooking) {
          return res.status(404).json({ success: false, message: 'Locker booking not found.' });
        }
        if (lockerBooking.user_id !== req.user.id && req.user.role !== 'admin') {
          return res.status(403).json({ success: false, message: 'Access denied. You do not have permission to refund this locker reservation.' });
        }
      }

      const result = PaymentService.refundDemoPayment(
        bookingId ? Number(bookingId) : undefined,
        lockerBookingId ? Number(lockerBookingId) : undefined
      );

      return res.json({
        ...result,
        isSandboxSimulation: true,
        notice: 'DEMO REFUND: Simulated sandbox refund recorded in database.',
      });
    } catch (err: any) {
      console.error('[PaymentController.simulateRefund] Error:', err);
      return res.status(500).json({ success: false, message: 'Refund processing failed.' });
    }
  }
}
