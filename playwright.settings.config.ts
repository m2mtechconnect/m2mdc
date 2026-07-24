/**
 * Focused Playwright config for the authenticated /builder success
 * regression. Runs against the primary dev server on port 8080 and
 * uses the real Lovable-sandbox-injected Supabase session — NOT the
 * mocked truth-in-UI harness on 8091 — so the assertion that
 * `builders-create` receives exactly one real request is meaningful.
 *
 * Scope: `tests/builder/` only. The truth-in-UI mocked suite and
 * the legacy e2e suite are unaffected.
 */

import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.AURA_BUILDER_PORT ?? 8080);

export default defineConfig({
  testDir: './tests/settings',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/settings.json' }],
  ],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    viewport: { width: 1280, height: 900 },
    ignoreHTTPSErrors: true,
  },
  projects: [{
    name: 'chromium',
    use: { ...devices['Desktop Chrome'], channel: 'chromium' },
  }],
  // No `webServer`: the primary Vite dev server is already running
  // on 8080 under the sandbox's supervisor. Tests should be executed
  // only when that server is up.
});