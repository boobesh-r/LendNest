import React, { useState } from 'react';
import { X, Calendar, ShieldCheck, CreditCard, QrCode, Wallet, CheckCircle2, ArrowRight } from 'lucide-react';
import { Item } from '../types.js';
import { api } from '../api.js';
import { formatINR } from '../utils/format.js';
import { getItemImageUrl, handleImageError } from '../utils/imageUtils.js';


interface CheckoutModalProps {
  item: Item;
  startDate: string;
  endDate: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (booking: any) => void;
  onNavigate?: (page: string) => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  item,
  startDate,
  endDate,
  isOpen,
  onClose,
  onSuccess,
  onNavigate,
  showToast,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'demo_card' | 'demo_upi' | 'demo_wallet'>('demo_card');
  const [renterNotes, setRenterNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null);

  if (!isOpen) return null;

  // Calculate days & totals
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const rentalFee = diffDays * item.price_per_day;
  const deposit = item.deposit || 0;
  const totalAmount = rentalFee + deposit;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.createBooking({
        item_id: item.id,
        start_date: startDate,
        end_date: endDate,
        renter_notes: renterNotes,
        payment_method: paymentMethod,
      });

      setConfirmedBooking(res.booking);
      showToast('Rental confirmed! Demo pickup code generated.', 'success');
      onSuccess(res.booking);
    } catch (err: any) {
      setError(err.message || 'Booking reservation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} id="checkout-modal-overlay">
      <div className="modal-content modal-content-lg" onClick={(e) => e.stopPropagation()} style={{ padding: '2rem' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: '#64748b' }}
          id="close-checkout-modal-btn"
        >
          <X size={20} />
        </button>

        {!confirmedBooking ? (
          <>
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'inline-flex', padding: '0.2rem 0.6rem', borderRadius: '4px', background: '#ecfdf5', color: '#059669', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                RESERVATION & SANDBOX CHECKOUT
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Confirm Your Rental</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Review details, select simulated payment method, and receive your demo pickup code.
              </p>
            </div>

            {/* Prominent Sandbox Disclaimer */}
            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1.5px solid #fde68a',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
                fontSize: '0.8rem',
                color: '#92400e',
                lineHeight: 1.45,
              }}
            >
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>⚠️</span>
              <div>
                <strong>SANDBOX TEST MODE:</strong> This is a simulated checkout. No real money or bank accounts will be debited. Connect a verified payment gateway (e.g. Razorpay or Stripe) before launching publicly.
              </div>
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: 'var(--status-danger-bg)',
                  color: '#b91c1c',
                  fontSize: '0.85rem',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1rem',
                  fontWeight: 500,
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              {/* Item Card Overview */}
              <div style={{ background: 'var(--bg-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <img
                    src={getItemImageUrl(item.image_url)}
                    alt={item.title}
                    onError={handleImageError}
                    style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }}
                  />

                  <div>
                    <span className="badge badge-tag" style={{ fontSize: '0.7rem', marginBottom: '0.25rem' }}>
                      {item.category}
                    </span>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.3 }}>{item.title}</h4>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Location: {item.location}
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={14} /> Rental Period:
                    </span>
                    <span style={{ fontWeight: 600 }}>{startDate} to {endDate}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Duration:</span>
                    <span style={{ fontWeight: 600 }}>{diffDays} day{diffDays > 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Daily Rate:</span>
                    <span style={{ fontWeight: 600 }}>{formatINR(item.price_per_day)}/day</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span>Rental Subtotal:</span>
                    <span>{formatINR(rentalFee)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      Security Deposit <ShieldCheck size={14} color="#059669" />
                    </span>
                    <span>{formatINR(deposit)}</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    *Security deposit is fully refunded after the item is returned in agreed condition.
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      color: 'var(--primary)',
                      borderTop: '2px dashed var(--border)',
                      paddingTop: '0.6rem',
                      marginTop: '0.4rem',
                    }}
                  >
                    <span>Total Due:</span>
                    <span>{formatINR(totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                  Choose Demo Payment Method:
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${paymentMethod === 'demo_card' ? 'var(--primary)' : 'var(--border)'}`,
                      backgroundColor: paymentMethod === 'demo_card' ? 'var(--primary-light)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      checked={paymentMethod === 'demo_card'}
                      onChange={() => setPaymentMethod('demo_card')}
                    />
                    <CreditCard size={18} color="var(--primary)" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Demo Credit / Debit Card</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Visa ending in •••• 4242 (Instant simulated approval)</div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${paymentMethod === 'demo_upi' ? 'var(--primary)' : 'var(--border)'}`,
                      backgroundColor: paymentMethod === 'demo_upi' ? 'var(--primary-light)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      checked={paymentMethod === 'demo_upi'}
                      onChange={() => setPaymentMethod('demo_upi')}
                    />
                    <QrCode size={18} color="var(--accent)" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Demo UPI / Instant QR</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>user@lendnest (Simulated UPI collect request)</div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${paymentMethod === 'demo_wallet' ? 'var(--primary)' : 'var(--border)'}`,
                      backgroundColor: paymentMethod === 'demo_wallet' ? 'var(--primary-light)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      checked={paymentMethod === 'demo_wallet'}
                      onChange={() => setPaymentMethod('demo_wallet')}
                    />
                    <Wallet size={18} color="#8b5cf6" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Demo Platform Wallet</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>LendNest Prepaid Balance</div>
                    </div>
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.825rem' }}>
                    Notes for Owner (Pickup timing, questions):
                  </label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="e.g. Planning to pick up Saturday morning around 10:30 AM"
                    value={renterNotes}
                    onChange={(e) => setRenterNotes(e.target.value)}
                    style={{ minHeight: '60px' }}
                  />
                </div>

                <div
                  style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fef3c7',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.75rem',
                    color: '#92400e',
                    lineHeight: 1.4,
                    marginBottom: '1rem',
                  }}
                >
                  ℹ️ <strong>Demo Simulation Mode:</strong> No real currency will be charged. This completes the entire end-to-end reservation flow and generates your pickup verification code.
                </div>

                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.85rem' }}
                  id="confirm-booking-btn"
                >
                  {loading ? 'Processing Demo Reservation...' : `Confirm & Pay ${formatINR(totalAmount)} (Demo)`}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Confirmation View */
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--status-available-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                color: 'var(--status-available)',
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
              Booking Confirmed!
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
              Your rental for <strong>{item.title}</strong> has been confirmed. The owner has been notified.
            </p>

            {/* Pickup Code Display */}
            <div
              style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '2px dashed var(--primary)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                maxWidth: '400px',
                margin: '0 auto 1.5rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Your DEMO Pickup Code
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: '#064e3b',
                  letterSpacing: '0.1em',
                  margin: '0.5rem 0',
                }}
              >
                {confirmedBooking.pickup_code}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#065f46' }}>
                Show this code or tell the owner upon item collection in {item.location}.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  onClose();
                  if (onNavigate) onNavigate('my-bookings');
                }}
                className="btn btn-primary"
                id="view-confirmed-bookings-btn"
              >
                View in My Bookings <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
