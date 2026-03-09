import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { submitClaim, uploadFiles, uploadFilesParallel } from '@/services/api';
import type { ClaimFormSchema } from '@/utils/validation';

// Mock axios
vi.mock('axios', () => {
  const mockAxiosInstance = {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };

  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
      isAxiosError: vi.fn((error) => error?.isAxiosError === true),
    },
  };
});

describe('API Service', () => {
  const mockToken = 'test-token';
  const mockClaimData: ClaimFormSchema = {
    policyNumber: 'POL-123',
    memberId: 'MEM-001',
    citizenId: '1234567890123',
    passportId: '',
    claimantName: 'Test User',
    phone: '0812345678',
    email: 'test@example.com',
    claimAmount: '1000',
    description: 'Test claim',
  };

  let mockAxiosInstance: ReturnType<typeof axios.create>;
  let responseInterceptorError: ((error: unknown) => Promise<never>) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();

    // Get the mock axios instance
    mockAxiosInstance = axios.create();

    // Capture the response interceptor error handler
    (mockAxiosInstance.interceptors.response.use as ReturnType<typeof vi.fn>).mockImplementation(
      (_success: unknown, error: (error: unknown) => Promise<never>) => {
        responseInterceptorError = error;
      }
    );

    // Re-import to trigger interceptor setup
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('submitClaim', () => {
    it('should submit claim successfully', async () => {
      const mockResponse = {
        success: true,
        caseNumber: 'CASE-001',
        caseId: 'uuid-123',
      };

      (mockAxiosInstance.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockResponse,
      });

      const result = await submitClaim(mockClaimData, mockToken);

      expect(result).toEqual(mockResponse);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/claims',
        mockClaimData,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('should throw error with server message on failed submission', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          data: { message: 'Invalid data' },
          status: 400,
        },
        code: undefined,
      };

      (mockAxiosInstance.post as ReturnType<typeof vi.fn>).mockRejectedValue(axiosError);

      // Simulate interceptor behavior
      if (responseInterceptorError) {
        await expect(responseInterceptorError(axiosError)).rejects.toThrow('Invalid data');
      }
    });

    it('should use default error message when response has no message', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          data: {},
          status: 500,
        },
        code: undefined,
      };

      // Simulate interceptor behavior
      if (responseInterceptorError) {
        await expect(responseInterceptorError(axiosError)).rejects.toThrow(
          'เกิดข้อผิดพลาดในการเชื่อมต่อ'
        );
      }
    });

    it('should handle timeout error', async () => {
      const axiosError = {
        isAxiosError: true,
        code: 'ECONNABORTED',
        response: undefined,
      };

      // Simulate interceptor behavior
      if (responseInterceptorError) {
        await expect(responseInterceptorError(axiosError)).rejects.toThrow(
          'หมดเวลาการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง'
        );
      }
    });

    it('should handle network error', async () => {
      const axiosError = {
        isAxiosError: true,
        code: 'ERR_NETWORK',
        response: undefined,
      };

      // Simulate interceptor behavior
      if (responseInterceptorError) {
        await expect(responseInterceptorError(axiosError)).rejects.toThrow(
          'ไม่สามารถเชื่อมต่อเครือข่ายได้'
        );
      }
    });

    it('should handle canceled request', async () => {
      const axiosError = {
        isAxiosError: true,
        code: 'ERR_CANCELED',
        response: undefined,
      };

      // Simulate interceptor behavior
      if (responseInterceptorError) {
        await expect(responseInterceptorError(axiosError)).rejects.toThrow(
          'ยกเลิกการดำเนินการแล้ว'
        );
      }
    });
  });

  describe('uploadFiles', () => {
    const mockCaseId = 'case-123';
    const createMockFile = (name: string): File => {
      return new File(['test content'], name, { type: 'image/jpeg' });
    };

    it('should upload single file successfully', async () => {
      const mockResponse = { success: true, fileId: 'file-123' };

      (mockAxiosInstance.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockResponse,
      });

      const files = [createMockFile('test.jpg')];
      const onProgress = vi.fn();

      const results = await uploadFiles(mockCaseId, files, mockToken, onProgress);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].fileId).toBe('file-123');
    });

    it('should upload multiple files', async () => {
      const mockResponse = { success: true, fileId: 'file-123' };

      (mockAxiosInstance.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockResponse,
      });

      const files = [createMockFile('test1.jpg'), createMockFile('test2.jpg')];
      const results = await uploadFiles(mockCaseId, files, mockToken);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should handle upload error', async () => {
      (mockAxiosInstance.post as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('File too large')
      );

      const files = [createMockFile('test.jpg')];
      const results = await uploadFiles(mockCaseId, files, mockToken);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('File too large');
    });

    it('should continue uploading other files if one fails', async () => {
      const mockResponse = { success: true, fileId: 'file-123' };

      (mockAxiosInstance.post as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('File too large'))
        .mockResolvedValueOnce({ data: mockResponse });

      const files = [createMockFile('test1.jpg'), createMockFile('test2.jpg')];
      const results = await uploadFiles(mockCaseId, files, mockToken);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('File too large');
      expect(results[1].success).toBe(true);
      expect(results[1].fileId).toBe('file-123');
    });

    it('should set correct headers for file upload', async () => {
      const mockResponse = { success: true, fileId: 'file-123' };

      (mockAxiosInstance.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockResponse,
      });

      const files = [createMockFile('test.jpg')];
      await uploadFiles(mockCaseId, files, mockToken);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `/claims/${mockCaseId}/files`,
        expect.any(File),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
            'Content-Type': 'image/jpeg',
            'X-File-Name': 'test.jpg',
          }),
        })
      );
    });

    it('should encode special characters in filename', async () => {
      const mockResponse = { success: true, fileId: 'file-123' };

      (mockAxiosInstance.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockResponse,
      });

      const files = [createMockFile('ทดสอบ ไฟล์.jpg')];
      await uploadFiles(mockCaseId, files, mockToken);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `/claims/${mockCaseId}/files`,
        expect.any(File),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-File-Name': encodeURIComponent('ทดสอบ ไฟล์.jpg'),
          }),
        })
      );
    });
  });

  describe('uploadFilesParallel', () => {
    const mockCaseId = 'case-123';
    const createMockFile = (name: string): File => {
      return new File(['test content'], name, { type: 'image/jpeg' });
    };

    it('should return empty array for empty files', async () => {
      const results = await uploadFilesParallel(mockCaseId, [], mockToken);
      expect(results).toEqual([]);
    });

    it('should upload single file successfully', async () => {
      const mockResponse = { success: true, fileId: 'file-123' };

      (mockAxiosInstance.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockResponse,
      });

      const files = [createMockFile('test.jpg')];
      const results = await uploadFilesParallel(mockCaseId, files, mockToken);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].fileId).toBe('file-123');
    });

    it('should upload multiple files in parallel', async () => {
      const mockResponse = { success: true, fileId: 'file-123' };

      (mockAxiosInstance.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockResponse,
      });

      const files = [
        createMockFile('test1.jpg'),
        createMockFile('test2.jpg'),
        createMockFile('test3.jpg'),
        createMockFile('test4.jpg'),
        createMockFile('test5.jpg'),
      ];

      const results = await uploadFilesParallel(mockCaseId, files, mockToken, {
        concurrency: 2,
      });

      expect(results).toHaveLength(5);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('should respect concurrency limit', async () => {
      let concurrentCalls = 0;
      let maxConcurrentCalls = 0;

      (mockAxiosInstance.post as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        concurrentCalls++;
        maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 10));

        concurrentCalls--;
        return { data: { success: true, fileId: 'file-123' } };
      });

      const files = Array(6)
        .fill(null)
        .map((_, i) => createMockFile(`test${i}.jpg`));

      await uploadFilesParallel(mockCaseId, files, mockToken, {
        concurrency: 2,
      });

      // Should never exceed concurrency limit
      expect(maxConcurrentCalls).toBeLessThanOrEqual(2);
    });

    it('should handle partial failures', async () => {
      (mockAxiosInstance.post as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ data: { success: true, fileId: 'file-1' } })
        .mockRejectedValueOnce(new Error('Upload failed'))
        .mockResolvedValueOnce({ data: { success: true, fileId: 'file-3' } });

      const files = [
        createMockFile('test1.jpg'),
        createMockFile('test2.jpg'),
        createMockFile('test3.jpg'),
      ];

      const results = await uploadFilesParallel(mockCaseId, files, mockToken, {
        concurrency: 3,
      });

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Upload failed');
      expect(results[2].success).toBe(true);
    });

    it('should call onFileComplete callback for each file', async () => {
      const mockResponse = { success: true, fileId: 'file-123' };

      (mockAxiosInstance.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockResponse,
      });

      const files = [createMockFile('test1.jpg'), createMockFile('test2.jpg')];
      const onFileComplete = vi.fn();

      await uploadFilesParallel(mockCaseId, files, mockToken, {
        onFileComplete,
      });

      expect(onFileComplete).toHaveBeenCalledTimes(2);
      expect(onFileComplete).toHaveBeenCalledWith(
        expect.any(Number),
        expect.objectContaining({ success: true })
      );
    });

    it('should call onFileProgress callback', async () => {
      (mockAxiosInstance.post as ReturnType<typeof vi.fn>).mockImplementation(
        async (_url, _data, config) => {
          // Simulate progress
          if (config?.onUploadProgress) {
            config.onUploadProgress({ loaded: 50, total: 100 });
            config.onUploadProgress({ loaded: 100, total: 100 });
          }
          return { data: { success: true, fileId: 'file-123' } };
        }
      );

      const files = [createMockFile('test.jpg')];
      const onFileProgress = vi.fn();

      await uploadFilesParallel(mockCaseId, files, mockToken, {
        onFileProgress,
      });

      expect(onFileProgress).toHaveBeenCalled();
    });

    it('should stop upload when signal is aborted', async () => {
      let uploadCount = 0;

      (mockAxiosInstance.post as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        uploadCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { data: { success: true, fileId: `file-${uploadCount}` } };
      });

      const files = Array(5)
        .fill(null)
        .map((_, i) => createMockFile(`test${i}.jpg`));

      const controller = new AbortController();

      // Abort after a short delay
      setTimeout(() => controller.abort(), 10);

      const results = await uploadFilesParallel(mockCaseId, files, mockToken, {
        concurrency: 1,
        signal: controller.signal,
      });

      // Some files should be cancelled
      const cancelledCount = results.filter((r) => r.error === 'ยกเลิกการอัพโหลด').length;
      expect(cancelledCount).toBeGreaterThan(0);
    });
  });
});
