import { defineConfig, devices } from '@playwright/test';

const PLAYWRIGHT_BASE_URL = process.env.PLAYWRIGHT_BASE_URL?.trim();
const CAPTURE_CURRENT_HEAD = process.env.AURA_CAPTURE_CURRENT_HEAD === '1';

export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  // Approved comparison is fail-closed. Snapshot mutation is enabled only for
  // the explicit ephemeral human-review capture step and is never committed.
  updateSnapshots: CAPTURE_CURRENT_HEAD ? 'all' : 'none',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: PLAYWRIGHT_BASE_URL || 'http://localhost:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    reducedMotion: 'reduce',
    viewport: { width: 1440, height: 900 },
  },
  projects: [{
    name: 'chromium',
    use: { ...devices['Desktop Chrome'], reducedMotion: 'reduce' },
  }],
  webServer: PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'bun run dev',
        url: 'http://localhost:8080',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
