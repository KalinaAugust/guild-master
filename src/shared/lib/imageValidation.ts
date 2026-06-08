export const MAX_IMAGE_UPLOAD_SIZE = 5 * 1024 * 1024; // 5 MB

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Value for an <input type="file" accept> attribute. */
export const ACCEPTED_IMAGE_ACCEPT = ACCEPTED_IMAGE_TYPES.join(',');

/**
 * Validates a user-selected avatar file by MIME type and size.
 * Returns an error message when invalid, or null when the file is acceptable.
 */
export const validateImageFile = (file: File): string | null => {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Please select a JPEG, PNG, or WEBP image';
  }
  if (file.size > MAX_IMAGE_UPLOAD_SIZE) {
    return 'Image must be 5 MB or smaller';
  }
  return null;
};
