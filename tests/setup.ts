import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { installLiveBackendGuard } from './_setup/liveBackendGuard';

// Fail closed: block every Supabase network call unless the disposable
// test project (aura-dc-security-test) is proven. Installed at module load,
// before any test file imports the Supabase client.
installLiveBackendGuard();

// Mock environment variables
beforeAll(() => {
  process.env.VITE_SUPABASE_URL = 'http://localhost:54321';
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'test-key';
  process.env.USE_MOCK_LLM = 'true';
});

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
