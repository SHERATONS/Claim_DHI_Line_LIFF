/**
 * Security Utilities
 * Provides XSS prevention, input sanitization, and file validation
 */

// File magic bytes signatures for validation
const FILE_SIGNATURES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]], // GIF87a, GIF89a
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF (WebP starts with RIFF)
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'application/msword': [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]], // DOC (OLE)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [[0x50, 0x4B, 0x03, 0x04]], // DOCX (ZIP)
  'application/vnd.ms-excel': [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]], // XLS (OLE)
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [[0x50, 0x4B, 0x03, 0x04]], // XLSX (ZIP)
  'application/zip': [[0x50, 0x4B, 0x03, 0x04], [0x50, 0x4B, 0x05, 0x06], [0x50, 0x4B, 0x07, 0x08]],
  'application/x-zip-compressed': [[0x50, 0x4B, 0x03, 0x04]],
};

// XSS patterns to detect
const XSS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /data:\s*text\/html/i,
  /vbscript:/i,
  /<svg[^>]*onload/i,
  /<img[^>]*onerror/i,
  /expression\s*\(/i,
  /url\s*\(\s*["']?\s*javascript:/i,
];

/**
 * Validate file using magic bytes (file signature)
 * More secure than MIME type checking alone
 */
export async function validateFileMagicBytes(file: File): Promise<{ valid: boolean; detectedType?: string; error?: string }> {
  try {
    // Read first 16 bytes of the file
    const buffer = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Check against known signatures
    for (const [mimeType, signatures] of Object.entries(FILE_SIGNATURES)) {
      for (const signature of signatures) {
        // Inline signature matching
        if (signature.length <= bytes.length && signature.every((byte, i) => bytes[i] === byte)) {
          // Verify exact match or image/* wildcard
          const isMatch = file.type === mimeType ||
            (file.type.startsWith('image/') && mimeType.startsWith('image/'));
          if (isMatch) {
            return { valid: true, detectedType: mimeType };
          }
          // Type mismatch - file extension/MIME doesn't match content
          return {
            valid: false,
            detectedType: mimeType,
            error: `ประเภทไฟล์ไม่ตรงกับเนื้อหา (${file.type} vs ${mimeType})`,
          };
        }
      }
    }

    // For image/* types that we couldn't verify, be lenient
    if (file.type.startsWith('image/')) {
      return { valid: true, detectedType: file.type };
    }

    return { valid: false, error: 'ไม่สามารถยืนยันประเภทไฟล์ได้' };
  } catch {
    return { valid: false, error: 'เกิดข้อผิดพลาดในการตรวจสอบไฟล์' };
  }
}

/**
 * Sanitize filename to prevent path traversal and injection
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return 'unnamed_file';

  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // Remove invalid chars
    .replace(/\.\./g, '_') // Prevent path traversal
    .replace(/^\./, '_') // Don't start with dot
    .replace(/\s+/g, '_') // Replace spaces
    .replace(/_+/g, '_') // Collapse multiple underscores
    .substring(0, 255);
}

/**
 * Check if a string contains potential XSS patterns
 */
export function containsXSS(input: string): boolean {
  if (!input) return false;
  return XSS_PATTERNS.some((pattern) => pattern.test(input));
}

/**
 * Sanitize text input with XSS check
 * Returns sanitized text and whether XSS was detected
 */
export function sanitizeTextInput(input: string): { text: string; hadXSS: boolean } {
  if (!input) return { text: '', hadXSS: false };

  const hadXSS = containsXSS(input);

  let sanitized = input
    .replace(/\0/g, '') // Remove null bytes
    .trim();

  // Encode HTML entities if XSS detected
  if (hadXSS) {
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  // Limit length to prevent DoS
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }

  return { text: sanitized, hadXSS };
}

/**
 * Simple text sanitization without XSS check result
 */
export function sanitizeText(input: string): string {
  return sanitizeTextInput(input).text;
}

/**
 * Generate a secure random ID using crypto API
 */
export function generateSecureId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
