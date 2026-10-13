import React, { useRef, useState } from 'react';
import { UploadCloud, Camera, RefreshCw, Trash2, AlertCircle, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { validateImageFile, getItemImageUrl, handleImageError } from '../utils/imageUtils.js';

interface ImageUploadProps {
  currentImageUrl?: string;
  selectedFile: File | null;
  previewUrl: string | null;
  onFileSelect: (file: File) => void;
  onRemovePhoto: () => void;
  onSelectPreset?: (presetUrl: string, category: string) => void;
  disabled?: boolean;
}

export const PRESET_DEMO_IMAGES = [
  {
    name: 'Sony Camera',
    url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80',
    category: 'Electronics',
  },
  {
    name: 'DJI Drone',
    url: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800&auto=format&fit=crop&q=80',
    category: 'Electronics',
  },
  {
    name: 'Impact Drill',
    url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&auto=format&fit=crop&q=80',
    category: 'Tools',
  },
  {
    name: 'Paddleboard',
    url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop&q=80',
    category: 'Sports equipment',
  },
  {
    name: 'Mountain Bike',
    url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&auto=format&fit=crop&q=80',
    category: 'Sports equipment',
  },
  {
    name: 'Dyson Vacuum',
    url: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800&auto=format&fit=crop&q=80',
    category: 'Home appliances',
  },
  {
    name: 'Luggage Set',
    url: 'https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=800&auto=format&fit=crop&q=80',
    category: 'Travel accessories',
  },
];

export const ImageUpload: React.FC<ImageUploadProps> = ({
  currentImageUrl,
  selectedFile,
  previewUrl,
  onFileSelect,
  onRemovePhoto,
  onSelectPreset,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  const activeDisplayUrl = previewUrl || (currentImageUrl ? getItemImageUrl(currentImageUrl) : null);

  const handleProcessFile = (file: File) => {
    setValidationError(null);
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid image file.');
      return;
    }
    onFileSelect(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
    // Reset inputs so selecting the same file triggers onChange
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  return (
    <div className="form-group" style={{ marginBottom: '1.75rem' }}>
      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Product Photo <span style={{ color: 'var(--primary)' }}>*</span></span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Max 5 MB (JPEG, PNG, WebP)</span>
      </label>

      {/* Hidden File Input for Device Gallery / Computer Picker */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileInputChange}
        disabled={disabled}
        style={{ display: 'none' }}
        id="product-photo-upload-input"
      />

      {/* Hidden File Input specifically for Mobile Camera capture */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleFileInputChange}
        disabled={disabled}
        style={{ display: 'none' }}
        id="product-photo-camera-input"
      />

      {/* Validation Error Banner */}
      {validationError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--status-danger-bg)',
            color: '#b91c1c',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            marginBottom: '0.85rem',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <AlertCircle size={16} />
          <span>{validationError}</span>
        </div>
      )}

      {/* Active Photo Preview Box */}
      {activeDisplayUrl ? (
        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-card)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ position: 'relative', width: '100%', height: '230px', backgroundColor: '#f1f5f9' }}>
            <img
              src={activeDisplayUrl}
              alt="Product Preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={handleImageError}
            />

            {/* Status overlay badge */}
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                color: '#fff',
                padding: '0.3rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backdropFilter: 'blur(4px)',
              }}
            >
              {selectedFile ? (
                <>
                  <CheckCircle size={14} color="#10b981" />
                  <span>Ready to upload: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                </>
              ) : (
                <>
                  <ImageIcon size={14} color="#38bdf8" />
                  <span>Current listing photo</span>
                </>
              )}
            </div>
          </div>

          {/* Action Toolbar */}
          <div
            style={{
              padding: '0.85rem 1rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.6rem',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-surface)',
              borderTop: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="btn btn-secondary btn-sm"
                id="btn-replace-photo"
              >
                <RefreshCw size={14} /> Replace Photo
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={disabled}
                className="btn btn-secondary btn-sm"
                id="btn-take-photo-camera"
                title="Use camera on mobile or tablet"
              >
                <Camera size={14} /> Take Photo
              </button>
            </div>

            <button
              type="button"
              onClick={onRemovePhoto}
              disabled={disabled}
              className="btn btn-sm"
              style={{
                backgroundColor: 'transparent',
                color: '#dc2626',
                border: '1px solid #fca5a5',
              }}
              id="btn-remove-photo"
            >
              <Trash2 size={14} /> Remove Photo
            </button>
          </div>
        </div>
      ) : (
        /* Empty State Dropzone & Upload Action Area */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-xl)',
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            backgroundColor: dragActive ? 'rgba(37, 99, 235, 0.04)' : 'var(--bg-surface)',
            transition: 'all 0.2s ease',
          }}
          id="product-photo-dropzone"
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}
          >
            <UploadCloud size={28} />
          </div>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
            Upload Product Photo
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '380px', margin: '0 auto 1.25rem' }}>
            Choose a photo from your computer or phone gallery, or drag and drop it here.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {/* Primary Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="btn btn-primary"
              style={{ minWidth: '170px' }}
              id="btn-upload-product-photo"
            >
              <UploadCloud size={16} /> Upload Product Photo
            </button>

            {/* Mobile Camera Button */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={disabled}
              className="btn btn-secondary"
              id="btn-camera-product-photo"
              title="Open camera directly on supported mobile browsers"
            >
              <Camera size={16} /> Take Photo (Camera)
            </button>
          </div>

          <div style={{ marginTop: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Supported formats: <strong>JPEG, PNG, WebP</strong> (up to 5 MB)
          </div>
        </div>
      )}

      {/* Quick Demo Sample Photos Option */}
      {onSelectPreset && (
        <div style={{ marginTop: '1rem' }}>
          <button
            type="button"
            onClick={() => setShowPresets(!showPresets)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            {showPresets ? '▲ Hide sample demo equipment photos' : '▼ Or test with a sample equipment photo'}
          </button>

          {showPresets && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
              {PRESET_DEMO_IMAGES.map((p) => (
                <button
                  type="button"
                  key={p.name}
                  onClick={() => {
                    onSelectPreset(p.url, p.category);
                    setValidationError(null);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
