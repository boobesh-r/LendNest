import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Navigation,
  Clock,
  ShieldCheck,
  Lock,
  Layers,
  ArrowRight,
  ExternalLink,
  Info,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Cpu,
} from 'lucide-react';
import { LockerLocation, User } from '../types.js';
import { api } from '../api.js';

interface LockerMapPageProps {
  currentUser: User | null;
  initialSelectedHubId?: number;
  onNavigate: (page: string, params?: any) => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const LockerMapPage: React.FC<LockerMapPageProps> = ({
  currentUser,
  initialSelectedHubId,
  onNavigate,
  showToast,
}) => {
  const [locations, setLocations] = useState<LockerLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHub, setSelectedHub] = useState<LockerLocation | null>(null);
  const [cityFilter, setCityFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: number]: L.Marker }>({});

  const fetchLocations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getLockerLocations();
      setLocations(res.locations);

      if (initialSelectedHubId) {
        const found = res.locations.find((l) => l.id === initialSelectedHubId);
        if (found) setSelectedHub(found);
      } else if (res.locations.length > 0) {
        setSelectedHub(res.locations[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve locker hubs.');
      showToast('Could not load locker hub locations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  // Filtered hubs
  const filteredHubs = locations.filter((hub) => {
    const matchesCity = cityFilter === 'All' || hub.city.toLowerCase() === cityFilter.toLowerCase();
    const matchesSearch =
      searchQuery.trim() === '' ||
      hub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hub.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hub.city.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCity && matchesSearch;
  });

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create map instance once
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [20.5937, 78.9629], // Geographic center of India
        zoom: 5,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // OpenStreetMap free tile layer (0 API key required, 100% open-source)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    if (filteredHubs.length === 0) return;

    const bounds = L.latLngBounds([]);

    filteredHubs.forEach((hub) => {
      // Validate real coordinates
      if (typeof hub.lat !== 'number' || typeof hub.lng !== 'number' || isNaN(hub.lat) || isNaN(hub.lng)) {
        return;
      }

      bounds.extend([hub.lat, hub.lng]);

      const isSelected = selectedHub?.id === hub.id;
      const isAvailable = (hub.available_lockers || 0) > 0;

      // Custom Leaflet DivIcon with SVG Pin
      const iconHtml = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: ${isSelected ? '#047857' : isAvailable ? '#059669' : '#64748b'};
          border: 3px solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          cursor: pointer;
          transition: transform 0.2s ease, background 0.2s ease;
        ">
          <div style="
            transform: rotate(45deg);
            color: white;
            font-weight: 800;
            font-size: 13px;
            font-family: var(--font-sans);
          ">
            ${hub.id}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-hub-pin',
        html: iconHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -35],
      });

      const marker = L.marker([hub.lat, hub.lng], { icon: customIcon }).addTo(map);

      // Popup Content
      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; padding: 4px; min-width: 190px;">
          <div style="font-size: 11px; font-weight: 700; color: #059669; text-transform: uppercase;">Station #${hub.id} • ${hub.city}</div>
          <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin: 3px 0 5px;">${hub.name}</div>
          <div style="font-size: 12px; color: #475569; margin-bottom: 6px;">${hub.address}</div>
          <div style="font-size: 12px; font-weight: 600; color: ${isAvailable ? '#059669' : '#dc2626'};">
            ● ${hub.available_lockers || 0} of ${hub.total_lockers} lockers free
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        setSelectedHub(hub);
        map.setView([hub.lat, hub.lng], 14, { animate: true });
      });

      markersRef.current[hub.id] = marker;
    });

    // Auto-fit bounds if no specific hub is selected
    if (bounds.isValid()) {
      if (selectedHub && typeof selectedHub.lat === 'number' && typeof selectedHub.lng === 'number') {
        map.setView([selectedHub.lat, selectedHub.lng], 14, { animate: true });
        markersRef.current[selectedHub.id]?.openPopup();
      } else {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [filteredHubs, selectedHub]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleSelectHub = (hub: LockerLocation) => {
    setSelectedHub(hub);
    if (mapInstanceRef.current && typeof hub.lat === 'number' && typeof hub.lng === 'number') {
      mapInstanceRef.current.setView([hub.lat, hub.lng], 14, { animate: true });
      markersRef.current[hub.id]?.openPopup();
    }
  };

  const getDirectionsUrl = (lat?: number | null, lng?: number | null) => {
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return '#';
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  };

  const cities = ['All', ...Array.from(new Set(locations.map((l) => l.city)))];

  return (
    <div className="container" style={{ padding: '2rem 1.25rem' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-full)', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          <MapPin size={13} /> GEOGRAPHIC HUB NETWORK
        </div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          Interactive Smart Locker Hub Map
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Locate automated contactless locker stations across metro transport concourses for equipment drops, safe handoffs, and 24/7 self-service pickups.
        </p>
      </div>

      {/* Simulation Sandbox Notice */}
      <div
        style={{
          backgroundColor: '#eff6ff',
          border: '1.5px solid #bfdbfe',
          borderRadius: 'var(--radius-lg)',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.825rem',
          color: '#1e40af',
          lineHeight: 1.5,
        }}
      >
        <Cpu size={20} style={{ flexShrink: 0 }} />
        <div>
          <strong>VIRTUAL LOCKER NETWORK SIMULATION:</strong> Locations represent real geographic hubs. Solenoid latch release and QR passes are simulated for demonstration. No physical hardware connection is made.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* City Filter Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginRight: '0.35rem' }}>
            City:
          </span>
          {cities.map((city) => (
            <button
              key={city}
              onClick={() => setCityFilter(city)}
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8rem',
                fontWeight: 600,
                backgroundColor: cityFilter === city ? 'var(--primary)' : 'var(--bg-subtle)',
                color: cityFilter === city ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${cityFilter === city ? 'var(--primary)' : 'var(--border)'}`,
                transition: 'all 0.15s ease',
              }}
            >
              {city}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '240px', flex: '1', maxWidth: '360px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.65rem', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search hub by name or address..."
            className="form-control"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.2rem', paddingRight: '0.75rem', fontSize: '0.85rem', paddingBlock: '0.5rem' }}
            id="hub-map-search-input"
          />
        </div>
      </div>

      {/* Main Layout: Map + Details Sidebar */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
          <div className="badge badge-tag" style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}>
            Loading geographic hub pins...
          </div>
        </div>
      ) : error ? (
        <div style={{ backgroundColor: 'var(--status-danger-bg)', border: '1px solid #fca5a5', padding: '2rem', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
          <AlertCircle size={32} color="#dc2626" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.5rem' }}>{error}</h3>
          <button onClick={fetchLocations} className="btn btn-primary btn-sm">
            <RefreshCw size={14} /> Retry Loading Map
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(340px, 1fr) minmax(360px, 1.35fr)',
            gap: '1.5rem',
            alignItems: 'stretch',
          }}
          className="map-layout-grid"
        >
          {/* Left Column: Hub Cards List & Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '680px', overflowY: 'auto' }}>
            {filteredHubs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                <MapPin size={32} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
                <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>No locker stations found</h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Try choosing 'All' cities or clearing your search query.
                </p>
              </div>
            ) : (
              filteredHubs.map((hub) => {
                const isSelected = selectedHub?.id === hub.id;
                const hasLockers = (hub.available_lockers || 0) > 0;

                return (
                  <div
                    key={hub.id}
                    onClick={() => handleSelectHub(hub)}
                    className="card"
                    style={{
                      padding: '1.25rem',
                      cursor: 'pointer',
                      border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                      backgroundColor: isSelected ? '#fbfdfc' : 'var(--bg-surface)',
                      transition: 'all 0.15s ease',
                    }}
                    id={`hub-card-${hub.id}`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <span className="badge badge-tag" style={{ fontSize: '0.72rem' }}>
                        Station #{hub.id} • {hub.city}
                      </span>
                      <span className={`badge ${hasLockers ? 'badge-available' : 'badge-danger'}`} style={{ fontSize: '0.72rem' }}>
                        {hasLockers ? `${hub.available_lockers} Available` : 'Full'}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      {hub.name}
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem', fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                      <MapPin size={14} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{hub.address}, {hub.city} — {hub.postal_code}</span>
                    </div>

                    {/* Operating Hours & Compartment breakdown */}
                    <div style={{ backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.85rem', fontSize: '0.78rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#334155', fontWeight: 600 }}>
                        <Clock size={13} color="#059669" />
                        <span>Hours: {hub.operating_hours || '24/7 Contactless Access'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                        <span>Capacity:</span>
                        <span style={{ fontWeight: 600 }}>{hub.total_lockers} Lockers ({hub.available_lockers || 0} Free)</span>
                      </div>
                      {typeof hub.lat === 'number' && typeof hub.lng === 'number' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                          <span>GPS Coordinates:</span>
                          <span>{hub.lat.toFixed(4)}° N, {hub.lng.toFixed(4)}° E</span>
                        </div>
                      )}
                    </div>

                    {/* Card Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {typeof hub.lat === 'number' && typeof hub.lng === 'number' && !isNaN(hub.lat) && !isNaN(hub.lng) ? (
                        <a
                          href={getDirectionsUrl(hub.lat, hub.lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1, padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                          id={`hub-directions-btn-${hub.id}`}
                        >
                          <Navigation size={13} /> Get Directions <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span
                          className="badge badge-maintenance"
                          style={{ flex: 1, textAlign: 'center', padding: '0.45rem', fontSize: '0.72rem' }}
                        >
                          GPS Coordinates Pending
                        </span>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('lockers');
                        }}
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                        id={`hub-reserve-btn-${hub.id}`}
                      >
                        <Lock size={13} /> View Lockers <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Interactive Leaflet Map */}
          <div
            style={{
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
              minHeight: '520px',
              height: '100%',
              maxHeight: '680px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              ref={mapContainerRef}
              style={{
                width: '100%',
                height: '100%',
                minHeight: '480px',
                zIndex: 1,
              }}
              id="leaflet-locker-map"
            />

            {/* Map Floating Indicator */}
            {selectedHub && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '16px',
                  right: '16px',
                  zIndex: 999,
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(6px)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)' }}>SELECTED STATION</div>
                  <div style={{ fontSize: '0.925rem', fontWeight: 800, color: 'var(--text-main)' }}>{selectedHub.name}</div>
                </div>

                {typeof selectedHub.lat === 'number' && typeof selectedHub.lng === 'number' && !isNaN(selectedHub.lat) && !isNaN(selectedHub.lng) ? (
                  <a
                    href={getDirectionsUrl(selectedHub.lat, selectedHub.lng)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '0.78rem' }}
                  >
                    <Navigation size={13} /> Directions
                  </a>
                ) : (
                  <span className="badge badge-maintenance" style={{ fontSize: '0.75rem' }}>
                    GPS Pending
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
