import { defineConfig, devices } from '@playwright/test';

const PLAYWRIGHT_BASE_URL = process.env.PLAYWRIGHT_BASE_URL?.trim();
const QA_AUTH_BOOTSTRAP = process.env.QA_AUTH_BOOTSTRAP === '1';
const QA_AUTH_STATE = process.env.QA_AUTH_STATE?.trim() || '/tmp/aura-playwright-auth.json';

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30000,
  globalSetup: QA_AUTH_BOOTSTRAP ? './tests/global-auth.setup.ts' : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],
  use: {
    baseURL: PLAYWRIGHT_BASE_URL || 'http://localhost:8080',
    storageState: QA_AUTH_BOOTSTRAP ? QA_AUTH_STATE : undefined,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'screenshots',
      testDir: './scripts',
      testMatch: 'captureMarketingScreenshots.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'bun run dev',
        url: 'http://localhost:8080',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});
