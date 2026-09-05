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
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Phase 1B.2a.1 — parameterize this config so the same suite can be
// exercised against both the legacy default path and the facade-on path
// without duplicating the whole config. Toggle with:
//   AURA_TRUTH_FACADE=on npx playwright test --config=playwright.truth.config.ts
const FACADE_ON = process.env.AURA_TRUTH_FACADE === 'on';
const DEFAULT_PORT = FACADE_ON ? 8092 : 8091;
const PORT = Number(process.env.AURA_TRUTH_PORT ?? DEFAULT_PORT);
const PLAYWRIGHT_BASE_URL = process.env.PLAYWRIGHT_BASE_URL?.trim();
const PLAYWRIGHT_EXECUTABLE_PATH = process.env.PLAYWRIGHT_EXECUTABLE_PATH?.trim();
const REPO_ROOT = path.dirname(fileURLToPath(import.meta.url));
const VITE_BIN = path.join(
  REPO_ROOT,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'vite.cmd' : 'vite',
);
const TRUTH_SERVER_ENV = {
  VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'safe-placeholder-anon-key',
  VITE_OMNIVERSE_KIT_URL: 'http://kit.aura-truth.local/api',
  AURA_DISABLE_COMPONENT_TAGGER: '1',
  ...(FACADE_ON ? { VITE_AURA_SIM_FACADE_DCPANEL: 'on' } : {}),
};

export default defineConfig({
  testDir: './tests/truth-in-ui',
  // Wall-clock performance budgets are production budgets and must not be
  // measured against this unbundled dev server. They run in
  // `playwright.perf.config.ts` against `vite build` + `vite preview`.
  testIgnore: /authenticated-performance\.spec\.ts$/,
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
    baseURL: PLAYWRIGHT_BASE_URL || `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'off',
    video: 'off',
    viewport: { width: 1280, height: 900 },
    // Any accidental network egress is caught by the network guard
    // fixture; the ignoreHTTPSErrors here just avoids TLS noise on
    // aborted external calls.
    reducedMotion: 'reduce',
    ignoreHTTPSErrors: true,
  },
  projects: [{
    name: 'chromium',
    // Force the full Chromium build (not the headless_shell variant,
    // which is missing libglib on the CI image). Playwright ships both
    // under PLAYWRIGHT_BROWSERS_PATH; `channel: 'chromium'` selects the
    // full build.
    use: {
      ...devices['Desktop Chrome'],
      ...(PLAYWRIGHT_EXECUTABLE_PATH
        ? { launchOptions: { executablePath: PLAYWRIGHT_EXECUTABLE_PATH } }
        : { channel: 'chromium' as const }),
      reducedMotion: 'reduce',
    },
  }],
      webServer: PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        cwd: REPO_ROOT,
        // NOTE: this starts a SECOND Vite instance on port 8091. The
        // primary dev server on 8080 is untouched. The env below forces
        // the Kit client into "enabled" mode so tests can inject payloads
        // via `page.route('**/kit-api/**', …)`.
      command:
          // Dev-only lovable-tagger JSX instrumentation attaches refs to
          // function components and floods console.error with React's
          // forwardRef warning (once per JSX call site). This suite asserts
          // console cleanliness, so the tagger is off for the automated
          // server. Assertions are unchanged; this is environment policy,
          // not filtering (see scripts/componentTaggerPolicy.ts).
          `"${VITE_BIN}" --port ${PORT} --strictPort`,
        env: TRUTH_SERVER_ENV,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
