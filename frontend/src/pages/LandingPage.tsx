import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  ShieldCheck,
  Lock,
  ArrowRight,
  Camera,
  Wrench,
  Bike,
  BookOpen,
  Luggage,
  Home,
  CheckCircle,
  Clock,
  MapPin,
} from 'lucide-react';
import { Item } from '../types.js';
import { api } from '../api.js';
import { formatINR } from '../utils/format.js';
import { getItemImageUrl, handleImageError } from '../utils/imageUtils.js';


interface LandingPageProps {
  onNavigate: (page: string, params?: any) => void;
  onSelectItem: (item: Item) => void;
}

const CATEGORIES = [
  { name: 'Electronics', icon: Camera, color: '#3b82f6' },
  { name: 'Tools', icon: Wrench, color: '#f59e0b' },
  { name: 'Sports equipment', icon: Bike, color: '#10b981' },
  { name: 'Books', icon: BookOpen, color: '#8b5cf6' },
  { name: 'Travel accessories', icon: Luggage, color: '#ec4899' },
  { name: 'Home appliances', icon: Home, color: '#06b6d4' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onSelectItem }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [featuredItems, setFeaturedItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeatured() {
      try {
        const res = await api.getItems();
        setFeaturedItems(res.items.slice(0, 6));
      } catch (err) {
        console.error('Failed to load items for landing page', err);
      } finally {
        setLoading(false);
      }
    }
    loadFeatured();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate('browse', { search: searchTerm, category: selectedCategory });
  };

  return (
    <div>
      {/* Hero Section */}
      <section
        style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfeff 50%, #f8fafc 100%)',
          borderBottom: '1px solid var(--border)',
          padding: '4rem 0 5rem',
        }}
      >
        <div className="container">
          <div style={{ maxWidth: '820px', margin: '0 auto', textAlign: 'center' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--primary-light)',
                border: '1px solid var(--primary-border)',
                borderRadius: 'var(--radius-full)',
                padding: '0.4rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--primary)',
                marginBottom: '1.5rem',
              }}
            >
              <Sparkles size={16} /> Smart Neighborhood Rental & Sharing Network
            </div>

            <h1
              style={{
                fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                color: 'var(--text-main)',
                marginBottom: '1.25rem',
              }}
            >
              Borrow Smart. <span style={{ color: 'var(--primary)' }}>Share More.</span>
            </h1>

            <p
              style={{
                fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                marginBottom: '2.5rem',
              }}
            >
              Rent high-quality cameras, power tools, sports gear, and appliances from trusted neighbors — or reserve automated smart lockers for 24/7 contactless pickup.
            </p>

            {/* Main Interactive Search Bar */}
            <form
              onSubmit={handleSearchSubmit}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-xl)',
                padding: '0.5rem 0.6rem 0.5rem 1.25rem',
                boxShadow: 'var(--shadow-xl)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '2rem',
              }}
              id="landing-search-form"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '220px' }}>
                <Search size={20} color="#059669" />
                <input
                  type="text"
                  placeholder="What gear do you need? (e.g. Sony A7, Drill, Paddleboard...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    fontSize: '1rem',
                    color: 'var(--text-main)',
                    background: 'transparent',
                  }}
                  id="landing-search-input"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.6rem 0.85rem',
                  fontSize: '0.9rem',
                  outline: 'none',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                }}
                id="landing-category-select"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ padding: '0.75rem 1.75rem' }}
                id="landing-search-submit-btn"
              >
                Search Gear <ArrowRight size={18} />
              </button>
            </form>

            {/* Quick Category Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.6rem' }}>
              {CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <button
                    key={cat.name}
                    onClick={() => onNavigate('browse', { category: cat.name })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.45rem 0.85rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <IconComponent size={15} color={cat.color} />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Items Grid */}
      <section style={{ padding: '4.5rem 0' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                POPULAR THIS WEEK
              </div>
              <h2 style={{ fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.02em', marginTop: '0.25rem' }}>
                Featured Rentals Near You
              </h2>
            </div>
            <button
              onClick={() => onNavigate('browse')}
              className="btn btn-secondary btn-sm"
              id="view-all-items-btn"
            >
              Browse All ({featuredItems.length}+ items) <ArrowRight size={16} />
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Loading featured listings...
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {featuredItems.map((item) => (
                <div
                  key={item.id}
                  className="card"
                  style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                  onClick={() => onSelectItem(item)}
                >
                  <div style={{ position: 'relative', width: '100%', height: '210px', overflow: 'hidden' }}>
                    <img
                      src={getItemImageUrl(item.image_url)}
                      alt={item.title}
                      onError={handleImageError}

                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.3s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    />
                    <span
                      className="badge badge-tag"
                      style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        backgroundColor: 'rgba(255,255,255,0.92)',
                        backdropFilter: 'blur(4px)',
                        fontWeight: 700,
                      }}
                    >
                      {item.category}
                    </span>
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '12px',
                        right: '12px',
                        backgroundColor: 'rgba(15, 23, 42, 0.85)',
                        color: 'white',
                        padding: '0.3rem 0.65rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                      }}
                    >
                      {formatINR(item.price_per_day)}/day
                    </span>
                  </div>

                  <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.35, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                      {item.title}
                    </h3>

                    <p
                      style={{
                        fontSize: '0.825rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                        marginBottom: '1rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.description}
                    </p>

                    <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <MapPin size={14} color="#059669" />
                        <span>{item.location}</span>
                      </div>
                      <span className="badge badge-available">
                        Available Now
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Smart QR Locker Spotlight */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: 'white',
          padding: '4.5rem 0',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '3rem',
              alignItems: 'center',
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'rgba(5, 150, 105, 0.25)',
                  border: '1px solid #059669',
                  borderRadius: 'var(--radius-full)',
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.775rem',
                  fontWeight: 700,
                  color: '#34d399',
                  marginBottom: '1rem',
                }}
              >
                <Lock size={14} /> INNOVATIVE HARDWARE SIMULATION
              </div>

              <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.7rem)', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: '1.25rem' }}>
                Contactless Smart QR Storage Lockers
              </h2>

              <p style={{ fontSize: '1rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                Never wait for in-person handoffs. LendNest Smart Lockers placed in metro stations, shopping centers, and tech hubs let you drop off or collect items with a single dynamic QR scan.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.925rem' }}>
                  <CheckCircle size={18} color="#34d399" />
                  <span>Dynamic single-use or timed QR tokens validated server-side</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.925rem' }}>
                  <CheckCircle size={18} color="#34d399" />
                  <span>Small, Medium, and Large lockers for cameras, drills, or luggage</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.925rem' }}>
                  <CheckCircle size={18} color="#34d399" />
                  <span>Live interactive unlock simulator with real-time audit logs</span>
                </div>
              </div>

              <button
                onClick={() => onNavigate('lockers')}
                className="btn btn-primary btn-lg"
                id="landing-try-lockers-btn"
              >
                Launch Locker Simulator <ArrowRight size={18} />
              </button>
            </div>

            {/* Visual Locker Demo Card */}
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.7)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 'var(--radius-xl)',
                padding: '2rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Locker Hub Simulation</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Downtown Metro Station</div>
                </div>
                <span className="badge badge-available">Station Online</span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.85rem',
                  marginBottom: '1.5rem',
                }}
              >
                {[
                  { num: 'CM-101', status: 'available', size: 'Small' },
                  { num: 'CM-102', status: 'available', size: 'Small' },
                  { num: 'CM-103', status: 'available', size: 'Medium' },
                  { num: 'CM-104', status: 'reserved', size: 'Medium' },
                  { num: 'CM-105', status: 'available', size: 'Large' },
                  { num: 'CM-106', status: 'maintenance', size: 'Large' },
                ].map((l) => (
                  <div
                    key={l.num}
                    style={{
                      border: `1px solid ${
                        l.status === 'available'
                          ? '#059669'
                          : l.status === 'reserved'
                          ? '#d97706'
                          : '#475569'
                      }`,
                      backgroundColor:
                        l.status === 'available'
                          ? 'rgba(5, 150, 105, 0.15)'
                          : l.status === 'reserved'
                          ? 'rgba(217, 119, 6, 0.15)'
                          : 'rgba(100, 116, 139, 0.15)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.85rem',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{l.num}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{l.size}</div>
                    <div
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        marginTop: '0.35rem',
                        color:
                          l.status === 'available'
                            ? '#34d399'
                            : l.status === 'reserved'
                            ? '#fbbf24'
                            : '#94a3b8',
                      }}
                    >
                      {l.status}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
                ⚡ Click below to simulate booking, scanning QR codes, and opening simulated electronic lockers.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Steps: How It Works */}
      <section style={{ padding: '4.5rem 0', backgroundColor: 'var(--bg-surface)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 3rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              HOW LENDNEST WORKS
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem' }}>
              Sharing Made Simple in 3 Steps
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '2rem',
            }}
          >
            <div style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  marginBottom: '1.25rem',
                }}
              >
                1
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Browse & Select Dates</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Explore hundreds of items by category, price, or location. Pick rental start and end dates with real-time price calculations and deposit estimates.
              </p>
            </div>

            <div style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: '#e0f2fe',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  marginBottom: '1.25rem',
                }}
              >
                2
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Reserve & Get Demo Code</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Checkout using demo card, UPI, or wallet. Receive an instant booking confirmation with your unique pickup verification code or automated locker QR pass.
              </p>
            </div>

            <div style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  marginBottom: '1.25rem',
                }}
              >
                3
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Pickup, Enjoy, Return</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Meet the verified owner or tap your QR pass at the smart locker. Return when done and get your refundable security deposit back automatically.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
