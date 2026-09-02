import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { installLiveBackendGuard } from './_setup/liveBackendGuard';
import { primeSafeTestEnvironment } from './_setup/safeTestEnvironment';
import { installWindowScrollShim } from './_setup/browserApiShims';
import { installUnexpectedConsoleGuard } from './_setup/unexpectedConsoleGuard';

// Setup files execute before test modules are imported. Select and validate a
// loopback backend here so imported helpers cannot inherit application/cloud
// credentials from the developer shell or an .env file.
primeSafeTestEnvironment();

// Fail closed: block every Supabase network call unless the disposable
// test project (aura-dc-security-test) is proven. Installed at module load,
// before any test file imports the Supabase client.
installLiveBackendGuard();
installWindowScrollShim();
installUnexpectedConsoleGuard();

// Mock environment variables
beforeAll(() => {
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

// Mock browser-only media queries without making Node script suites depend on
// a JSDOM global.
if (typeof window !== 'undefined') {
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
}
