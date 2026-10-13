import React, { useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  ShieldCheck,
  CheckCircle,
  Clock,
  Sparkles,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Item, User } from '../types.js';
import { formatINR } from '../utils/format.js';
import { getItemImageUrl, handleImageError } from '../utils/imageUtils.js';


interface ItemDetailsPageProps {
  item: Item;
  currentUser: User | null;
  onBack: () => void;
  onOpenCheckout: (item: Item, startDate: string, endDate: string) => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onNavigate: (page: string, params?: any) => void;
}

export const ItemDetailsPage: React.FC<ItemDetailsPageProps> = ({
  item,
  currentUser,
  onBack,
  onOpenCheckout,
  onOpenAuth,
  onNavigate,
}) => {
  // Setup default dates: tomorrow to 2 days after
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultStart = tomorrow.toISOString().split('T')[0];

  const inThreeDays = new Date();
  inThreeDays.setDate(inThreeDays.getDate() + 3);
  const defaultEnd = inThreeDays.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  // Compute rental duration
  const startObj = new Date(startDate);
  const endObj = new Date(endDate);
  const diffDays =
    !isNaN(startObj.getTime()) && !isNaN(endObj.getTime()) && endObj >= startObj
      ? Math.ceil(Math.abs(endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 0;

  const rentalFee = diffDays * item.price_per_day;
  const deposit = item.deposit || 0;
  const totalAmount = rentalFee + deposit;

  // Check date conflict with booked dates
  const hasConflict = item.bookedDates?.some((b) => {
    return startDate <= b.end_date && endDate >= b.start_date;
  });

  const isOwner = currentUser && currentUser.id === item.owner_id;

  const handleBookClick = () => {
    if (!currentUser) {
      onOpenAuth('login');
      return;
    }
    if (diffDays <= 0) {
      alert('Please choose valid rental start and end dates.');
      return;
    }
    if (hasConflict) {
      alert('The item is already booked for parts of these dates. Please choose alternate dates.');
      return;
    }
    onOpenCheckout(item, startDate, endDate);
  };

  return (
    <div className="container" style={{ padding: '2.5rem 1.25rem' }}>
      {/* Back button */}
      <button
        onClick={onBack}
        className="btn btn-secondary btn-sm"
        style={{ marginBottom: '1.75rem' }}
        id="item-details-back-btn"
      >
        <ArrowLeft size={16} /> Back to Listings
      </button>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '2.5rem',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Image & Details */}
        <div>
          <div
            style={{
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-md)',
              border: '1px solid var(--border)',
              backgroundColor: '#fff',
              marginBottom: '1.75rem',
            }}
          >
            <img
              src={getItemImageUrl(item.image_url)}
              alt={item.title}
              onError={handleImageError}
              style={{ width: '100%', height: '420px', objectFit: 'cover' }}
            />

          </div>

          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span className="badge badge-tag" style={{ fontSize: '0.825rem' }}>
              Category: {item.category}
            </span>
            <span className="badge badge-available" style={{ fontSize: '0.825rem' }}>
              Condition: {item.item_condition}
            </span>
            <span className="badge badge-tag" style={{ fontSize: '0.825rem' }}>
              <MapPin size={13} color="#059669" /> {item.location}
            </span>
          </div>

          <h1 style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.25, color: 'var(--text-main)', marginBottom: '1rem' }}>
            {item.title}
          </h1>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Description & Features</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.95rem' }}>
              {item.description}
            </p>
          </div>

          {/* Owner Info Card */}
          <div
            style={{
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img
                src={item.owner_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${item.owner_name}`}
                alt={item.owner_name}
                style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>{item.owner_name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Verified Host • Located in {item.owner_location || item.location}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#10b981', fontSize: '0.75rem', fontWeight: 700, marginTop: '0.2rem' }}>
                  <ShieldCheck size={14} /> ID Verified & Member Protection Active
                </div>
              </div>
            </div>
          </div>

          {/* Pickup Instructions Notice */}
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              fontSize: '0.875rem',
              color: '#166534',
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
              <CheckCircle size={16} /> Pickup & Return Process:
            </div>
            Upon booking confirmation, you will receive a <strong>unique DEMO Pickup Code</strong>. Present this code at the pickup point in {item.location} to verify item release. You can inspect the item together before taking it.
          </div>
        </div>

        {/* Right Column: Interactive Booking Card */}
        <div
          style={{
            position: 'sticky',
            top: '90px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>
                {formatINR(item.price_per_day)}
              </span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}> / day</span>
            </div>
            <span className={`badge ${item.available ? 'badge-available' : 'badge-danger'}`}>
              {item.available ? 'In Stock' : 'Unavailable'}
            </span>
          </div>

          {!item.available && (
            <div
              style={{
                backgroundColor: 'var(--status-danger-bg)',
                border: '1px solid #fca5a5',
                color: '#b91c1c',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.825rem',
                marginBottom: '1rem',
                display: 'flex',
                gap: '0.4rem',
                alignItems: 'center',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>This item has been marked unavailable by its host and is not accepting new reservations.</span>
            </div>
          )}

          {isOwner && (
            <div
              style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1e40af',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.825rem',
                marginBottom: '1rem',
              }}
            >
              ℹ️ You listed this item. You can edit details in your Profile.
            </div>
          )}

          {item.bookedDates && item.bookedDates.length > 0 && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                fontSize: '0.8rem',
                marginBottom: '1rem',
              }}
            >
              <div style={{ fontWeight: 700, color: '#334155', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={13} color="#059669" /> Existing Booked Dates:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {item.bookedDates.map((bd, idx) => (
                  <span
                    key={idx}
                    style={{
                      backgroundColor: '#fee2e2',
                      color: '#991b1b',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    {bd.start_date} to {bd.end_date}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem' }}>
                Please select rental dates outside of the ranges listed above.
              </div>
            </div>
          )}

          {hasConflict && (
            <div
              style={{
                backgroundColor: 'var(--status-danger-bg)',
                border: '1px solid #fca5a5',
                color: '#b91c1c',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.825rem',
                marginBottom: '1rem',
                display: 'flex',
                gap: '0.4rem',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>This item has an existing reservation during your selected dates. Please select other dates.</span>
            </div>
          )}

          {/* Date Picker Form */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Start Date</label>
              <input
                type="date"
                className="form-control"
                value={startDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setStartDate(e.target.value)}
                id="item-start-date-input"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>End Date</label>
              <input
                type="date"
                className="form-control"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                id="item-end-date-input"
              />
            </div>
          </div>

          {/* Cost Calculation Summary */}
          <div
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              fontSize: '0.875rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                {formatINR(item.price_per_day)} × {diffDays} day{diffDays > 1 ? 's' : ''}:
              </span>
              <span style={{ fontWeight: 600 }}>{formatINR(rentalFee)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Refundable Deposit:</span>
              <span style={{ fontWeight: 600 }}>{formatINR(deposit)}</span>
            </div>

            <div
              style={{
                borderTop: '1px solid var(--border)',
                paddingTop: '0.6rem',
                marginTop: '0.3rem',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1.1rem',
                fontWeight: 800,
                color: 'var(--text-main)',
              }}
            >
              <span>Estimated Total:</span>
              <span style={{ color: 'var(--primary)' }}>{formatINR(totalAmount)}</span>
            </div>
          </div>

          {/* Book action button */}
          <button
            onClick={handleBookClick}
            disabled={Boolean(isOwner || !item.available || hasConflict || diffDays <= 0)}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginBottom: '0.75rem' }}
            id="item-reserve-btn"
          >
            {isOwner
              ? 'Your Listing'
              : !item.available
              ? 'Item Unavailable'
              : hasConflict
              ? 'Dates Unavailable'
              : 'Proceed to Reserve'}
          </button>

          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            🔒 Instant demo confirmation • No actual bank charge
          </div>
        </div>
      </div>
    </div>
  );
};
