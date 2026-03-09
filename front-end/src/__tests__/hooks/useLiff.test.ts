import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useLiff } from '@/hooks/useLiff';

/**
 * useLiff hook tests
 * LIFF_ID ไม่ได้ set ใน test → stub mode (initialized ทันที)
 */

// Mock @line/liff module
vi.mock('@line/liff', () => ({
  default: {
    init: vi.fn().mockResolvedValue(undefined),
    isLoggedIn: vi.fn().mockReturnValue(false),
    isInClient: vi.fn().mockReturnValue(false),
    getProfile: vi.fn().mockResolvedValue({
      userId: 'test-user',
      displayName: 'Test User',
    }),
    closeWindow: vi.fn(),
  },
}));

describe('useLiff (no LIFF_ID - stub mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize to ready state when no LIFF_ID (stub mode)', async () => {
    const { result } = renderHook(() => useLiff());

    // รอ useEffect ทำงาน
    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.isInClient).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it('should return null from getAccessToken', async () => {
    const { result } = renderHook(() => useLiff());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    expect(result.current.getAccessToken()).toBeNull();
  });

  it('should call window.close on closeWindow when not in LINE client', async () => {
    const mockWindowClose = vi.fn();
    vi.stubGlobal('close', mockWindowClose);

    const { result } = renderHook(() => useLiff());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    act(() => {
      result.current.closeWindow();
    });

    expect(mockWindowClose).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
