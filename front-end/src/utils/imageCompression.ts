/**
 * Image Compression Utilities
 */

import Compressor from 'compressorjs';
import { IMAGE_COMPRESSION } from '@/config';

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Check if file is HEIC/HEIF format (iOS)
 */
export function isHeicFile(file: File): boolean {
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.heic$/i.test(file.name) ||
    /\.heif$/i.test(file.name)
  );
}

/**
 * Compress image file
 * - Converts HEIC to JPEG
 * - Reduces file size if over threshold
 * - Maintains aspect ratio within max dimensions
 */
export function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    // Skip non-image files
    if (!isImageFile(file) && !isHeicFile(file)) {
      resolve(file);
      return;
    }

    const isHeic = isHeicFile(file);

    // Skip small images unless HEIC
    if (file.size <= IMAGE_COMPRESSION.COMPRESS_THRESHOLD && !isHeic) {
      resolve(file);
      return;
    }

    // Generate new filename for HEIC
    const newFileName = isHeic
      ? file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg')
      : file.name;

    new Compressor(file, {
      quality: IMAGE_COMPRESSION.QUALITY,
      maxWidth: IMAGE_COMPRESSION.MAX_WIDTH,
      maxHeight: IMAGE_COMPRESSION.MAX_HEIGHT,
      convertSize: 500000, // Convert to JPEG if over 500KB
      mimeType: isHeic ? 'image/jpeg' : undefined,
      success: (compressedBlob) => {
        const compressedFile = new File(
          [compressedBlob],
          newFileName,
          {
            type: isHeic ? 'image/jpeg' : compressedBlob.type,
            lastModified: Date.now(),
          }
        );
        resolve(compressedFile);
      },
      error: (err: Error) => {
        // Log error for debugging
        console.warn(`Image compression failed for ${file.name}:`, err.message);
        // Return original file if compression fails
        resolve(file);
      },
    });
  });
}
