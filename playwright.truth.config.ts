/**
 * Phase 1A.3.e — truth-in-UI Playwright configuration.
 *
 * Isolated from `playwright.config.ts` (which targets the legacy e2e
 * suite on port 5173). This config:
 *
 *  • Starts a DEDICATED Vite dev server on port 8091 with
 *    `VITE_OMNIVERSE_KIT_URL` set to a bogus in-app URL so the Kit
 *    client emits real fetches that our tests can intercept via
 *    `page.route()`. The URL never resolves to a real host — the
 *    network guard fails the test if it ever does.
 *  • Scopes tests to `tests/truth-in-ui/` only.
 *  • Runs a single chromium project (deterministic).
 *  • Zero retries and a small timeout — flaky tests are treated as
 *    real product failures, not something to paper over.
 */

import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.AURA_TRUTH_PORT ?? 8091);

export default defineConfig({
  testDir: './tests/truth-in-ui',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 20_000,
  expect: { timeout: 5_000 },
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/truth-in-ui.json' }],
  ],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'off',
    video: 'off',
    viewport: { width: 1280, height: 900 },
    // Any accidental network egress is caught by the network guard
    // fixture; the ignoreHTTPSErrors here just avoids TLS noise on
    // aborted external calls.
    ignoreHTTPSErrors: true,
  },
  projects: [{
    name: 'chromium',
    // Force the full Chromium build (not the headless_shell variant,
    // which is missing libglib on the CI image). Playwright ships both
    // under PLAYWRIGHT_BROWSERS_PATH; `channel: 'chromium'` selects the
    // full build.
    use: { ...devices['Desktop Chrome'], channel: 'chromium' },
  }],
  webServer: {
    // NOTE: this starts a SECOND Vite instance on port 8091. The
    // primary dev server on 8080 is untouched. The env below forces
    // the Kit client into "enabled" mode so tests can inject payloads
    // via `page.route('**/kit-api/**', …)`.
    command:
      'VITE_OMNIVERSE_KIT_URL=http://kit.aura-truth.local/api ' +
      `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});