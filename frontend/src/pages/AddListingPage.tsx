import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { api } from '../api.js';
import { Item, User } from '../types.js';
import { formatINR } from '../utils/format.js';
import { ImageUpload } from '../components/ImageUpload.js';
import { getItemImageUrl, handleImageError, DEFAULT_PRODUCT_PLACEHOLDER } from '../utils/imageUtils.js';

interface AddListingPageProps {
  currentUser: User | null;
  editItem?: Item | null;
  onSuccess: (newItem: Item) => void;
  onCancel: () => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const CATEGORIES = [
  'Electronics',
  'Tools',
  'Sports equipment',
  'Books',
  'Travel accessories',
  'Home appliances',
  'Other items',
];

export const AddListingPage: React.FC<AddListingPageProps> = ({
  currentUser,
  editItem,
  onSuccess,
  onCancel,
  showToast,
}) => {
  const [title, setTitle] = useState(editItem?.title || '');
  const [description, setDescription] = useState(editItem?.description || '');
  const [category, setCategory] = useState(editItem?.category || 'Electronics');
  const [pricePerDay, setPricePerDay] = useState<string>(editItem ? String(editItem.price_per_day) : '499');
  const [deposit, setDeposit] = useState<string>(editItem ? String(editItem.deposit) : '2000');
  const [location, setLocation] = useState(editItem?.location || currentUser?.location || 'Bengaluru, KA');
  const [itemCondition, setItemCondition] = useState(editItem?.item_condition || 'Excellent');

  // Direct Product Image Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>(editItem?.image_url || '');

  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Clean up object URLs when unmounting or replacing
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = (file: File) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
    setError(null);
  };

  const handleRemovePhoto = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageUrl('');
  };

  const handleSelectPreset = (presetUrl: string, presetCategory?: string) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageUrl(presetUrl);
    if (presetCategory) {
      setCategory(presetCategory);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const price = parseFloat(pricePerDay);
    const dep = parseFloat(deposit);

    if (isNaN(price) || price <= 0) {
      setError('Please provide a valid positive rental rate.');
      return;
    }

    if (isNaN(dep) || dep < 0) {
      setError('Deposit amount cannot be negative.');
      return;
    }

    setLoading(true);

    try {
      let finalImageUrl = imageUrl;

      // 1. If a new photo file was chosen, upload it to the backend first
      if (selectedFile) {
        setLoadingText('Uploading product photo...');
        try {
          const uploadRes = await api.uploadImage(selectedFile);
          finalImageUrl = uploadRes.url;
        } catch (uploadErr: any) {
          setError(uploadErr.message || 'Failed to upload photo. Please try again.');
          setLoading(false);
          return;
        }
      }

      // If user has not uploaded or selected any photo, enforce selection or provide fallback
      if (!finalImageUrl) {
        setError('Please upload a product photo for your listing.');
        setLoading(false);
        return;
      }

      setLoadingText(editItem ? 'Updating listing...' : 'Publishing listing...');

      if (editItem) {
        const res = await api.updateItem(editItem.id, {
          title,
          description,
          category,
          price_per_day: price,
          deposit: dep,
          location,
          image_url: finalImageUrl,
          item_condition: itemCondition,
        });
        showToast('Listing updated successfully!', 'success');
        onSuccess(res.item);
      } else {
        const res = await api.createItem({
          title,
          description,
          category,
          price_per_day: price,
          deposit: dep,
          location,
          image_url: finalImageUrl,
          item_condition: itemCondition,
        });
        showToast('Listing published successfully!', 'success');
        onSuccess(res.item);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save listing.');
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  };

  // Preview source determination
  const livePreviewSrc = previewUrl || (imageUrl ? getItemImageUrl(imageUrl) : DEFAULT_PRODUCT_PLACEHOLDER);

  return (
    <div className="container" style={{ padding: '2.5rem 1.25rem' }}>
      <button onClick={onCancel} className="btn btn-secondary btn-sm" style={{ marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> Cancel & Return
      </button>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
          {editItem ? 'Edit Your Rental Listing' : 'List an Item for Rent'}
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Monetize equipment you don't use every day and help neighbors get the job done.
        </p>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: 'var(--status-danger-bg)',
            color: '#b91c1c',
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            fontWeight: 500,
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '2.5rem',
          alignItems: 'start',
        }}
      >
        {/* Form Column */}
        <form
          onSubmit={handleSubmit}
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            boxShadow: 'var(--shadow-sm)',
          }}
          id="add-listing-form"
        >
          <div className="form-group">
            <label className="form-label">Item Title</label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="e.g. Bosch Professional 18V Cordless Impact Drill Kit"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              id="listing-title-input"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-control"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                id="listing-category-select"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Condition</label>
              <select
                className="form-control"
                value={itemCondition}
                onChange={(e) => setItemCondition(e.target.value)}
                id="listing-condition-select"
              >
                <option value="Like New">Like New</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Rental Price / Day (₹)</label>
              <input
                type="number"
                step="1"
                min="1"
                required
                className="form-control"
                value={pricePerDay}
                onChange={(e) => setPricePerDay(e.target.value)}
                id="listing-price-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Security Deposit (₹)</label>
              <input
                type="number"
                step="1"
                min="0"
                required
                className="form-control"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                id="listing-deposit-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Pickup Location / Neighborhood</label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="e.g. Indiranagar, Bengaluru"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              id="listing-location-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description & What's Included</label>
            <textarea
              required
              className="form-control"
              rows={4}
              placeholder="Mention accessories, battery chargers, carrying cases, and any instructions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              id="listing-desc-input"
            />
          </div>

          {/* Direct Product Photo Upload Component */}
          <ImageUpload
            currentImageUrl={imageUrl}
            selectedFile={selectedFile}
            previewUrl={previewUrl}
            onFileSelect={handleFileSelect}
            onRemovePhoto={handleRemovePhoto}
            onSelectPreset={handleSelectPreset}
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: '1.25rem' }}
            id="listing-submit-btn"
          >
            {loading ? loadingText || 'Processing...' : editItem ? 'Update Listing' : 'Publish Rental Listing'}
          </button>
        </form>

        {/* Live Preview Column */}
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            LIVE PREVIEW (As renters will see it):
          </div>

          <div className="card">
            <div style={{ position: 'relative', width: '100%', height: '230px', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
              <img
                src={livePreviewSrc}
                alt={title || 'Preview'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={handleImageError}
              />
              <span
                className="badge badge-tag"
                style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(255,255,255,0.95)' }}
              >
                {category}
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
                }}
              >
                {formatINR(parseFloat(pricePerDay || '0'))}/day
              </span>
            </div>

            <div style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span className="badge badge-tag" style={{ fontSize: '0.72rem' }}>
                  Condition: {itemCondition}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Deposit: {formatINR(parseFloat(deposit || '0'))}
                </span>
              </div>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.35, marginBottom: '0.5rem' }}>
                {title || 'Item Title Preview'}
              </h3>

              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
                {description || 'Item description will appear here as you type in the form.'}
              </p>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Hosted by {currentUser?.name || 'You'}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {location || 'Location'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
