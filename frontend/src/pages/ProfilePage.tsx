import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CalendarCheck,
  Package,
  Edit,
  Trash2,
  PlusCircle,
  Shield,
  CheckCircle,
} from 'lucide-react';
import { User, Item } from '../types.js';
import { api } from '../api.js';
import { formatINR } from '../utils/format.js';
import { getItemImageUrl, handleImageError } from '../utils/imageUtils.js';


interface ProfilePageProps {
  currentUser: User | null;
  onNavigate: (page: string, params?: any) => void;
  onEditItem: (item: Item) => void;
  onUpdateUser: (user: User) => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  currentUser,
  onNavigate,
  onEditItem,
  onUpdateUser,
  showToast,
}) => {
  const [profile, setProfile] = useState<User | null>(currentUser);
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Edit form fields
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [location, setLocation] = useState(currentUser?.location || '');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getMe();
      setProfile(res.user);
      onUpdateUser(res.user);

      // Load user items
      const allItems = await api.getItems();
      const userItems = allItems.items.filter((i) => i.owner_id === res.user.id);
      setMyItems(userItems);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleAvailable = async (item: Item) => {
    try {
      const newStatus = item.available ? 0 : 1;
      await api.updateItem(item.id, { available: newStatus });
      showToast(`Item availability marked as ${newStatus ? 'Available' : 'Unavailable'}.`, 'info');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Could not update item.', 'error');
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!window.confirm('Are you sure you want to remove this item listing?')) return;
    try {
      await api.deleteItem(itemId);
      showToast('Item listing successfully deleted.', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Could not delete item.', 'error');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.updateProfile({ name, phone, location });
      setProfile(res.user);
      onUpdateUser(res.user);
      setEditModalOpen(false);
      showToast('Profile information updated!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not update profile.', 'error');
    }
  };

  if (!profile) return null;

  return (
    <div className="container" style={{ padding: '2.5rem 1.25rem' }}>
      {/* Header Profile Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <img
            src={profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.name}`}
            alt={profile.name}
            style={{ width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #ecfdf5' }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{profile.name}</h1>
              <span className="badge badge-available">
                <CheckCircle size={12} /> Verified
              </span>
              {profile.role === 'admin' && (
                <span className="badge" style={{ backgroundColor: '#e0e7ff', color: '#4338ca' }}>
                  Admin
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Mail size={14} color="#64748b" /> {profile.email}
              </span>
              {profile.phone && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Phone size={14} color="#64748b" /> {profile.phone}
                </span>
              )}
              {profile.location && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MapPin size={14} color="#64748b" /> {profile.location}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setName(profile.name);
            setPhone(profile.phone || '');
            setLocation(profile.location || '');
            setEditModalOpen(true);
          }}
          className="btn btn-secondary btn-sm"
          id="profile-edit-btn"
        >
          <Edit size={16} /> Edit Profile
        </button>
      </div>

      {/* Stats Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2.5rem',
        }}
      >
        <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Items Listed
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
            {profile.stats?.itemsListed || myItems.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Active in community marketplace
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Active Gear Rentals
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0284c7', marginTop: '0.25rem' }}>
            {profile.stats?.activeBookings || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Currently borrowed or reserved
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Active Locker Reservations
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#8b5cf6', marginTop: '0.25rem' }}>
            {profile.stats?.activeLockers || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Contactless lockers reserved
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Estimated Host Payouts
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>
            {formatINR(profile.stats?.totalEarnings || 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Simulated earnings from rentals
          </div>
        </div>
      </div>

      {/* My Listed Items Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>My Listed Items</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Manage availability, edit daily rates, or remove your listings.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={() => onNavigate('my-bookings')} className="btn btn-secondary btn-sm" id="profile-manage-requests-btn">
            <CalendarCheck size={16} /> Manage Rental Requests
          </button>
          <button onClick={() => onNavigate('add-listing')} className="btn btn-primary btn-sm" id="profile-add-item-btn">
            <PlusCircle size={16} /> List a New Item
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
          Loading your items...
        </div>
      ) : myItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 2rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <Package size={36} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>You haven't listed any items yet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            Share a ladder, camping tent, pressure washer, or camera to earn extra income.
          </p>
          <button onClick={() => onNavigate('add-listing')} className="btn btn-primary">
            List Your First Item
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {myItems.map((item) => (
            <div key={item.id} className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <img
                  src={getItemImageUrl(item.image_url)}
                  alt={item.title}
                  onError={handleImageError}
                  style={{ width: '84px', height: '84px', borderRadius: '10px', objectFit: 'cover' }}
                />

                <div style={{ flex: 1 }}>
                  <span className="badge badge-tag" style={{ fontSize: '0.7rem' }}>
                    {item.category}
                  </span>
                  <h3 style={{ fontSize: '0.975rem', fontWeight: 700, lineHeight: 1.3, marginTop: '0.2rem' }}>
                    {item.title}
                  </h3>
                  <div style={{ fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>
                    {formatINR(item.price_per_day)}/day
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => handleToggleAvailable(item)}
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.3rem 0.6rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: item.available ? 'var(--status-available-bg)' : 'var(--bg-subtle)',
                    color: item.available ? '#065f46' : '#64748b',
                    border: '1px solid var(--border)',
                  }}
                >
                  {item.available ? '● Available' : '○ Disabled'}
                </button>

                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    onClick={() => onEditItem(item)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.35rem 0.65rem' }}
                  >
                    <Edit size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="btn btn-danger-outline btn-sm"
                    style={{ padding: '0.35rem 0.65rem' }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Profile Modal */}
      {editModalOpen && (
        <div className="modal-overlay" onClick={() => setEditModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.25rem' }}>Edit Profile Information</h3>
            <form onSubmit={handleSaveProfile}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className="form-control"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Location / City</label>
                <input
                  type="text"
                  className="form-control"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Profile
                </button>
                <button type="button" onClick={() => setEditModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
