# 💳 LendNest — Payment Service & Gateway Integration Guide

This document explains the **Payment Simulation Engine** implemented in the LendNest MVP and provides the technical blueprint for connecting legitimate payment gateways (such as Stripe, Razorpay, or UPI).

---

## 1. Prototype Simulation Architecture

The MVP includes a zero-cost, privacy-respecting demo payment simulation (`backend/src/services/paymentService.ts`):

- **No Real Bank Data Collected**: Never asks for or stores actual credit card numbers, CVVs, UPI PINs, or netbanking passwords.
- **Realistic Lifecycle**: Generates unique transaction references (`TXN-DEMO-XXXXXX`) and updates transaction statuses (`paid`, `refunded`).
- **Safety Assurance**: The frontend explicitly badges all demo checkouts as `Demo Payment Simulation` to avoid confusing testers.

---

## 2. Integration Blueprint: Stripe (Card & Apple/Google Pay)

To connect Stripe for live production rentals:

### A. Environment Configuration
Add to `backend/.env`:
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PUBLIC_KEY=pk_live_...
```

### B. Server-Side Intent Creation
Replace the simulated payment handler with Stripe's PaymentIntent API:
```typescript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

export async function createRentalPaymentIntent(amount: number, currency: string = 'usd', bookingId: number) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // In cents
    currency,
    metadata: { bookingId: bookingId.toString() },
    payment_method_types: ['card'],
  });
  return paymentIntent.client_secret;
}
```

### C. Secure Webhook Verification
Never trust client-side checkout completion. Always confirm payments using verified server-side webhooks:
```typescript
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return res.status(400).send(`Webhook Signature Verification Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const bookingId = paymentIntent.metadata.bookingId;
    // Mark booking as confirmed in SQLite database
    db.prepare("UPDATE bookings SET status = 'confirmed' WHERE id = ?").run(bookingId);
  }
  res.json({ received: true });
});
```

---

## 3. Integration Blueprint: Razorpay & UPI Direct Payments

For UPI auto-pay or instant QR payments:

1. **Order Creation**: Call `razorpay.orders.create({ amount, currency: 'INR', receipt: bookingId })`.
2. **Client Checkout**: Render Razorpay Standard Checkout in React. User completes UPI payment in their preferred app (Google Pay, PhonePe, Paytm).
3. **HMAC Signature Verification**:
   ```typescript
   const expectedSignature = crypto
     .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
     .update(`${orderId}|${paymentId}`)
     .digest('hex');

   if (expectedSignature === razorpaySignature) {
     // Validated payment - confirm reservation
   }
   ```

---

## 4. Refund Architecture for Security Deposits

LendNest items feature refundable security deposits. When an item is returned:
1. Owner marks rental as completed.
2. LendNest triggers `stripe.refunds.create({ payment_intent: txnId, amount: depositCents })`.
3. Deposit returns to the renter's original payment method automatically within 3–5 business days.
