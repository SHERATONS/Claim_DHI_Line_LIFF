import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock LIFF SDK
vi.mock('@line/liff', () => ({
  default: {
    init: vi.fn().mockResolvedValue(undefined),
    isLoggedIn: vi.fn().mockReturnValue(true),
    getAccessToken: vi.fn().mockReturnValue('mock-access-token'),
    getProfile: vi.fn().mockResolvedValue({
      userId: 'U1234567890',
      displayName: 'Test User',
      pictureUrl: 'https://example.com/avatar.jpg',
    }),
    isInClient: vi.fn().mockReturnValue(true),
    closeWindow: vi.fn(),
  },
}));

// Mock environment variables
vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
vi.stubEnv('VITE_API_URL', 'http://localhost:3001/api');

// Mock fetch globally
global.fetch = vi.fn();

// Mock URL.createObjectURL for file previews
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();
