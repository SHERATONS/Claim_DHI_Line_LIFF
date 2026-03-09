import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileUpload } from '@/hooks/useFileUpload';

// Mock dependencies
vi.mock('@/utils/imageCompression', () => ({
  compressImage: vi.fn((file: File) => Promise.resolve(file)),
}));

vi.mock('@/utils/security', () => ({
  sanitizeFileName: vi.fn((name: string) => name.replace(/[<>]/g, '_')),
  generateSecureId: vi.fn(() => 'mock-id-' + Math.random().toString(36).slice(2)),
}));

vi.mock('@/utils/validation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/validation')>();
  return {
    ...actual,
    // Mock the async secure validation
    validateFileTypeSecure: vi.fn(async (file: File) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (allowedTypes.includes(file.type) || file.type.startsWith('image/')) {
        return { valid: true };
      }
      return { valid: false, error: `ไฟล์ "${file.name}" ไม่รองรับ` };
    }),
    validateFileSize: vi.fn((file: File) => {
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        return { valid: false, error: `ไฟล์ "${file.name}" ขนาดเกิน 5MB` };
      }
      return { valid: true };
    }),
  };
});

describe('useFileUpload', () => {
  const createMockFile = (
    name: string,
    size: number = 1000,
    type: string = 'image/jpeg'
  ): File => {
    const blob = new Blob(['x'.repeat(size)], { type });
    return new File([blob], name, { type });
  };

  let createObjectURLMock: ReturnType<typeof vi.fn>;
  let revokeObjectURLMock: ReturnType<typeof vi.fn>;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();

    // Save originals
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;

    // Mock URL methods
    createObjectURLMock = vi.fn(() => 'blob:mock-url');
    revokeObjectURLMock = vi.fn();
    URL.createObjectURL = createObjectURLMock;
    URL.revokeObjectURL = revokeObjectURLMock;
  });

  afterEach(() => {
    // Restore originals
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('should initialize with empty files', () => {
    const { result } = renderHook(() => useFileUpload());

    expect(result.current.files).toEqual([]);
    expect(result.current.totalSize).toBe(0);
    expect(result.current.canAddMore).toBe(true);
  });

  it('should add valid files', async () => {
    const { result } = renderHook(() => useFileUpload());
    const file = createMockFile('test.jpg');

    await act(async () => {
      const results = await result.current.addFiles([file]);
      expect(results).toHaveLength(1);
      expect(results[0].valid).toBe(true);
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].file.name).toBe('test.jpg');
    expect(result.current.files[0].status).toBe('pending');
  });

  it('should reject invalid file types', async () => {
    const { result } = renderHook(() => useFileUpload());
    const file = createMockFile('test.exe', 1000, 'application/x-msdownload');

    await act(async () => {
      const results = await result.current.addFiles([file]);
      expect(results).toHaveLength(1);
      expect(results[0].valid).toBe(false);
    });

    expect(result.current.files).toHaveLength(0);
  });

  it('should reject files exceeding size limit', async () => {
    const { result } = renderHook(() => useFileUpload());
    // 6MB file (exceeds 5MB limit)
    const file = createMockFile('large.jpg', 6 * 1024 * 1024);

    await act(async () => {
      const results = await result.current.addFiles([file]);
      expect(results).toHaveLength(1);
      expect(results[0].valid).toBe(false);
    });

    expect(result.current.files).toHaveLength(0);
  });

  it('should respect maxFiles limit', async () => {
    const { result } = renderHook(() => useFileUpload({ maxFiles: 2 }));

    await act(async () => {
      await result.current.addFiles([
        createMockFile('file1.jpg'),
        createMockFile('file2.jpg'),
      ]);
    });

    expect(result.current.files).toHaveLength(2);
    expect(result.current.canAddMore).toBe(false);

    await act(async () => {
      const results = await result.current.addFiles([createMockFile('file3.jpg')]);
      expect(results[0].valid).toBe(false);
      expect(results[0].error).toContain('สูงสุด');
    });

    expect(result.current.files).toHaveLength(2);
  });

  it('should remove file by id', async () => {
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.addFiles([createMockFile('test.jpg')]);
    });

    const fileId = result.current.files[0].id;

    act(() => {
      result.current.removeFile(fileId);
    });

    expect(result.current.files).toHaveLength(0);
    expect(revokeObjectURLMock).toHaveBeenCalled();
  });

  it('should clear all files', async () => {
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.addFiles([
        createMockFile('file1.jpg'),
        createMockFile('file2.jpg'),
      ]);
    });

    expect(result.current.files).toHaveLength(2);

    act(() => {
      result.current.clearFiles();
    });

    expect(result.current.files).toHaveLength(0);
    // Both previews should be revoked
    expect(revokeObjectURLMock).toHaveBeenCalled();
  });

  it('should update file status', async () => {
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.addFiles([createMockFile('test.jpg')]);
    });

    const fileId = result.current.files[0].id;

    act(() => {
      result.current.updateFileStatus(fileId, 'uploading', 50);
    });

    expect(result.current.files[0].status).toBe('uploading');
    expect(result.current.files[0].progress).toBe(50);

    act(() => {
      result.current.updateFileStatus(fileId, 'success', 100);
    });

    expect(result.current.files[0].status).toBe('success');
    expect(result.current.files[0].progress).toBe(100);
  });

  it('should update file status with error', async () => {
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.addFiles([createMockFile('test.jpg')]);
    });

    const fileId = result.current.files[0].id;

    act(() => {
      result.current.updateFileStatus(fileId, 'error', 0, 'Upload failed');
    });

    expect(result.current.files[0].status).toBe('error');
    expect(result.current.files[0].error).toBe('Upload failed');
  });

  it('should calculate total size correctly', async () => {
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.addFiles([
        createMockFile('file1.jpg', 1000),
        createMockFile('file2.jpg', 2000),
      ]);
    });

    expect(result.current.totalSize).toBe(3000);
  });

  it('should sanitize file names with special characters', async () => {
    const { result } = renderHook(() => useFileUpload());
    const file = createMockFile('<script>.jpg');

    await act(async () => {
      await result.current.addFiles([file]);
    });

    // File name should be sanitized
    expect(result.current.files[0].file.name).toBe('_script_.jpg');
  });

  it('should create preview URL for images', async () => {
    const { result } = renderHook(() => useFileUpload());
    const file = createMockFile('test.jpg', 1000, 'image/jpeg');

    await act(async () => {
      await result.current.addFiles([file]);
    });

    expect(result.current.files[0].preview).toBe('blob:mock-url');
  });

  it('should not create preview URL for non-images', async () => {
    const { result } = renderHook(() => useFileUpload());
    const file = createMockFile('test.pdf', 1000, 'application/pdf');

    await act(async () => {
      await result.current.addFiles([file]);
    });

    expect(result.current.files[0].preview).toBe('');
  });

  it('should handle FileList input', async () => {
    const { result } = renderHook(() => useFileUpload());

    const file1 = createMockFile('test1.jpg');
    const file2 = createMockFile('test2.jpg');

    // Create mock FileList
    const fileList = {
      0: file1,
      1: file2,
      length: 2,
      item: (index: number) => (index === 0 ? file1 : file2),
      [Symbol.iterator]: function* () {
        yield file1;
        yield file2;
      },
    } as unknown as FileList;

    await act(async () => {
      const results = await result.current.addFiles(fileList);
      expect(results).toHaveLength(2);
    });

    expect(result.current.files).toHaveLength(2);
  });

  it('should warn when exceeding file limit in batch', async () => {
    const { result } = renderHook(() => useFileUpload({ maxFiles: 2 }));

    await act(async () => {
      const results = await result.current.addFiles([
        createMockFile('file1.jpg'),
        createMockFile('file2.jpg'),
        createMockFile('file3.jpg'),
      ]);

      // Should have 3 results: 2 valid + 1 warning
      expect(results).toHaveLength(3);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(true);
      expect(results[2].valid).toBe(false);
      expect(results[2].error).toContain('เกินจำนวนสูงสุด');
    });

    expect(result.current.files).toHaveLength(2);
  });
});
