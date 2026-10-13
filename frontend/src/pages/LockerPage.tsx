import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  MapPin,
  Clock,
  ShieldCheck,
  QrCode,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Layers,
  Cpu,
  History,
  Info,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { LockerLocation, Locker, LockerAccessLog, User } from '../types.js';
import { api } from '../api.js';
import { formatINR } from '../utils/format.js';

interface LockerPageProps {
  currentUser: User | null;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const LockerPage: React.FC<LockerPageProps> = ({
  currentUser,
  onOpenAuth,
  showToast,
}) => {
  const [locations, setLocations] = useState<LockerLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number>(1);
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [selectedSize, setSelectedSize] = useState<string>('All');
  const [selectedLocker, setSelectedLocker] = useState<Locker | null>(null);

  // Booking form
  const [durationHours, setDurationHours] = useState<number>(4);
  const [paymentMethod, setPaymentMethod] = useState<'demo_card' | 'demo_upi' | 'demo_wallet'>('demo_card');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Active Simulation session
  const [activeSimulationBooking, setActiveSimulationBooking] = useState<any | null>(null);
  const [simulatedDoorOpen, setSimulatedDoorOpen] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [hardwareResponse, setHardwareResponse] = useState<any | null>(null);

  // Audit logs
  const [accessLogs, setAccessLogs] = useState<LockerAccessLog[]>([]);

  // Load locations
  useEffect(() => {
    async function init() {
      try {
        const locRes = await api.getLockerLocations();
        setLocations(locRes.locations);
        if (locRes.locations.length > 0) {
          setSelectedLocationId(locRes.locations[0].id);
        }
        loadLogs();
      } catch (err) {
        console.error(err);
      }
    }
    init();
  }, []);

  // Load lockers for location
  const loadLockers = async () => {
    try {
      const res = await api.getLockers({
        locationId: selectedLocationId,
        size: selectedSize === 'All' ? undefined : selectedSize,
      });
      setLockers(res.lockers);
      if (selectedLocker && !res.lockers.some((l) => l.id === selectedLocker.id)) {
        setSelectedLocker(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadLogs = async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      setAccessLogs([]);
      return;
    }
    try {
      const res = await api.getLockerAccessLogs();
      setAccessLogs(res.logs ? res.logs.slice(0, 10) : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedLocationId) {
      loadLockers();
    }
  }, [selectedLocationId, selectedSize]);

  // Calculate pricing
  const calculateTotal = () => {
    if (!selectedLocker) return 0;
    if (durationHours >= 24) {
      return Math.ceil(durationHours / 24) * selectedLocker.daily_rate;
    }
    return durationHours * selectedLocker.hourly_rate;
  };

  const handleBookLocker = async () => {
    if (!currentUser) {
      onOpenAuth('login');
      return;
    }
    if (!selectedLocker) {
      showToast('Please click an available locker in the grid.', 'error');
      return;
    }

    setBookingLoading(true);
    try {
      const res = await api.bookLocker({
        locker_id: selectedLocker.id,
        duration_hours: durationHours,
        payment_method: paymentMethod,
      });

      setActiveSimulationBooking(res.booking);
      showToast(`Locker ${res.booking.lockerNumber} reserved! Scan pass generated.`, 'success');
      loadLockers();
      loadLogs();
    } catch (err: any) {
      showToast(err.message || 'Locker reservation failed.', 'error');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleTriggerSimulatedUnlock = async () => {
    if (!activeSimulationBooking?.qrToken) {
      showToast('No active token in current simulation session.', 'error');
      return;
    }

    setUnlockLoading(true);
    try {
      const res = await api.unlockLockerDemo(activeSimulationBooking.qrToken);
      setSimulatedDoorOpen(true);
      setHardwareResponse(res.simulatedHardwareResponse);
      showToast(`⚡ Door Unlocked: Solenoid latch released for Locker ${res.lockerNumber}!`, 'success');
      loadLogs();
      loadLockers();

      // Automatically reset door latch after 8 seconds in simulation
      setTimeout(() => {
        setSimulatedDoorOpen(false);
      }, 8000);
    } catch (err: any) {
      showToast(err.message || 'Unlock simulation failed.', 'error');
    } finally {
      setUnlockLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '2.5rem 1.25rem' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.3rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary)',
            fontSize: '0.75rem',
            fontWeight: 700,
            marginBottom: '0.5rem',
          }}
        >
          <Cpu size={14} /> SMART QR LOCKER HARDWARE SIMULATION
        </div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          Contactless Smart Lockers
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Reserve automated storage compartments for 24/7 package handoffs and equipment drop-off with dynamic QR pass verification.
        </p>
      </div>

      {/* Notice regarding simulated locker status */}
      <div
        style={{
          backgroundColor: '#eff6ff',
          border: '1.5px solid #bfdbfe',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          color: '#1e40af',
          fontSize: '0.85rem',
          lineHeight: 1.5,
        }}
      >
        <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>ℹ️</span>
        <div>
          <strong>VIRTUAL HARDWARE SIMULATOR:</strong> This section demonstrates LendNest's automated contactless locker software architecture, token validation, and solenoid latch telemetry. Physical station hardware is simulated in this preview. For public deployment with physical lockers, integrate your IoT locker controller (MQTT/HTTP relay) via production settings.
        </div>
      </div>

      {/* Location Selector Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {locations.map((loc) => (
          <div
            key={loc.id}
            onClick={() => {
              setSelectedLocationId(loc.id);
              setSelectedLocker(null);
            }}
            style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--bg-surface)',
              border: `2px solid ${selectedLocationId === loc.id ? 'var(--primary)' : 'var(--border)'}`,
              boxShadow: selectedLocationId === loc.id ? 'var(--shadow-md)' : 'var(--shadow-sm)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span className="badge badge-tag" style={{ fontSize: '0.7rem' }}>
                Station #{loc.id}
              </span>
              <span className="badge badge-available">
                {loc.available_lockers} Lockers Free
              </span>
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.25rem' }}>{loc.name}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <MapPin size={13} color="#059669" /> {loc.address}, {loc.city}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '2rem',
          alignItems: 'start',
          marginBottom: '3rem',
        }}
      >
        {/* Left Column: Interactive Locker Bank Grid */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Locker Station Grid</h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Select an available compartment to reserve
              </div>
            </div>

            {/* Size Filter */}
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {['All', 'Small', 'Medium', 'Large'].map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSize(s)}
                  style={{
                    padding: '0.25rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: selectedSize === s ? 'var(--primary)' : 'var(--bg-subtle)',
                    color: selectedSize === s ? 'white' : 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Status Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--status-available)' }} /> Available
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--status-reserved)' }} /> Reserved
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--status-occupied)' }} /> Occupied
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--status-maintenance)' }} /> Maintenance
            </span>
          </div>

          {/* Visual Locker Compartments Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {lockers.map((locker) => {
              const isSelected = selectedLocker?.id === locker.id;
              const isAvailable = locker.status === 'available';

              let borderColor = 'var(--border)';
              let bgColor = 'var(--bg-subtle)';
              let textColor = 'var(--text-main)';

              if (locker.status === 'available') {
                borderColor = isSelected ? 'var(--primary)' : '#a7f3d0';
                bgColor = isSelected ? 'var(--primary-light)' : '#f0fdf4';
                textColor = '#065f46';
              } else if (locker.status === 'reserved') {
                borderColor = '#fef3c7';
                bgColor = '#fffbeb';
                textColor = '#92400e';
              } else if (locker.status === 'occupied') {
                borderColor = '#bfdbfe';
                bgColor = '#eff6ff';
                textColor = '#1e40af';
              } else if (locker.status === 'maintenance') {
                borderColor = '#e2e8f0';
                bgColor = '#f1f5f9';
                textColor = '#64748b';
              }

              return (
                <div
                  key={locker.id}
                  onClick={() => {
                    if (isAvailable) setSelectedLocker(locker);
                  }}
                  style={{
                    border: `2px solid ${borderColor}`,
                    backgroundColor: bgColor,
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 0.5rem',
                    textAlign: 'center',
                    cursor: isAvailable ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 0 0 3px var(--primary-ring)' : 'none',
                    transform: isSelected ? 'scale(1.02)' : 'none',
                  }}
                >
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: textColor }}>
                    {locker.locker_number}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    {locker.size}
                  </div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.35rem', color: textColor }}>
                    {locker.status}
                  </div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.35rem' }}>
                    {formatINR(locker.hourly_rate)}/h
                  </div>
                </div>
              );
            })}
          </div>

          {/* Size Specs Information */}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: '1.5rem', paddingTop: '1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <strong>Compartment Dimensions Guide:</strong>
            <ul style={{ paddingLeft: '1.2rem', marginTop: '0.4rem', lineHeight: 1.5 }}>
              <li><strong>Small:</strong> 14" × 14" × 18" (Mirrorless cameras, lenses, tablets, handheld electronics, keys)</li>
              <li><strong>Medium:</strong> 20" × 16" × 24" (Backpacks, cordless tool kits, drones, projectors, sewing machines)</li>
              <li><strong>Large:</strong> 34" × 22" × 30" (Carry-on luggage, miter saws, inflatable paddleboards, vacuum cleaners)</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Reservation & Live Simulation Machine */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Reservation Card */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Reserve Selected Locker
            </h2>

            {selectedLocker ? (
              <div>
                <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SELECTED LOCKER</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{selectedLocker.locker_number} ({selectedLocker.size})</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>HOURLY RATE</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>{formatINR(selectedLocker.hourly_rate)}/h</div>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.85rem' }}>Choose Rental Duration</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
                    {[2, 4, 8, 24, 48].map((hrs) => (
                      <button
                        key={hrs}
                        type="button"
                        onClick={() => setDurationHours(hrs)}
                        style={{
                          padding: '0.45rem 0.2rem',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: durationHours === hrs ? 'var(--primary)' : 'var(--bg-subtle)',
                          color: durationHours === hrs ? 'white' : 'var(--text-main)',
                          border: `1px solid ${durationHours === hrs ? 'var(--primary)' : 'var(--border)'}`,
                        }}
                      >
                        {hrs >= 24 ? `${hrs / 24}d` : `${hrs}h`}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.85rem', marginTop: '1rem', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Rental Fee (Demo):</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {formatINR(calculateTotal())}
                  </span>
                </div>

                <button
                  onClick={handleBookLocker}
                  disabled={bookingLoading}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.85rem' }}
                  id="book-locker-submit-btn"
                >
                  {bookingLoading ? 'Generating QR Pass...' : 'Confirm Demo Reservation & QR Pass'}
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                👈 Click any green <strong>Available</strong> locker in the station grid to configure your reservation.
              </div>
            )}
          </div>

          {/* Interactive Hardware Unlock Simulator */}
          <div
            style={{
              backgroundColor: '#0f172a',
              color: 'white',
              border: '1px solid #1e293b',
              borderRadius: 'var(--radius-xl)',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontWeight: 700, fontSize: '0.85rem' }}>
                <Cpu size={16} /> INTERACTIVE TERMINAL SIMULATOR
              </div>
              <span className={`badge ${simulatedDoorOpen ? 'badge-available' : 'badge-tag'}`} style={{ backgroundColor: simulatedDoorOpen ? '#065f46' : '#334155', color: simulatedDoorOpen ? '#6ee7b7' : '#94a3b8' }}>
                {simulatedDoorOpen ? 'DOOR OPEN (UNLATCHED)' : 'DOOR LOCKED'}
              </span>
            </div>

            {activeSimulationBooking ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                  Locker {activeSimulationBooking.lockerNumber} • Active Valid Token Pass
                </div>

                <div
                  style={{
                    backgroundColor: 'white',
                    padding: '1.25rem',
                    borderRadius: '12px',
                    display: 'inline-block',
                    marginBottom: '1rem',
                  }}
                >
                  <QRCodeSVG
                    value={activeSimulationBooking.qrToken}
                    size={180}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.78rem',
                    color: '#38bdf8',
                    background: '#1e293b',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    wordBreak: 'break-all',
                    marginBottom: '1.25rem',
                  }}
                >
                  {activeSimulationBooking.qrToken}
                </div>

                {/* Simulated Physical Door Frame Graphic */}
                <div
                  style={{
                    border: '3px solid #334155',
                    borderRadius: '12px',
                    height: '110px',
                    backgroundColor: simulatedDoorOpen ? '#064e3b' : '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    marginBottom: '1.25rem',
                    transition: 'all 0.4s ease',
                    boxShadow: simulatedDoorOpen ? '0 0 25px rgba(16, 185, 129, 0.4)' : 'none',
                  }}
                >
                  {simulatedDoorOpen ? (
                    <>
                      <Unlock size={32} color="#34d399" />
                      <div style={{ fontWeight: 800, color: '#a7f3d0', fontSize: '0.9rem' }}>
                        *SOLENOID RELEASED* — COMPARTMENT OPEN
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#6ee7b7' }}>LED Interior Active • Optical Sensor Clear</div>
                    </>
                  ) : (
                    <>
                      <Lock size={30} color="#94a3b8" />
                      <div style={{ fontWeight: 700, color: '#cbd5e1', fontSize: '0.85rem' }}>
                        Secure Electromagnetic Latch Engaged
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={handleTriggerSimulatedUnlock}
                  disabled={unlockLoading || simulatedDoorOpen}
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', fontSize: '0.95rem' }}
                  id="simulate-qr-unlock-btn"
                >
                  {unlockLoading
                    ? 'Verifying Token...'
                    : simulatedDoorOpen
                    ? 'Door Is Currently Open (Re-latches in 8s)'
                    : '⚡ Simulate QR Scan / Unlock Door'}
                </button>

                {hardwareResponse && (
                  <div
                    style={{
                      marginTop: '1rem',
                      textAlign: 'left',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.72rem',
                      background: '#111827',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      color: '#a7f3d0',
                    }}
                  >
                    <div>[HARDWARE LOG] Relay: {hardwareResponse.pinRelayState}</div>
                    <div>[HARDWARE LOG] ReedSwitch: {hardwareResponse.reedSwitchContact}</div>
                    <div>[HARDWARE LOG] Sensor: {hardwareResponse.opticalSensorStatus}</div>
                    <div>[HARDWARE LOG] Response: {hardwareResponse.firmwareEcho}</div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                <QrCode size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                Reserve a locker above to launch the live scanner, animated door latch, and electronic relay simulation.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Locker Access Log Audit Table (Admin only) */}
      {currentUser?.role === 'admin' && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '2rem',
          }}
        >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Locker Hardware Access Audit Log</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Live audit events recorded by the backend locker service for security & accountability.
            </p>
          </div>
          <button onClick={loadLogs} className="btn btn-secondary btn-sm">
            <History size={14} /> Refresh Logs
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem 0.5rem' }}>Timestamp</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Locker</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>User</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Action</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Result</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {accessLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>
                    {log.locker_number || `ID ${log.locker_id}`}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    {log.user_name || 'Anonymous User'}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span className="badge badge-tag" style={{ fontSize: '0.72rem' }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span className={`badge ${log.status === 'SUCCESS' ? 'badge-available' : 'badge-danger'}`} style={{ fontSize: '0.72rem' }}>
                      {log.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
};
