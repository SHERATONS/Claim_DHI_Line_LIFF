/**
 * API Types
 * ลอกจาก LIFF_Form.page — submit, upload, locations
 */

// Submit Claim Response
export interface SubmitClaimResponse {
  success: boolean;
  caseId?: string;
  caseNumber?: string;
  error?: string;
  code?: string;
}

// Upload File Response
export interface UploadFileResponse {
  success: boolean;
  fileId?: string;
  fileName?: string;
  error?: string;
  code?: string;
}

// Location Item (province/district/subdistrict)
export interface LocationItemResponse {
  id: string;
  text: string;
  zipcode?: string;
}

// Error Codes
export const API_ERROR_CODES = {
  INVALID_TOKEN: 'INVALID_TOKEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  CASE_NOT_FOUND: 'CASE_NOT_FOUND',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  MAX_FILES_EXCEEDED: 'MAX_FILES_EXCEEDED',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

// API Error Response
export interface ApiError {
  success: false;
  message?: string;
  error?: string;
  code?: ApiErrorCode;
}
