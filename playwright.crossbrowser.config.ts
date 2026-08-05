/**
 * Cross-browser card-activation / drawer-routing regression config.
 *
 * Runs the DSX card destination audit on Chromium, Firefox and WebKit in
 * both desktop and mobile emulation, against a dedicated Vite server on
 * port 8093 so it never collides with the primary dev server (8080) or the
 * truth-in-UI configs (8091/8092).
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.AURA_XB_PORT ?? 8093);

export default defineConfig({
  testDir: './tests/truth-in-ui',
  testMatch: 'dsx-card-destinations.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 900_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['json', { outputFile: 'test-results/dsx-card-destinations-crossbrowser.json' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'off',
    video: 'off',
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], channel: 'chromium', viewport: { width: 1280, height: 900 } } },
    { name: 'desktop-firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 900 } } },
    { name: 'desktop-webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 900 } } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] } },
    { name: 'mobile-firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 390, height: 844 }, isMobile: false, hasTouch: false } },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
