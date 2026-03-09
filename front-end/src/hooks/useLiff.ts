/**
 * useLiff hook - LIFF SDK integration
 * ลอกจาก LIFF_Form.page — init LIFF + closeWindow
 * ไม่ใช้ token verify (backend ใช้วิธีอื่น)
 */

import { useState, useEffect, useCallback } from 'react';
// Use CDN liff global (loaded as blocking script in index.html).
// Type-only import keeps TypeScript happy without bundling the npm package.
import type liffModule from '@line/liff';
const liff = (window as unknown as { liff: typeof liffModule }).liff;

const LIFF_ID = import.meta.env.VITE_LIFF_ID || '';

interface LiffState {
  isInitialized: boolean;
  isLoggedIn: boolean;
  isInClient: boolean;
  error: Error | null;
  profile: {
    userId: string;
    displayName: string;
    pictureUrl?: string;
  } | null;
}

interface UseLiffReturn extends LiffState {
  getAccessToken: () => string | null;
  closeWindow: () => void;
}

export function useLiff(): UseLiffReturn {
  // ถ้าไม่มี LIFF_ID → stub mode (initialized ทันที)
  const [state, setState] = useState<LiffState>({
    isInitialized: !LIFF_ID,
    isLoggedIn: false,
    isInClient: false,
    error: null,
    profile: null,
  });

  useEffect(() => {
    // ถ้าไม่มี LIFF_ID → stub mode ไม่ต้องทำอะไร
    if (!LIFF_ID) {
      return;
    }

    const REDIRECT_KEY = 'liff_post_login_hash';

    // ลอกจาก VF page
    liff
      .init({ liffId: LIFF_ID })
      .then(() => {
        const isLoggedIn = liff.isLoggedIn();
        const isInClient = liff.isInClient();

        // External browser + not logged in → save intended route, then redirect to LINE OAuth
        if (!isInClient && !isLoggedIn) {
          // liff.state query param holds the original hash (e.g. #/FRIARClaim)
          const liffStateParam = new URLSearchParams(window.location.search).get('liff.state');
          const intendedHash = liffStateParam
            ? decodeURIComponent(liffStateParam)
            : window.location.hash;
          if (intendedHash) {
            sessionStorage.setItem(REDIRECT_KEY, intendedHash);
          }
          liff.login();
          return null;
        }

        // After OAuth return: restore the intended route before React Router renders
        if (isLoggedIn) {
          const savedHash = sessionStorage.getItem(REDIRECT_KEY);
          if (savedHash) {
            sessionStorage.removeItem(REDIRECT_KEY);
            window.location.hash = savedHash.startsWith('#') ? savedHash.slice(1) : savedHash;
          }
        }

        setState((prev) => ({
          ...prev,
          isInitialized: true,
          isLoggedIn,
          isInClient,
        }));

        // ดึง profile ถ้า logged in (เหมือน VF)
        if (isLoggedIn) {
          return liff.getProfile();
        }
        return null;
      })
      .then((profile: Awaited<ReturnType<typeof liff.getProfile>> | null) => {
        if (profile) {
          setState((prev) => ({
            ...prev,
            profile: {
              userId: profile.userId,
              displayName: profile.displayName,
              pictureUrl: profile.pictureUrl,
            },
          }));
        }
      })
      .catch((error: unknown) => {
        // เหมือน VF — catch แล้วไม่ทำอะไร (ให้ form ทำงานต่อได้)
        console.error('LIFF init error:', error);
        setState((prev) => ({
          ...prev,
          isInitialized: true,
          error: error instanceof Error ? error : new Error(String(error)),
        }));
      });
  }, []);

  const getAccessToken = useCallback((): string | null => {
    if (!LIFF_ID || !state.isInitialized) return null;
    try {
      // Call liff directly at submit time — avoids stale React state
      // liff.getAccessToken() returns null if not logged in
      return liff.getAccessToken();
    } catch {
      return null;
    }
  }, [state.isInitialized]);

  // ลอกจาก VF closeLiff()
  const closeWindow = useCallback(() => {
    if (state.isInitialized && liff.isInClient()) {
      liff.closeWindow();
    } else {
      window.close();
    }
  }, [state.isInitialized]);

  return {
    ...state,
    getAccessToken,
    closeWindow,
  };
}
