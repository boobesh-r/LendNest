import React, { useState } from 'react';
import {
  Package,
  Layers,
  Shield,
  PlusCircle,
  CalendarCheck,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  Lock,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import { User } from '../types.js';

interface NavbarProps {
  currentUser: User | null;
  currentPage: string;
  onNavigate: (page: string, params?: any) => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentPage,
  onNavigate,
  onOpenAuth,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleNav = (page: string, params?: any) => {
    onNavigate(page, params);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  };

  return (
    <>
      {/* Top Demo Simulation Banner */}
      <div className="demo-banner">
        <span className="demo-tag">Prototype Demo</span>
        <span>LendNest Local Simulation — Smart item sharing & QR locker sandbox. No real payments or physical locker hardware.</span>
      </div>

      <nav
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          zIndex: 900,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px' }}>
          {/* Brand Logo */}
          <div
            onClick={() => handleNav('landing')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
            id="nav-logo"
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 4px 10px rgba(5, 150, 105, 0.3)',
              }}
            >
              <Package size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
                  Lend<span style={{ color: 'var(--primary)' }}>Nest</span>
                </span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '0.1rem 0.35rem',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    borderRadius: '4px',
                  }}
                >
                  MVP
                </span>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.02em' }}>
                Borrow Smart. Share More.
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="desktop-links">
            <button
              onClick={() => handleNav('browse')}
              className={`btn btn-sm ${currentPage === 'browse' ? 'btn-primary' : 'btn-secondary'}`}
              id="nav-browse-btn"
            >
              <Layers size={16} /> Explore Items
            </button>

            <button
              onClick={() => handleNav('lockers')}
              className={`btn btn-sm ${currentPage === 'lockers' ? 'btn-primary' : 'btn-secondary'}`}
              id="nav-lockers-btn"
            >
              <Lock size={16} /> Smart QR Lockers
            </button>

            <button
              onClick={() => handleNav('locker-map')}
              className={`btn btn-sm ${currentPage === 'locker-map' ? 'btn-primary' : 'btn-secondary'}`}
              id="nav-locker-map-btn"
            >
              <MapPin size={16} /> Hub Map
            </button>

            {currentUser && (
              <button
                onClick={() => handleNav('my-bookings')}
                className={`btn btn-sm ${currentPage === 'my-bookings' ? 'btn-primary' : 'btn-secondary'}`}
                id="nav-my-bookings-btn"
              >
                <CalendarCheck size={16} /> My Bookings
              </button>
            )}

            {currentUser && currentUser.role === 'admin' && (
              <button
                onClick={() => handleNav('admin')}
                className={`btn btn-sm ${currentPage === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ borderColor: '#6366f1', color: currentPage === 'admin' ? '#fff' : '#4f46e5' }}
                id="nav-admin-btn"
              >
                <Shield size={16} /> Admin Portal
              </button>
            )}
          </div>

          {/* Action CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => {
                if (currentUser) {
                  handleNav('add-listing');
                } else {
                  onOpenAuth('login');
                }
              }}
              className="btn btn-outline-primary btn-sm"
              id="nav-list-item-btn"
            >
              <PlusCircle size={16} /> List an Item
            </button>

            {currentUser ? (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.35rem 0.65rem',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                  }}
                  id="nav-user-dropdown-btn"
                >
                  <img
                    src={currentUser.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.name}`}
                    alt={currentUser.name}
                    style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentUser.name}
                  </span>
                  <ChevronDown size={14} color="#64748b" />
                </button>

                {userDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 8px)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-lg)',
                      minWidth: '200px',
                      padding: '0.5rem',
                      zIndex: 100,
                    }}
                  >
                    <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', marginBottom: '0.4rem' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{currentUser.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{currentUser.email}</div>
                      <span className="badge badge-tag" style={{ marginTop: '0.35rem', fontSize: '0.7rem' }}>
                        Role: {currentUser.role}
                      </span>
                    </div>

                    <button
                      onClick={() => handleNav('profile')}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.55rem 0.75rem',
                        fontSize: '0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-main)',
                      }}
                      id="dropdown-profile-btn"
                    >
                      <UserIcon size={16} /> My Profile & Listings
                    </button>

                    <button
                      onClick={() => handleNav('my-bookings')}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.55rem 0.75rem',
                        fontSize: '0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-main)',
                      }}
                      id="dropdown-bookings-btn"
                    >
                      <CalendarCheck size={16} /> Reservations & Lockers
                    </button>

                    {currentUser.role === 'admin' && (
                      <button
                        onClick={() => handleNav('admin')}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          padding: '0.55rem 0.75rem',
                          fontSize: '0.85rem',
                          borderRadius: 'var(--radius-sm)',
                          color: '#4f46e5',
                          fontWeight: 600,
                        }}
                        id="dropdown-admin-btn"
                      >
                        <Shield size={16} /> Admin Dashboard
                      </button>
                    )}

                    <div style={{ borderTop: '1px solid var(--border)', margin: '0.4rem 0' }} />

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onLogout();
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.55rem 0.75rem',
                        fontSize: '0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--status-danger)',
                      }}
                      id="dropdown-logout-btn"
                    >
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => onOpenAuth('login')}
                  className="btn btn-secondary btn-sm"
                  id="nav-login-btn"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="btn btn-primary btn-sm"
                  id="nav-register-btn"
                >
                  Get Started
                </button>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="btn btn-secondary btn-sm mobile-menu-btn"
              style={{ padding: '0.45rem' }}
              id="mobile-menu-toggle-btn"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: 'var(--bg-surface)',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
            }}
          >
            <button onClick={() => handleNav('landing')} className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>
              Home
            </button>
            <button onClick={() => handleNav('browse')} className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>
              <Layers size={16} /> Explore Items
            </button>
            <button onClick={() => handleNav('lockers')} className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>
              <Lock size={16} /> Smart QR Lockers
            </button>
            <button onClick={() => handleNav('locker-map')} className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>
              <MapPin size={16} /> Hub Map
            </button>
            {currentUser && (
              <>
                <button onClick={() => handleNav('my-bookings')} className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>
                  <CalendarCheck size={16} /> My Bookings
                </button>
                <button onClick={() => handleNav('profile')} className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>
                  <UserIcon size={16} /> Profile & Listings
                </button>
              </>
            )}
            {currentUser?.role === 'admin' && (
              <button onClick={() => handleNav('admin')} className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start', color: '#4f46e5' }}>
                <Shield size={16} /> Admin Portal
              </button>
            )}
          </div>
        )}
      </nav>
    </>
  );
};
