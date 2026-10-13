import React from 'react';
import { Package, ShieldCheck, Heart } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: string, params?: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer
      style={{
        backgroundColor: '#0f172a',
        color: '#94a3b8',
        borderTop: '1px solid #1e293b',
        paddingTop: '3.5rem',
        paddingBottom: '2rem',
        marginTop: '4rem',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '2.5rem',
            marginBottom: '3rem',
          }}
        >
          {/* Col 1 */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#ffffff', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Package size={18} color="#fff" />
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>LendNest</span>
            </div>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.2rem' }}>
              Borrow Smart. Share More. The neighborhood sharing network empowering communities to access quality tools, gear, and automated smart QR lockers.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>
              <ShieldCheck size={16} /> Verified Peer Community
            </div>
          </div>

          {/* Col 2 */}
          <div>
            <h4 style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>Explore Gear</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.875rem' }}>
              <button onClick={() => onNavigate('browse', { category: 'Electronics' })} style={{ color: '#94a3b8', textAlign: 'left' }}>
                Electronics & Cameras
              </button>
              <button onClick={() => onNavigate('browse', { category: 'Tools' })} style={{ color: '#94a3b8', textAlign: 'left' }}>
                Power Tools & Hardware
              </button>
              <button onClick={() => onNavigate('browse', { category: 'Sports equipment' })} style={{ color: '#94a3b8', textAlign: 'left' }}>
                Sports & Outdoor Gear
              </button>
              <button onClick={() => onNavigate('browse', { category: 'Home appliances' })} style={{ color: '#94a3b8', textAlign: 'left' }}>
                Home Appliances
              </button>
              <button onClick={() => onNavigate('browse', { category: 'Travel accessories' })} style={{ color: '#94a3b8', textAlign: 'left' }}>
                Travel Accessories
              </button>
            </div>
          </div>

          {/* Col 3 */}
          <div>
            <h4 style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>Platform Features</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.875rem' }}>
              <button onClick={() => onNavigate('lockers')} style={{ color: '#94a3b8', textAlign: 'left' }}>
                Smart QR Lockers Simulation
              </button>
              <button onClick={() => onNavigate('add-listing')} style={{ color: '#94a3b8', textAlign: 'left' }}>
                List Your Item for Rent
              </button>
              <button onClick={() => onNavigate('my-bookings')} style={{ color: '#94a3b8', textAlign: 'left' }}>
                Booking & Pickup Codes
              </button>
              <button onClick={() => onNavigate('admin')} style={{ color: '#94a3b8', textAlign: 'left' }}>
                Admin Moderation Portal
              </button>
            </div>
          </div>

          {/* Col 4 */}
          <div>
            <h4 style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>Demo Simulation Notice</h4>
            <div
              style={{
                backgroundColor: '#1e293b',
                padding: '0.9rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                lineHeight: 1.5,
                color: '#cbd5e1',
                border: '1px solid #334155',
              }}
            >
              This application is an educational, fully functional local MVP prototype. Financial transactions are simulated demo payments (no actual money transferred). Locker unlocking is simulated via backend QR token verification.
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid #1e293b',
            paddingTop: '1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            fontSize: '0.8rem',
          }}
        >
          <div>© {new Date().getFullYear()} LendNest Technologies Inc. All rights reserved.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            Built with <Heart size={14} color="#ef4444" fill="#ef4444" /> for modern sustainable communities.
          </div>
        </div>
      </div>
    </footer>
  );
};
