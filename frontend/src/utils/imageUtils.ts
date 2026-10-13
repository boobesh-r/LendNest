import React from 'react';

export const DEFAULT_PRODUCT_PLACEHOLDER =
  'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Returns safe image source URL, falling back to placeholder if empty.
 */
export function getItemImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return DEFAULT_PRODUCT_PLACEHOLDER;
  }
  return url.trim();
}

/**
 * Resilient error handler for <img> tags that sets fallback image without infinite looping.
 */
export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  const target = e.currentTarget;
  if (target.src !== DEFAULT_PRODUCT_PLACEHOLDER) {
    target.src = DEFAULT_PRODUCT_PLACEHOLDER;
  }
}

/**
 * Validates file type and size on client side prior to preview or upload.
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  const isAllowedMime = ALLOWED_IMAGE_TYPES.includes(fileType);
  const isAllowedExt = /\.(jpg|jpeg|png|webp)$/i.test(fileName);

  if (!isAllowedMime && !isAllowedExt) {
    return {
      valid: false,
      error: 'Unsupported image format. Please select a JPEG, PNG, or WebP photo.',
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${sizeMB} MB). Maximum allowed photo upload size is 5 MB.`,
    };
  }

  return { valid: true };
}
