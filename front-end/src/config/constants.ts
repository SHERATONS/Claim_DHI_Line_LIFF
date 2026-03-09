/**
 * Application Constants
 */

// File upload limits
export const FILE_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_FILES: 10,
} as const;

// Allowed file types
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
] as const;

// File extensions for display
export const ALLOWED_EXTENSIONS = '.jpg, .jpeg, .png, .pdf, .doc, .docx, .xls, .xlsx, .zip';

// Image compression settings
export const IMAGE_COMPRESSION = {
  MAX_WIDTH: 2048,
  MAX_HEIGHT: 2048,
  QUALITY: 0.8,
  COMPRESS_THRESHOLD: 1 * 1024 * 1024, // 1MB
} as const;

// Form validation
export const VALIDATION = {
  PHONE_REGEX: /^0[0-9]{8,9}$/,
  EMAIL_REGEX: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  CITIZEN_ID_REGEX: /^[0-9]{13}$/,
  POLICY_NUMBER_MAX_LENGTH: 50,
  NAME_MAX_LENGTH: 255,
  EMAIL_MAX_LENGTH: 100,
  PHONE_MAX_LENGTH: 20,
} as const;
