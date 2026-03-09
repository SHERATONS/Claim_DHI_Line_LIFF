import { useState, useEffect, useRef } from 'react';
import { compressImage } from '@/utils/imageCompression';
import { validateFileTypeSecure, validateFileSize, type ValidationResult } from '@/utils/validation';
import { generateSecureId } from '@/utils/security';
import { FILE_LIMITS, IMAGE_COMPRESSION } from '@/config';

export interface UploadFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface UseFileUploadOptions {
  maxFiles?: number;
  autoCompress?: boolean;
  /** Force a naming prefix for all files in this hook instance.
   *  'auto' (default) derives prefix from MIME type. */
  filePrefix?: 'image' | 'document' | 'auto';
}

interface UseFileUploadReturn {
  files: UploadFile[];
  addFiles: (newFiles: FileList | File[]) => Promise<ValidationResult[]>;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  updateFileStatus: (id: string, status: UploadFile['status'], progress?: number, error?: string) => void;
  totalSize: number;
  canAddMore: boolean;
}

/**
 * Generate a typed filename with a running number.
 * prefix: 'image' | 'document' | 'auto'
 *   - 'auto'     → derive from MIME type (image/* → 'image', else 'document')
 *   - 'image'    → always 'image<N>.ext'
 *   - 'document' → always 'document<N>.ext'
 */
function generateTypedFileName(file: File, index: number, prefix: 'image' | 'document' | 'auto'): string {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const resolvedPrefix = prefix === 'auto'
    ? (file.type.startsWith('image/') ? 'image' : 'document')
    : prefix;
  return `${resolvedPrefix}${index}.${ext}`;
}

/**
 * Custom hook for file upload with compression and validation
 * Includes memory leak prevention for Object URLs
 * React Compiler จัดการ memoization ให้อัตโนมัติ
 */
export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const { maxFiles = FILE_LIMITS.MAX_FILES, autoCompress = true, filePrefix = 'auto' } = options;
  const [files, setFiles] = useState<UploadFile[]>([]);

  // Track all created Object URLs for cleanup
  const objectUrlsRef = useRef<Set<string>>(new Set());

  // Cleanup Object URLs on unmount
  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      urls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      urls.clear();
    };
  }, []);

  // Helper to create and track Object URL
  const createTrackedObjectUrl = (file: File): string => {
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.add(url);
    return url;
  };

  // Helper to revoke and untrack Object URL
  const revokeTrackedObjectUrl = (url: string) => {
    if (url && objectUrlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(url);
    }
  };

  const addFiles = async (newFiles: FileList | File[]): Promise<ValidationResult[]> => {
    const fileArray = Array.from(newFiles);

    const remainingSlots = maxFiles - files.length;
    if (remainingSlots <= 0) {
      return [{ valid: false, error: `จำนวนไฟล์สูงสุด ${maxFiles} ไฟล์` }];
    }

    const filesToProcess = fileArray.slice(0, remainingSlots);

    // Count existing files by the resolved prefix to seed running numbers correctly
    let imageCount = filePrefix === 'document'
      ? 0
      : filePrefix === 'image'
        ? files.length
        : files.filter((f) => f.file.type.startsWith('image/')).length;

    let documentCount = filePrefix === 'image'
      ? 0
      : filePrefix === 'document'
        ? files.length
        : files.filter((f) => !f.file.type.startsWith('image/')).length;

    // Process all files sequentially to keep running numbers in order
    const processedResults: { valid: boolean; error?: string; uploadFile?: UploadFile }[] = [];

    for (const file of filesToProcess) {
      // Validate file type with magic bytes (secure)
      const typeResult = await validateFileTypeSecure(file);
      if (!typeResult.valid) {
        processedResults.push({ valid: false, error: typeResult.error });
        continue;
      }

      // Validate file size
      const sizeResult = validateFileSize(file);
      if (!sizeResult.valid) {
        processedResults.push({ valid: false, error: sizeResult.error });
        continue;
      }

      // Process file
      let processedFile = file;

      // Determine running index based on resolved prefix
      const resolvedPrefix = filePrefix === 'auto'
        ? (file.type.startsWith('image/') ? 'image' : 'document')
        : filePrefix;
      const typedIndex = resolvedPrefix === 'image' ? ++imageCount : ++documentCount;
      const renamedName = generateTypedFileName(file, typedIndex, filePrefix);

      // Compress image if needed (using constant)
      if (autoCompress && file.type.startsWith('image/') && file.size > IMAGE_COMPRESSION.COMPRESS_THRESHOLD) {
        try {
          processedFile = await compressImage(file);
        } catch {
          // Use original if compression fails
          console.warn(`Failed to compress ${file.name}, using original`);
        }
      }

      // Rename file with typed running number (image<N>.ext or document<N>.ext)
      processedFile = new File([processedFile], renamedName, { type: processedFile.type });

      // Create preview URL (tracked for cleanup)
      const preview = processedFile.type.startsWith('image/')
        ? createTrackedObjectUrl(processedFile)
        : '';

      processedResults.push({
        valid: true,
        uploadFile: {
          id: generateSecureId(),
          file: processedFile,
          preview,
          status: 'pending',
          progress: 0,
        },
      });
    }

    // Separate valid and invalid results
    const results: ValidationResult[] = [];
    const validFiles: UploadFile[] = [];

    for (const result of processedResults) {
      if (result.valid && result.uploadFile) {
        validFiles.push(result.uploadFile);
        results.push({ valid: true });
      } else {
        results.push({ valid: false, error: result.error });
      }
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }

    // Report if some files were skipped due to limit
    if (fileArray.length > filesToProcess.length) {
      results.push({
        valid: false,
        error: `บางไฟล์ไม่ถูกเพิ่มเนื่องจากเกินจำนวนสูงสุด ${maxFiles} ไฟล์`,
      });
    }

    return results;
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) {
        revokeTrackedObjectUrl(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const clearFiles = () => {
    setFiles((prev) => {
      prev.forEach((file) => {
        if (file.preview) {
          revokeTrackedObjectUrl(file.preview);
        }
      });
      return [];
    });
  };

  const updateFileStatus = (
    id: string,
    status: UploadFile['status'],
    progress?: number,
    error?: string
  ) => {
    setFiles((prev) =>
      prev.map((file) =>
        file.id === id
          ? {
            ...file,
            status,
            progress: progress ?? file.progress,
            error: error ?? file.error,
          }
          : file
      )
    );
  };

  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);
  const canAddMore = files.length < maxFiles;

  return {
    files,
    addFiles,
    removeFile,
    clearFiles,
    updateFileStatus,
    totalSize,
    canAddMore,
  };
}
