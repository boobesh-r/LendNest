import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Lock,
  Package,
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
  User as UserIcon,
  Navigation,
  ExternalLink,
  Cpu,
  X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Booking, LockerBooking, LockerLocation, User } from '../types.js';
import { api } from '../api.js';
import { formatINR } from '../utils/format.js';
import { handleImageError } from '../utils/imageUtils.js';


interface MyBookingsPageProps {
  currentUser: User | null;
  onNavigate: (page: string, params?: any) => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const MyBookingsPage: React.FC<MyBookingsPageProps> = ({
  currentUser,
  onNavigate,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'items' | 'lockers' | 'incoming'>('items');
  const [itemBookings, setItemBookings] = useState<Booking[]>([]);
  const [incomingBookings, setIncomingBookings] = useState<Booking[]>([]);
  const [lockerBookings, setLockerBookings] = useState<LockerBooking[]>([]);
  const [loading, setLoading] = useState(true);

  // QR Modal
  const [selectedLockerQR, setSelectedLockerQR] = useState<LockerBooking | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Unlock simulation state
  const [unlockingId, setUnlockingId] = useState<number | null>(null);

  // Locker assignment modal (Lender handover)
  const [assignModalBooking, setAssignModalBooking] = useState<Booking | null>(null);
  const [availableHubs, setAvailableHubs] = useState<LockerLocation[]>([]);
  const [loadingHubs, setLoadingHubs] = useState(false);
  const [selectedHubId, setSelectedHubId] = useState<number | null>(null);
  const [selectedSizePref, setSelectedSizePref] = useState<string>('');
  const [assigningHub, setAssigningHub] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.getMyBookings();
      setItemBookings(res.itemBookings);
      setIncomingBookings(res.incomingBookings);
      setLockerBookings(res.lockerBookings);
    } catch (err: any) {
      showToast('Failed to load bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Pickup code ${code} copied to clipboard!`, 'info');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleCancelBooking = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this booking? A demo refund will be issued.')) return;
    try {
      const res = await api.cancelBooking(id);
      showToast(res.message, 'success');
      fetchBookings();
    } catch (err: any) {
      showToast(err.message || 'Could not cancel booking.', 'error');
    }
  };

  const handleUpdateStatus = async (id: number, status: 'completed' | 'cancelled') => {
    const actionText = status === 'completed'
      ? 'Mark this rental as completed? This confirms that the gear was returned safely and releases the reservation.'
      : 'Cancel / decline this rental request? A demo refund will be issued to the renter.';
    if (!window.confirm(actionText)) return;

    try {
      const res = await api.updateBookingStatus(id, status);
      showToast(res.message, 'success');
      fetchBookings();
    } catch (err: any) {
      showToast(err.message || 'Failed to update booking status.', 'error');
    }
  };

  const handleUnlockLocker = async (booking: LockerBooking) => {
    if (!booking.qr_token) {
      showToast('No active QR token found for this locker.', 'error');
      return;
    }
    setUnlockingId(booking.id);
    try {
      const res = await api.unlockLockerDemo(booking.qr_token);
      showToast(`⚡ ${res.message}`, 'success');
      fetchBookings();
    } catch (err: any) {
      showToast(err.message || 'Unlock simulation failed.', 'error');
    } finally {
      setUnlockingId(null);
    }
  };

  const handleOpenAssignModal = async (booking: Booking) => {
    setAssignModalBooking(booking);
    setSelectedHubId(booking.locker_location_id || null);
    setSelectedSizePref(booking.assigned_locker_size || '');
    setLoadingHubs(true);
    try {
      const res = await api.getLockerLocations();
      setAvailableHubs(res.locations);
      if (!booking.locker_location_id && res.locations.length > 0) {
        const firstWithAvailable = res.locations.find((l) => l.available_lockers > 0);
        setSelectedHubId(firstWithAvailable ? firstWithAvailable.id : res.locations[0].id);
      }
    } catch {
      showToast('Failed to load locker hubs', 'error');
    } finally {
      setLoadingHubs(false);
    }
  };

  const handleConfirmAssignLocker = async () => {
    if (!assignModalBooking || !selectedHubId) return;
    setAssigningHub(true);
    try {
      const res = await api.assignBookingLocker(assignModalBooking.id, {
        locker_location_id: selectedHubId,
        size_preference: selectedSizePref || undefined,
      });
      showToast(res.message, 'success');
      setAssignModalBooking(null);
      fetchBookings();
    } catch (err: any) {
      showToast(err.message || 'Failed to assign smart locker hub.', 'error');
    } finally {
      setAssigningHub(false);
    }
  };

  return (
    <div className="container" style={{ padding: '2.5rem 1.25rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
          My Reservations & Lockers
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Track active gear rentals, view pickup codes, and access contactless smart lockers.
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          marginBottom: '2rem',
          gap: '1rem',
        }}
      >
        <button
          onClick={() => setActiveTab('items')}
          style={{
            padding: '0.85rem 1.25rem',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: activeTab === 'items' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'items' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease',
          }}
          id="tab-item-rentals-btn"
        >
          <Package size={18} /> Gear Rentals ({itemBookings.length})
        </button>

        <button
          onClick={() => setActiveTab('lockers')}
          style={{
            padding: '0.85rem 1.25rem',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: activeTab === 'lockers' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'lockers' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease',
          }}
          id="tab-locker-rentals-btn"
        >
          <Lock size={18} /> Smart Lockers ({lockerBookings.length})
        </button>

        <button
          onClick={() => setActiveTab('incoming')}
          style={{
            padding: '0.85rem 1.25rem',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: activeTab === 'incoming' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'incoming' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease',
          }}
          id="tab-incoming-rentals-btn"
        >
          <CalendarCheck size={18} /> Bookings for My Items ({incomingBookings.length})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
          Loading your reservations...
        </div>
      ) : (
        <>
          {/* TAB 1: Item Rentals */}
          {activeTab === 'items' && (
            <div>
              {itemBookings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                  <Package size={36} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>No item rentals yet</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    Need a tool, camera, or outdoor equipment? Explore the marketplace today.
                  </p>
                  <button onClick={() => onNavigate('browse')} className="btn btn-primary">
                    Browse Gear
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {itemBookings.map((b) => (
                    <div
                      key={b.id}
                      className="card"
                      style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', alignItems: 'center' }}
                    >
                      {/* Item Overview */}
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <img
                          src={b.item_image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=200'}
                          alt={b.item_title}
                          onError={handleImageError}
                          style={{ width: '90px', height: '90px', borderRadius: '12px', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            Booking #{b.id} • {b.item_category}
                          </div>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.3 }}>{b.item_title}</h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            <MapPin size={13} color="#059669" /> {b.item_location}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            Host: <strong>{b.owner_name}</strong> {b.owner_phone ? `(📞 ${b.owner_phone})` : ''}
                          </div>
                        </div>
                      </div>

                      {/* Dates & Cost */}
                      <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', fontWeight: 600 }}>
                          <Calendar size={15} color="#059669" /> {b.start_date} to {b.end_date}
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>
                          Duration: {b.total_days} day{b.total_days > 1 ? 's' : ''}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary)' }}>
                          Total Paid: {formatINR(b.total_amount)}{' '}
                          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                            ({formatINR(b.deposit_amount)} refundable dep.)
                          </span>
                        </div>
                        <div>
                          <span className={`badge ${b.status === 'confirmed' ? 'badge-available' : b.status === 'completed' ? 'badge-tag' : 'badge-danger'}`}>
                            {b.status === 'confirmed' ? '● Active / Confirmed' : b.status === 'completed' ? '✓ Completed & Returned' : '✕ Cancelled & Refunded'}
                          </span>
                        </div>
                      </div>

                      {/* Pickup Code Box */}
                      <div
                        style={{
                          backgroundColor: '#f0fdf4',
                          border: '1.5px dashed #059669',
                          borderRadius: 'var(--radius-md)',
                          padding: '0.85rem 1.1rem',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>
                          DEMO Pickup Code
                        </div>
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '1.4rem',
                            fontWeight: 800,
                            color: '#064e3b',
                            letterSpacing: '0.08em',
                            margin: '0.2rem 0',
                          }}
                        >
                          {b.pickup_code}
                        </div>
                        <button
                          onClick={() => handleCopyCode(b.pickup_code)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', margin: '0 auto' }}
                        >
                          {copiedCode === b.pickup_code ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                          {copiedCode === b.pickup_code ? 'Copied' : 'Copy Code'}
                        </button>
                      </div>

                      {/* Actions */}
                      <div style={{ textAlign: 'right' }}>
                        {b.status === 'confirmed' && (
                          <button
                            onClick={() => handleCancelBooking(b.id)}
                            className="btn btn-danger-outline btn-sm"
                          >
                            Cancel Rental (Refund)
                          </button>
                        )}
                        {b.status === 'completed' && (
                          <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
                            ✓ Rental returned & deposit settled
                          </div>
                        )}
                        {b.status === 'cancelled' && (
                          <div style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>
                            Simulated refund processed
                          </div>
                        )}
                      </div>

                      {/* Contactless Locker Pickup or Direct Handover Details */}
                      {b.locker_hub_name ? (
                        <div
                          style={{
                            gridColumn: '1 / -1',
                            marginTop: '0.25rem',
                            backgroundColor: '#f0fdf4',
                            border: '1.5px solid #86efac',
                            borderRadius: 'var(--radius-md)',
                            padding: '1rem 1.25rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.65rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  backgroundColor: '#059669',
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Lock size={16} />
                              </div>
                              <div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  Assigned Contactless Smart Locker Pickup (Simulation)
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#064e3b' }}>
                                  {b.locker_hub_name} • Compartment #{b.assigned_locker_number} ({b.assigned_locker_size})
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {b.locker_hub_lat != null && b.locker_hub_lng != null && (
                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${b.locker_hub_lat},${b.locker_hub_lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-secondary btn-sm"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    fontSize: '0.78rem',
                                    textDecoration: 'none',
                                    padding: '0.35rem 0.75rem',
                                  }}
                                  id={`directions-booking-${b.id}`}
                                >
                                  <Navigation size={13} color="#059669" /> Get Directions
                                </a>
                              )}
                              <button
                                onClick={() => onNavigate('locker-map', { hubId: b.locker_location_id })}
                                className="btn btn-secondary btn-sm"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  fontSize: '0.78rem',
                                  padding: '0.35rem 0.75rem',
                                }}
                                id={`view-map-booking-${b.id}`}
                              >
                                <MapPin size={13} color="#059669" /> View on Hub Map
                              </button>
                            </div>
                          </div>

                          <div
                            style={{
                              fontSize: '0.825rem',
                              color: '#166534',
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                              gap: '0.6rem',
                              backgroundColor: 'rgba(255,255,255,0.75)',
                              padding: '0.75rem 1rem',
                              borderRadius: '6px',
                            }}
                          >
                            <div>
                              <strong>Hub Location:</strong> {b.locker_hub_address}, {b.locker_hub_city}
                            </div>
                            <div>
                              <strong>Pickup Instructions:</strong> Arrive at the hub, locate compartment <strong>#{b.assigned_locker_number}</strong>, and enter your pickup code <strong>{b.pickup_code}</strong> to unlock.
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            gridColumn: '1 / -1',
                            backgroundColor: 'var(--bg-subtle)',
                            borderRadius: 'var(--radius-md)',
                            padding: '0.65rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <MapPin size={14} color="#64748b" /> Handover Method: Direct in-person meeting arranged with host in {b.item_location}
                          </div>
                          <button
                            onClick={() => onNavigate('locker-map')}
                            className="btn btn-link btn-sm"
                            style={{ fontSize: '0.75rem', color: 'var(--primary)', padding: 0 }}
                          >
                            Browse Smart Locker Hubs →
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Smart Lockers */}
          {activeTab === 'lockers' && (
            <div>
              {lockerBookings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                  <Lock size={36} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>No smart locker reservations</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    Store packages, gear, or arrange automated contactless drop-offs with digital QR access.
                  </p>
                  <button onClick={() => onNavigate('lockers')} className="btn btn-primary">
                    Book a Smart Locker
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                  {lockerBookings.map((lb) => (
                    <div key={lb.id} className="card" style={{ padding: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span className="badge badge-tag">
                          Locker #{lb.locker_number} • Size: {lb.locker_size}
                        </span>
                        <span className={`badge ${lb.status === 'active' ? 'badge-available' : 'badge-tag'}`}>
                          {lb.status}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                        {lb.location_name}
                      </h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        {lb.location_address}
                      </div>

                      <div style={{ backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem', fontSize: '0.825rem', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Reserved Time:</span>
                          <span style={{ fontWeight: 600 }}>{lb.duration_hours} Hours</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Total Fee:</span>
                          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatINR(lb.total_amount)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Token Status:</span>
                          <span style={{ fontWeight: 600, color: '#059669' }}>Active QR Token</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                          onClick={() => setSelectedLockerQR(lb)}
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1 }}
                        >
                          <QrCode size={16} /> Show QR Pass
                        </button>
                        <button
                          onClick={() => handleUnlockLocker(lb)}
                          disabled={unlockingId === lb.id || lb.status !== 'active'}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1 }}
                        >
                          {unlockingId === lb.id ? 'Unlocking...' : '⚡ Unlock Door (Demo)'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Incoming Bookings for My Items (Lender Dashboard) */}
          {activeTab === 'incoming' && (
            <div>
              {incomingBookings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                  <CalendarCheck size={36} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>No incoming rental requests</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    When other neighbors book your listed items, their reservations and pickup codes appear here for you to verify and manage.
                  </p>
                  <button onClick={() => onNavigate('add-listing')} className="btn btn-primary">
                    List an Item to Earn
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {incomingBookings.map((b) => (
                    <div
                      key={b.id}
                      className="card"
                      style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', alignItems: 'center' }}
                    >
                      {/* Item and Renter Info */}
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <img
                          src={b.item_image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=200'}
                          alt={b.item_title}
                          onError={handleImageError}
                          style={{ width: '84px', height: '84px', borderRadius: '12px', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Booking #{b.id} for your item</div>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{b.item_title}</h3>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            Renter: <strong>{b.renter_name}</strong>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.2rem' }}>
                            <span>✉️ {b.renter_email}</span>
                            {b.renter_phone && <span>📞 {b.renter_phone}</span>}
                          </div>
                          {b.renter_notes && (
                            <div style={{ fontSize: '0.78rem', color: '#475569', backgroundColor: 'var(--bg-subtle)', padding: '0.3rem 0.5rem', borderRadius: '4px', marginTop: '0.35rem' }}>
                              📝 Note: "{b.renter_notes}"
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Dates, Status & Earnings */}
                      <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={15} color="#059669" /> {b.start_date} to {b.end_date}
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>{b.total_days} rental day{b.total_days > 1 ? 's' : ''}</div>
                        <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1rem' }}>
                          Host Payout: {formatINR(b.rental_price)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Deposit Held: {formatINR(b.deposit_amount)}
                        </div>
                        <div>
                          <span className={`badge ${b.status === 'confirmed' ? 'badge-available' : b.status === 'completed' ? 'badge-tag' : 'badge-danger'}`}>
                            {b.status === 'confirmed' ? '● Active Booking' : b.status === 'completed' ? '✓ Completed & Returned' : '✕ Cancelled'}
                          </span>
                        </div>
                      </div>

                      {/* Pickup Code Verification */}
                      <div
                        style={{
                          backgroundColor: '#f0fdf4',
                          border: '1.5px dashed #059669',
                          padding: '0.85rem 1.1rem',
                          borderRadius: 'var(--radius-md)',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: '0.7rem', color: '#065f46', fontWeight: 700 }}>VERIFY RENTER'S CODE:</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.35rem', color: '#064e3b', letterSpacing: '0.08em', margin: '0.2rem 0' }}>
                          {b.pickup_code}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#065f46' }}>
                          Ask renter for this code before handing over gear.
                        </div>
                      </div>

                      {/* Host Lifecycle Controls */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                        {b.status === 'confirmed' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(b.id, 'completed')}
                              className="btn btn-primary btn-sm"
                              style={{ width: '100%', maxWidth: '210px' }}
                            >
                              <CheckCircle size={14} /> Mark as Returned
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(b.id, 'cancelled')}
                              className="btn btn-danger-outline btn-sm"
                              style={{ width: '100%', maxWidth: '210px' }}
                            >
                              <XCircle size={14} /> Cancel & Refund
                            </button>
                          </>
                        )}
                        {b.status === 'completed' && (
                          <div style={{ fontSize: '0.825rem', color: '#059669', fontWeight: 600 }}>
                            ✓ Rental returned & completed!
                          </div>
                        )}
                        {b.status === 'cancelled' && (
                          <div style={{ fontSize: '0.825rem', color: '#dc2626', fontWeight: 600 }}>
                            Reservation cancelled & refunded
                          </div>
                        )}
                      </div>

                      {/* Host Locker Handover Arrangement */}
                      {b.locker_hub_name ? (
                        <div
                          style={{
                            gridColumn: '1 / -1',
                            marginTop: '0.25rem',
                            backgroundColor: '#f0fdf4',
                            border: '1.5px solid #86efac',
                            borderRadius: 'var(--radius-md)',
                            padding: '1rem 1.25rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.65rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  backgroundColor: '#059669',
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Lock size={16} />
                              </div>
                              <div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  Assigned Smart Locker Handover (Simulation)
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#064e3b' }}>
                                  {b.locker_hub_name} • Compartment #{b.assigned_locker_number} ({b.assigned_locker_size})
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {b.locker_hub_lat != null && b.locker_hub_lng != null && (
                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${b.locker_hub_lat},${b.locker_hub_lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-secondary btn-sm"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    fontSize: '0.78rem',
                                    textDecoration: 'none',
                                    padding: '0.35rem 0.75rem',
                                  }}
                                  id={`host-directions-${b.id}`}
                                >
                                  <Navigation size={13} color="#059669" /> Get Directions
                                </a>
                              )}
                              <button
                                onClick={() => onNavigate('locker-map', { hubId: b.locker_location_id })}
                                className="btn btn-secondary btn-sm"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  fontSize: '0.78rem',
                                  padding: '0.35rem 0.75rem',
                                }}
                                id={`host-map-${b.id}`}
                              >
                                <MapPin size={13} color="#059669" /> View on Hub Map
                              </button>
                              {b.status === 'confirmed' && (
                                <button
                                  onClick={() => handleOpenAssignModal(b)}
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                                  id={`change-hub-btn-${b.id}`}
                                >
                                  Change Hub
                                </button>
                              )}
                            </div>
                          </div>

                          <div
                            style={{
                              fontSize: '0.825rem',
                              color: '#166534',
                              backgroundColor: 'rgba(255,255,255,0.75)',
                              padding: '0.75rem 1rem',
                              borderRadius: '6px',
                            }}
                          >
                            📍 <strong>Host Drop-off Location:</strong> {b.locker_hub_address}, {b.locker_hub_city}.
                            Deposit gear in compartment <strong>#{b.assigned_locker_number}</strong> prior to rental start. Renter will retrieve it using code <strong>{b.pickup_code}</strong>.
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            gridColumn: '1 / -1',
                            backgroundColor: '#f8fafc',
                            border: '1px dashed #cbd5e1',
                            borderRadius: 'var(--radius-md)',
                            padding: '0.85rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '0.75rem',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                              Handover Preference: Direct In-Person Handover
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              You can arrange contactless smart locker handover instead by assigning an eligible locker hub.
                            </div>
                          </div>
                          {b.status === 'confirmed' && (
                            <button
                              onClick={() => handleOpenAssignModal(b)}
                              className="btn btn-secondary btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
                              id={`assign-hub-btn-${b.id}`}
                            >
                              <Lock size={13} color="#059669" /> Assign Smart Locker Hub
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* QR Code Modal */}
      {selectedLockerQR && (
        <div className="modal-overlay" onClick={() => setSelectedLockerQR(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '2rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.25rem' }}>
              Smart Locker QR Pass
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Locker {selectedLockerQR.locker_number} • {selectedLockerQR.location_name}
            </p>

            <div
              style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                display: 'inline-block',
                boxShadow: 'var(--shadow-md)',
                marginBottom: '1.5rem',
              }}
            >
              <QRCodeSVG
                value={selectedLockerQR.qr_token || 'LENDNEST-DEMO-TOKEN'}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', background: 'var(--bg-subtle)', padding: '0.5rem', borderRadius: '6px', color: '#334155', marginBottom: '1.25rem' }}>
              {selectedLockerQR.qr_token}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  handleUnlockLocker(selectedLockerQR);
                  setSelectedLockerQR(null);
                }}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                ⚡ Trigger Door Unlock Demo
              </button>
              <button
                onClick={() => setSelectedLockerQR(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lender Locker Hub Assignment Modal */}
      {assignModalBooking && (
        <div className="modal-overlay" onClick={() => setAssignModalBooking(null)} id="assign-locker-modal-overlay">
          <div
            className="modal-content modal-content-lg"
            onClick={(e) => e.stopPropagation()}
            style={{ padding: '2rem', maxWidth: '640px', width: '90%' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'inline-flex', padding: '0.2rem 0.6rem', borderRadius: '4px', background: '#ecfdf5', color: '#059669', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  PEER-TO-PEER HANDOVER
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Assign Smart Locker Hub
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Select an automated smart locker station for contactless handover of <strong>{assignModalBooking.item_title}</strong> (Booking #{assignModalBooking.id}).
                </p>
              </div>
              <button
                onClick={() => setAssignModalBooking(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {loadingHubs ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                Checking real-time locker compartment availability...
              </div>
            ) : availableHubs.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No active smart locker hubs configured.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '55vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  1. Choose Locker Station ({availableHubs.length} Configured Hubs):
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {availableHubs.map((hub) => {
                    const isSelected = selectedHubId === hub.id;
                    const isSoldOut = hub.available_lockers <= 0;

                    return (
                      <div
                        key={hub.id}
                        onClick={() => {
                          if (!isSoldOut) setSelectedHubId(hub.id);
                        }}
                        style={{
                          border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          padding: '1rem',
                          backgroundColor: isSelected ? 'var(--primary-light)' : isSoldOut ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                          cursor: isSoldOut ? 'not-allowed' : 'pointer',
                          opacity: isSoldOut ? 0.6 : 1,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                            <input
                              type="radio"
                              name="hub_selection"
                              checked={isSelected}
                              disabled={isSoldOut}
                              onChange={() => setSelectedHubId(hub.id)}
                              style={{ marginTop: '0.25rem' }}
                            />
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                                {hub.name}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                                {hub.address}, {hub.city} ({hub.postal_code})
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                🕒 Hours: {hub.operating_hours || '24/7 Access'}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <span
                              className={`badge ${
                                isSoldOut
                                  ? 'badge-danger'
                                  : hub.available_lockers <= 2
                                  ? 'badge-maintenance'
                                  : 'badge-available'
                              }`}
                            >
                              {isSoldOut ? '0 Free' : `${hub.available_lockers} Free`}
                            </span>
                          </div>
                        </div>

                        {/* Compartment breakdown */}
                        {!isSoldOut && (
                          <div
                            style={{
                              marginTop: '0.6rem',
                              paddingTop: '0.6rem',
                              borderTop: '1px solid var(--border)',
                              display: 'flex',
                              gap: '0.75rem',
                              fontSize: '0.75rem',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            <span>Small: <strong>{hub.available_small ?? 0}</strong></span>
                            <span>Medium: <strong>{hub.available_medium ?? 0}</strong></span>
                            <span>Large: <strong>{hub.available_large ?? 0}</strong></span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Size Preference */}
                <div style={{ marginTop: '0.5rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                    2. Locker Compartment Size Preference:
                  </label>
                  <select
                    className="form-control"
                    value={selectedSizePref}
                    onChange={(e) => setSelectedSizePref(e.target.value)}
                    style={{ fontSize: '0.875rem' }}
                  >
                    <option value="">Any Available Size (Auto-assign)</option>
                    <option value="Small">Small Compartment (Handhelds, Cameras, Drones)</option>
                    <option value="Medium">Medium Compartment (Power tools, Camping packs)</option>
                    <option value="Large">Large Compartment (Tents, Projectors, Oversized gear)</option>
                  </select>
                </div>

                {/* Simulation Notice */}
                <div
                  style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.75rem',
                    color: '#92400e',
                    lineHeight: 1.4,
                  }}
                >
                  ⚡ <strong>Virtual Locker Simulation:</strong> LendNest smart lockers are software simulations demonstrating contactless peer-to-peer equipment handovers. No physical motors are energized.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button
                onClick={() => setAssignModalBooking(null)}
                className="btn btn-secondary"
                disabled={assigningHub}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAssignLocker}
                disabled={!selectedHubId || assigningHub}
                className="btn btn-primary"
                id="confirm-assign-locker-hub-btn"
              >
                {assigningHub ? 'Assigning Locker Compartment...' : 'Confirm Hub Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
