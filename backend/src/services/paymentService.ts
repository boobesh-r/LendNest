import crypto from 'crypto';
import { db } from '../database.js';

export interface PaymentParams {
  userId: number;
  amount: number;
  currency?: string;
  method: 'demo_card' | 'demo_upi' | 'demo_wallet';
  bookingId?: number | null;
  lockerBookingId?: number | null;
}

export class PaymentService {
  /**
   * Process a simulated payment for item rental or locker booking.
   * Clearly marked as demo payment; records transaction reference and status.
   */
  static processDemoPayment(params: PaymentParams) {
    const { userId, amount, currency = 'INR', method, bookingId = null, lockerBookingId = null } = params;

    // Generate simulated reference
    const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
    const transactionRef = `TXN-DEMO-${Date.now().toString().slice(-6)}-${randomSuffix}`;

    const stmt = db.prepare(`
      INSERT INTO payments (booking_id, locker_booking_id, user_id, amount, currency, status, method, transaction_ref)
      VALUES (?, ?, ?, ?, ?, 'paid', ?, ?)
    `);

    const result = stmt.run(bookingId, lockerBookingId, userId, amount, currency, method, transactionRef);

    return {
      success: true,
      paymentId: Number(result.lastInsertRowid),
      transactionRef,
      amount,
      currency,
      method,
      status: 'paid',
      isDemo: true,
      message: 'Demo payment simulated successfully. No actual funds were transferred.',
    };
  }

  /**
   * Process a simulated refund for a cancelled booking.
   */
  static refundDemoPayment(bookingId?: number, lockerBookingId?: number) {
    let payment = null;
    if (bookingId) {
      payment = db.prepare(`SELECT * FROM payments WHERE booking_id = ? AND status = 'paid'`).get(bookingId) as any;
    } else if (lockerBookingId) {
      payment = db.prepare(`SELECT * FROM payments WHERE locker_booking_id = ? AND status = 'paid'`).get(lockerBookingId) as any;
    }

    if (!payment) {
      return { success: false, message: 'No paid transaction found to refund.' };
    }

    db.prepare(`UPDATE payments SET status = 'refunded' WHERE id = ?`).run(payment.id);

    return {
      success: true,
      paymentId: payment.id,
      transactionRef: payment.transaction_ref,
      refundedAmount: payment.amount,
      status: 'refunded',
      message: `Demo refund of ₹${payment.amount.toLocaleString('en-IN')} processed to original payment method.`,
    };
  }
}
