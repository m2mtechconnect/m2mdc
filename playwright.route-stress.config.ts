import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.AURA_STRESS_PORT ?? 8093);
const TIMEOUT = Number(process.env.AURA_STRESS_TIMEOUT ?? 2_400_000);

export default defineConfig({
  testDir: './tests/route-stress',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  // Keep a hard Playwright circuit breaker below the GitHub job timeout.
  // The default 40-minute ceiling still allows the full 30 cold + 50 warm sweep.
  timeout: TIMEOUT,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    viewport: { width: 1280, height: 900 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chromium' } }],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
