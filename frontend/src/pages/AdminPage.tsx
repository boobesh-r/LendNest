import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Package,
  CalendarCheck,
  Lock,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  MapPin,
  Navigation,
  Edit2,
  X,
} from 'lucide-react';
import { AdminStats, User, LockerAccessLog, LockerLocation } from '../types.js';
import { api } from '../api.js';
import { formatINR } from '../utils/format.js';

interface AdminPageProps {
  currentUser: User | null;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onNavigate?: (page: string, params?: any) => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  currentUser,
  onOpenAuth,
  onNavigate,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'lockers' | 'users' | 'bookings' | 'logs'>('lockers');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [lockers, setLockers] = useState<any[]>([]);
  const [logs, setLogs] = useState<LockerAccessLog[]>([]);
  const [hubs, setHubs] = useState<LockerLocation[]>([]);
  const [editingHub, setEditingHub] = useState<LockerLocation | null>(null);
  const [editLat, setEditLat] = useState<string>('');
  const [editLng, setEditLng] = useState<string>('');
  const [savingCoords, setSavingCoords] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, bookingsRes, lockersRes, logsRes, hubsRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getAdminBookings(),
        api.getAdminLockers(),
        api.getAdminAccessLogs(),
        api.getLockerLocations(),
      ]);

      setStats(statsRes.stats);
      setUsers(usersRes.users);
      setBookings(bookingsRes.bookings);
      setLockers(lockersRes.lockers);
      setLogs(logsRes.logs);
      setHubs(hubsRes.locations);
    } catch (err: any) {
      showToast(err.message || 'Failed to load administrator data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchAdminData();
    }
  }, [currentUser]);

  const handleToggleMaintenance = async (locker: any) => {
    const nextStatus = locker.status === 'maintenance' ? 'available' : 'maintenance';
    try {
      await api.updateLockerStatus(locker.id, nextStatus);
      showToast(`Locker ${locker.locker_number} marked as ${nextStatus}.`, 'info');
      fetchAdminData();
    } catch (err: any) {
      showToast(err.message || 'Status update failed.', 'error');
    }
  };

  const handleOpenEditHub = (hub: LockerLocation) => {
    setEditingHub(hub);
    setEditLat(String(hub.lat));
    setEditLng(String(hub.lng));
  };

  const handleSaveCoordinates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHub) return;

    const latNum = parseFloat(editLat);
    const lngNum = parseFloat(editLng);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      showToast('Latitude must be a valid number between -90 and 90.', 'error');
      return;
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      showToast('Longitude must be a valid number between -180 and 180.', 'error');
      return;
    }

    setSavingCoords(true);
    try {
      await api.updateHubCoordinates(editingHub.id, {
        lat: latNum,
        lng: lngNum,
      });
      showToast(`Real coordinates updated for ${editingHub.name}.`, 'success');
      setEditingHub(null);
      fetchAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update hub coordinates.', 'error');
    } finally {
      setSavingCoords(false);
    }
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="container" style={{ padding: '5rem 1.25rem', textAlign: 'center' }}>
        <div
          style={{
            maxWidth: '500px',
            margin: '0 auto',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: '3rem 2rem',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--status-danger-bg)',
              color: 'var(--status-danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}
          >
            <Shield size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Administrator Access Required</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
            This portal is restricted to authorized platform administrators. Please sign in with an administrator account.
          </p>
          <button
            onClick={() => onOpenAuth('login')}
            className="btn btn-primary"
            id="admin-auth-prompt-btn"
          >
            Sign in as Administrator
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2.5rem 1.25rem' }}>
      {/* Admin Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#4f46e5', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.35rem' }}>
            <Shield size={14} /> SYSTEM MODERATION & OVERVIEW
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Admin Dashboard
          </h1>
        </div>

        <button onClick={fetchAdminData} className="btn btn-secondary btn-sm" id="admin-refresh-data-btn">
          <RefreshCw size={14} /> Refresh Data
        </button>
      </div>

      {/* Metrics Grid */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2.5rem',
          }}
        >
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Users
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {stats.totalUsers}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Registered accounts</div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Live Item Listings
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.2rem' }}>
              {stats.totalListings}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Items in catalog</div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Item Bookings
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0284c7', marginTop: '0.2rem' }}>
              {stats.totalItemBookings}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Active rentals: {stats.activeItemRentals}
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Lockers In Maintenance
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: stats.lockersMaintenance > 0 ? '#f59e0b' : 'var(--text-main)', marginTop: '0.2rem' }}>
              {stats.lockersMaintenance}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Available: {stats.lockersAvailable} • In use: {stats.lockersOccupied}
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Gross Volume (Demo)
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginTop: '0.2rem' }}>
              {formatINR(stats.grossRentalVolume)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total simulated transactions</div>
          </div>
        </div>
      )}

      {/* Admin Tab Selector */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.75rem', gap: '0.75rem' }}>
        <button
          onClick={() => setActiveTab('lockers')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 700,
            fontSize: '0.9rem',
            color: activeTab === 'lockers' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'lockers' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
          }}
          id="admin-tab-lockers-btn"
        >
          <Lock size={16} /> Locker Grid Moderation ({lockers.length})
        </button>

        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 700,
            fontSize: '0.9rem',
            color: activeTab === 'users' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'users' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
          }}
          id="admin-tab-users-btn"
        >
          <Users size={16} /> User Directory ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 700,
            fontSize: '0.9rem',
            color: activeTab === 'bookings' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'bookings' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
          }}
          id="admin-tab-bookings-btn"
        >
          <CalendarCheck size={16} /> All Reservations ({bookings.length})
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 700,
            fontSize: '0.9rem',
            color: activeTab === 'logs' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'logs' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
          }}
          id="admin-tab-logs-btn"
        >
          <Wrench size={16} /> Hardware Access Logs ({logs.length})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
          Loading admin data...
        </div>
      ) : (
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {/* TAB 1: Locker Moderation */}
          {activeTab === 'lockers' && (
            <div>
              {/* Hub Locations & Coordinates Section */}
              <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <MapPin size={18} color="#059669" /> Configured Smart Locker Hubs ({hubs.length})
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      Real GPS coordinates powering the Interactive Locker Map. Configure verified latitude and longitude for physical hubs without geocoding or guessing.
                    </p>
                  </div>
                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('locker-map')}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
                      id="admin-open-map-btn"
                    >
                      <Navigation size={13} color="#059669" /> Preview Interactive Hub Map
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                  {hubs.map((hub) => (
                    <div
                      key={hub.id}
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                            {hub.name}
                          </div>
                          <span className="badge badge-tag" style={{ fontSize: '0.7rem' }}>
                            Hub #{hub.id}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          {hub.address}, {hub.city}
                        </div>
                        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span
                            className="badge badge-available"
                            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                          >
                            📍 {hub.lat.toFixed(4)}, {hub.lng.toFixed(4)}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {hub.available_lockers} / {hub.total_lockers} Free
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                        <button
                          onClick={() => handleOpenEditHub(hub)}
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1, fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                          id={`edit-coords-hub-${hub.id}`}
                        >
                          <Edit2 size={12} /> Configure Real GPS
                        </button>
                        {onNavigate && (
                          <button
                            onClick={() => onNavigate('locker-map', { hubId: hub.id })}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
                            title="View on Interactive Map"
                          >
                            <MapPin size={13} color="#059669" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Individual Locker Compartments Grid */}
              <div style={{ padding: '1rem 1.25rem 0.5rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Individual Locker Compartment Hardware Simulation ({lockers.length} Compartments)
                </h4>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-subtle)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '0.85rem 1rem' }}>Locker #</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Station Location</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Size</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Rate (₹/h)</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Current Status</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Admin Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lockers.map((l) => (
                      <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 800 }}>{l.locker_number}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div>{l.location_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{l.city}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>{l.size}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>{formatINR(l.hourly_rate)}/h</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span className={`badge ${l.status === 'available' ? 'badge-available' : l.status === 'maintenance' ? 'badge-maintenance' : 'badge-reserved'}`}>
                            {l.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <button
                            onClick={() => handleToggleMaintenance(l)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                          >
                            {l.status === 'maintenance' ? 'Mark Available' : 'Set Maintenance'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Users */}
          {activeTab === 'users' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-subtle)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>User</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Email</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Role</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Contact</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Listings</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Bookings</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <img
                          src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.name}`}
                          alt={u.name}
                          style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <span style={{ fontWeight: 600 }}>{u.name}</span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className={`badge ${u.role === 'admin' ? 'badge-available' : 'badge-tag'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                        {u.phone || 'No phone'} • {u.location || 'N/A'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{u.listings_count}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{u.bookings_count}</td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: Bookings */}
          {activeTab === 'bookings' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-subtle)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>ID</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Item</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Renter</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Owner</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Rental Dates</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Amount</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Pickup Code</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>#{b.id}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{b.item_title}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>{b.renter_name}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>{b.owner_name}</td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.78rem' }}>{b.start_date} to {b.end_date}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--primary)' }}>
                        {formatINR(b.total_amount)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {b.pickup_code}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className={`badge ${b.status === 'confirmed' ? 'badge-available' : b.status === 'completed' ? 'badge-tag' : 'badge-danger'}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: Hardware Access Logs */}
          {activeTab === 'logs' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-subtle)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>Timestamp</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Locker</th>
                    <th style={{ padding: '0.85rem 1rem' }}>User</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Action</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((lg) => (
                    <tr key={lg.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {new Date(lg.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{lg.locker_number}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>{lg.user_name || 'System'}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className="badge badge-tag">{lg.action}</span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className={`badge ${lg.status === 'SUCCESS' ? 'badge-available' : 'badge-danger'}`}>
                          {lg.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {lg.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Smart Locker Hub GPS Coordinates Modal */}
      {editingHub && (
        <div className="modal-overlay" onClick={() => setEditingHub(null)} id="edit-coords-modal-overlay">
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', width: '90%', padding: '2rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'inline-flex', padding: '0.2rem 0.6rem', borderRadius: '4px', background: '#ecfdf5', color: '#059669', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  ADMINISTRATIVE CONFIGURATION
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Configure Real Coordinates
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  {editingHub.name} • {editingHub.city}
                </p>
              </div>
              <button
                onClick={() => setEditingHub(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.78rem',
                color: '#92400e',
                lineHeight: 1.4,
                marginBottom: '1.25rem',
              }}
            >
              ⚠️ <strong>Ground-Truth GPS Requirement:</strong>
              <br />
              Enter verified real-world geographic coordinates for this physical smart locker hub. Do NOT invent or guess coordinates. Modifications are logged with your administrator identity in the audit trail.
            </div>

            <form onSubmit={handleSaveCoordinates}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                  Station Address (Reference):
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={`${editingHub.address}, ${editingHub.city} (${editingHub.postal_code})`}
                  disabled
                  style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                    Latitude (-90 to +90):
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="form-control"
                    placeholder="e.g. 12.9756"
                    value={editLat}
                    onChange={(e) => setEditLat(e.target.value)}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}
                    id="hub-latitude-input"
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Valid range: -90.0 to 90.0
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                    Longitude (-180 to +180):
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="form-control"
                    placeholder="e.g. 77.6066"
                    value={editLng}
                    onChange={(e) => setEditLng(e.target.value)}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}
                    id="hub-longitude-input"
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Valid range: -180.0 to 180.0
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingHub(null)}
                  className="btn btn-secondary"
                  disabled={savingCoords}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingCoords}
                  id="save-hub-coords-btn"
                >
                  {savingCoords ? 'Saving...' : 'Save Real Coordinates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
