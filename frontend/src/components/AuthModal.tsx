import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Phone, MapPin, Sparkles, ShieldCheck } from 'lucide-react';
import { api } from '../api.js';
import { User } from '../types.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  initialMode?: 'login' | 'register';
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
  showToast,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('Bengaluru, Karnataka');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.login({ email, password });
        localStorage.setItem('lendnest_token', res.token);
        showToast(`Welcome back, ${res.user.name}!`, 'success');
        onSuccess(res.user);
        onClose();
      } else {
        const res = await api.register({ name, email, password, phone, location });
        localStorage.setItem('lendnest_token', res.token);
        showToast(`Welcome to LendNest, ${res.user.name}!`, 'success');
        onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} id="auth-modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '2rem' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: '#64748b' }}
          id="close-auth-modal-btn"
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '0.65rem',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              marginBottom: '0.75rem',
            }}
          >
            <Sparkles size={24} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {mode === 'login' ? 'Welcome Back to LendNest' : 'Create Your LendNest Account'}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {mode === 'login'
              ? 'Sign in to manage rentals, access smart lockers, and connect.'
              : 'Join a trusted community of neighbors sharing gear & smart lockers.'}
          </p>
        </div>

        {import.meta.env.DEV && (
          <div
            style={{
              backgroundColor: 'var(--bg-subtle)',
              border: '1px dashed var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.65rem 0.85rem',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              marginBottom: '1rem',
            }}
          >
            🔒 <strong>Development Mode:</strong> Demo seed accounts are documented in <code>README.md</code>. Hardcoded credentials are removed for production safety.
          </div>
        )}

        {/* Tab switch */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.25rem',
            marginBottom: '1.25rem',
          }}
        >
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '0.85rem',
              backgroundColor: mode === 'login' ? 'var(--bg-surface)' : 'transparent',
              color: mode === 'login' ? 'var(--text-main)' : 'var(--text-muted)',
              boxShadow: mode === 'login' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
            id="tab-login-btn"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '0.85rem',
              backgroundColor: mode === 'register' ? 'var(--bg-surface)' : 'transparent',
              color: mode === 'register' ? 'var(--text-main)' : 'var(--text-muted)',
              boxShadow: mode === 'register' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
            id="tab-register-btn"
          >
            Create Account
          </button>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: 'var(--status-danger-bg)',
              color: '#b91c1c',
              fontSize: '0.85rem',
              padding: '0.7rem 0.9rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1rem',
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <UserIcon size={16} style={{ position: 'absolute', left: '0.85rem', top: '0.85rem', color: '#94a3b8' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jordan Miller"
                    className="form-control"
                    style={{ paddingLeft: '2.5rem' }}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    id="register-name-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={16} style={{ position: 'absolute', left: '0.85rem', top: '0.85rem', color: '#94a3b8' }} />
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      className="form-control"
                      style={{ paddingLeft: '2.5rem' }}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      id="register-phone-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">City / Location</label>
                  <div style={{ position: 'relative' }}>
                    <MapPin size={16} style={{ position: 'absolute', left: '0.85rem', top: '0.85rem', color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="e.g. Bengaluru, Karnataka"
                      className="form-control"
                      style={{ paddingLeft: '2.5rem' }}
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      id="register-location-input"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '0.85rem', top: '0.85rem', color: '#94a3b8' }} />
              <input
                type="email"
                required
                placeholder="name@example.com"
                className="form-control"
                style={{ paddingLeft: '2.5rem' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                id="auth-email-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '0.85rem', color: '#94a3b8' }} />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Minimum 6 characters"
                className="form-control"
                style={{ paddingLeft: '2.5rem' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                id="auth-password-input"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.8rem' }}
            disabled={loading}
            id="auth-submit-btn"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In to LendNest' : 'Create Free Account'}
          </button>
        </form>
      </div>
    </div>
  );
};
