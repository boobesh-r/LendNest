import React, { useState, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  X,
  ArrowUpDown,
  Tag,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { Item } from '../types.js';
import { api } from '../api.js';
import { formatINR } from '../utils/format.js';
import { getItemImageUrl, handleImageError } from '../utils/imageUtils.js';


interface BrowsePageProps {
  initialSearch?: string;
  initialCategory?: string;
  onSelectItem: (item: Item) => void;
}

const CATEGORIES = [
  'All',
  'Electronics',
  'Tools',
  'Sports equipment',
  'Books',
  'Travel accessories',
  'Home appliances',
  'Other items',
];

export const BrowsePage: React.FC<BrowsePageProps> = ({
  initialSearch = '',
  initialCategory = 'All',
  onSelectItem,
}) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory || 'All');
  const [maxPrice, setMaxPrice] = useState<number>(5000);
  const [location, setLocation] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState('newest');

  // Trigger item fetch whenever filters change
  useEffect(() => {
    async function fetchItems() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getItems({
          search,
          category: category === 'All' ? '' : category,
          maxPrice: maxPrice < 5000 ? maxPrice : undefined,
          location,
          availableOnly: availableOnly ? 'true' : undefined,
          sort,
        });
        setItems(res.items);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch items');
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      fetchItems();
    }, 200);

    return () => clearTimeout(timer);
  }, [search, category, maxPrice, location, availableOnly, sort]);

  const resetFilters = () => {
    setSearch('');
    setCategory('All');
    setMaxPrice(5000);
    setLocation('');
    setAvailableOnly(false);
    setSort('newest');
  };

  return (
    <div className="container" style={{ padding: '2.5rem 1.25rem' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
          Explore Rental Gear
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Find power tools, electronics, camping gear, and appliances available for rent in your community.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'center' }}>
          {/* Keyword Search */}
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '0.75rem', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search gear by name..."
              className="form-control"
              style={{ paddingLeft: '2.4rem' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              id="browse-search-input"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: '0.85rem', top: '0.75rem', color: '#94a3b8' }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Location filter */}
          <div style={{ position: 'relative' }}>
            <MapPin size={18} style={{ position: 'absolute', left: '0.85rem', top: '0.75rem', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="City or location (e.g. Seattle)"
              className="form-control"
              style={{ paddingLeft: '2.4rem' }}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              id="browse-location-input"
            />
          </div>

          {/* Sort selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowUpDown size={16} color="#64748b" />
            <select
              className="form-control"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              id="browse-sort-select"
            >
              <option value="newest">Sort: Newly Listed</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>

          {/* Max Price Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              <span>Max Price / Day:</span>
              <span style={{ color: 'var(--primary)' }}>{maxPrice >= 5000 ? 'Any (₹5,000+)' : formatINR(maxPrice)}</span>
            </div>
            <input
              type="range"
              min="100"
              max="5000"
              step="100"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
              id="browse-price-slider"
            />
          </div>
        </div>

        {/* Category Pills & Availability Checkbox */}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: '1rem', paddingTop: '1rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  backgroundColor: category === cat ? 'var(--primary)' : 'var(--bg-subtle)',
                  color: category === cat ? 'white' : 'var(--text-secondary)',
                  border: `1px solid ${category === cat ? 'var(--primary)' : 'var(--border)'}`,
                  transition: 'all 0.15s ease',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-main)' }}>
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
              style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
            />
            Available items only
          </label>
        </div>
      </div>

      {/* Results Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.925rem', color: 'var(--text-secondary)' }}>
          Showing <strong>{items.length}</strong> rental listing{items.length === 1 ? '' : 's'}
        </div>
        {(search || category !== 'All' || maxPrice < 5000 || location || availableOnly) && (
          <button onClick={resetFilters} className="btn btn-secondary btn-sm" style={{ color: 'var(--primary)' }}>
            <X size={14} /> Clear all filters
          </button>
        )}
      </div>

      {/* Grid or Empty State */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
          <div className="badge badge-tag" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
            Loading available items...
          </div>
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            padding: '4rem 2rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              color: 'var(--text-muted)',
            }}
          >
            <SlidersHorizontal size={28} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No listings matched your filters</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
            Try expanding your search term, adjusting your price slider, or browsing all categories.
          </p>
          <button onClick={resetFilters} className="btn btn-primary">
            Reset Filters
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
            gap: '1.5rem',
          }}
          id="items-browse-grid"
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="card"
              onClick={() => onSelectItem(item)}
              style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ position: 'relative', width: '100%', height: '220px', overflow: 'hidden' }}>
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
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                />
                <span
                  className="badge badge-tag"
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
                    backgroundColor: 'rgba(15, 23, 42, 0.88)',
                    color: 'white',
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  {formatINR(item.price_per_day)}/day
                </span>
              </div>

              <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span className="badge badge-tag" style={{ fontSize: '0.72rem' }}>
                    Condition: {item.item_condition}
                  </span>
                  {item.deposit > 0 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Deposit: {formatINR(item.deposit)}
                    </span>
                  )}
                </div>

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

                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img
                      src={item.owner_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${item.owner_name}`}
                      alt={item.owner_name}
                      style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {item.owner_name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <MapPin size={13} color="#059669" />
                    <span>{item.location}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
