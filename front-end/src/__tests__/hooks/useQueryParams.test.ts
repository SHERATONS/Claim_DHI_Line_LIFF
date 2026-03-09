import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useQueryParams } from '@/hooks/useQueryParams';

describe('useQueryParams', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Mock window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, search: '' },
    });
  });

  afterEach(() => {
    // Restore original location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
    vi.restoreAllMocks();
  });

  describe('direct params mode', () => {
    it('should return empty prefillData when no params', () => {
      window.location.search = '';

      const { result } = renderHook(() => useQueryParams());

      expect(result.current.prefillData).toEqual({});
      expect(result.current.token).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should parse policyNumber from URL', () => {
      window.location.search = '?policyNumber=POL-123';

      const { result } = renderHook(() => useQueryParams());

      expect(result.current.prefillData.policyNumber).toBe('POL-123');
    });

    it('should parse multiple params from URL', () => {
      window.location.search = '?policyNumber=POL-123&phone=0812345678&notifierName=John';

      const { result } = renderHook(() => useQueryParams());

      expect(result.current.prefillData).toEqual({
        policyNumber: 'POL-123',
        phone: '0812345678',
        notifierName: 'John',
      });
    });

    it('should decode URL-encoded values', () => {
      window.location.search = '?notifierName=%E0%B8%97%E0%B8%94%E0%B8%AA%E0%B8%AD%E0%B8%9A';

      const { result } = renderHook(() => useQueryParams());

      expect(result.current.prefillData.notifierName).toBe('ทดสอบ');
    });

    it('should sanitize values to prevent XSS', () => {
      window.location.search = '?policyNumber=<script>alert(1)</script>';

      const { result } = renderHook(() => useQueryParams());

      // Should sanitize but not contain script tags
      expect(result.current.prefillData.policyNumber).not.toContain('<script>');
    });

    it('should ignore unknown params', () => {
      window.location.search = '?policyNumber=POL-123&unknownParam=value&anotherUnknown=test';

      const { result } = renderHook(() => useQueryParams());

      expect(result.current.prefillData).toEqual({
        policyNumber: 'POL-123',
      });
      expect(result.current.prefillData).not.toHaveProperty('unknownParam');
    });

    it('should parse all allowed form params', () => {
      window.location.search =
        '?policyNumber=POL-123&policyHolder=John+Doe&idcard=1234567890123&notifierName=Jane&phone=0812345678&email=test@example.com';

      const { result } = renderHook(() => useQueryParams());

      expect(result.current.prefillData).toEqual({
        policyNumber: 'POL-123',
        policyHolder: 'John Doe',
        idcard: '1234567890123',
        notifierName: 'Jane',
        phone: '0812345678',
        email: 'test@example.com',
      });
    });
  });

  describe('token mode', () => {
    it('should extract token from URL', () => {
      window.location.search = '?token=abc123';

      const { result } = renderHook(() => useQueryParams());

      expect(result.current.token).toBe('abc123');
    });

    it('should call fetchPrefillData when token is present', async () => {
      window.location.search = '?token=abc123';

      const mockFetch = vi.fn().mockResolvedValue({
        policyNumber: 'POL-FROM-API',
        notifierName: 'API User',
      });

      const { result } = renderHook(() =>
        useQueryParams({ fetchPrefillData: mockFetch })
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith('abc123');
      expect(result.current.prefillData.policyNumber).toBe('POL-FROM-API');
      expect(result.current.prefillData.notifierName).toBe('API User');
    });

    it('should not call fetchPrefillData when token is absent', () => {
      window.location.search = '?policyNumber=POL-123';

      const mockFetch = vi.fn();

      renderHook(() => useQueryParams({ fetchPrefillData: mockFetch }));

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle fetch error', async () => {
      window.location.search = '?token=invalid';

      const mockFetch = vi.fn().mockRejectedValue(new Error('Token expired'));

      const { result } = renderHook(() =>
        useQueryParams({ fetchPrefillData: mockFetch })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Token expired');
      expect(result.current.prefillData).toEqual({});
    });

    it('should merge token data with direct params (token takes precedence)', async () => {
      // URL has both token and direct params
      window.location.search = '?token=abc&policyNumber=URL-POL&phone=0811111111';

      const mockFetch = vi.fn().mockResolvedValue({
        policyNumber: 'API-POL', // Should override URL param
        notifierName: 'API User', // New field from API
      });

      const { result } = renderHook(() =>
        useQueryParams({ fetchPrefillData: mockFetch })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.prefillData).toEqual({
        policyNumber: 'API-POL', // From API (overrides URL)
        phone: '0811111111', // From URL (not in API response)
        notifierName: 'API User', // From API
      });
    });
  });

  describe('rawParams', () => {
    it('should expose raw URLSearchParams', () => {
      window.location.search = '?policyNumber=POL-123&customParam=value';

      const { result } = renderHook(() => useQueryParams());

      expect(result.current.rawParams.get('policyNumber')).toBe('POL-123');
      expect(result.current.rawParams.get('customParam')).toBe('value');
    });
  });
});
