/**
 * Authenticated performance gate — PRODUCTION ARTIFACT ONLY.
 *
 * The budgets in `tests/truth-in-ui/authenticated-performance.spec.ts`
 * are production readiness budgets. `playwright.truth.config.ts` serves
 * the suite from an unbundled Vite DEV server, where the first request
 * to a lazily-imported route pays Vite's on-demand transform cost for
 * the whole module graph. Measuring a production budget against that
 * artifact is a false signal in both directions.
 *
 * This config runs the exact same spec, with the exact same budgets,
 * markers and assertions, against `vite build` + `vite preview` — the
 * artifact the budgets actually describe. Same safe loopback env as the
 * truth config: no live AURA or backend is ever contacted.
 */

import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.AURA_PERF_PORT ?? 8099);
const PLAYWRIGHT_BASE_URL = process.env.PLAYWRIGHT_BASE_URL?.trim();
const PLAYWRIGHT_EXECUTABLE_PATH = process.env.PLAYWRIGHT_EXECUTABLE_PATH?.trim();

export default defineConfig({
  testDir: './tests/truth-in-ui',
  testMatch: /authenticated-performance\.spec\.ts$/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  // Per-test budgets live in the spec (`test.setTimeout`); this is only
  // the outer safety net and is not a budget.
  timeout: 120_000,
  expect: { timeout: 5_000 },
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/authenticated-performance.json' }],
  ],
  use: {
    baseURL: PLAYWRIGHT_BASE_URL || `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'off',
    video: 'off',
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
    ignoreHTTPSErrors: true,
  },
  projects: [{
    name: 'chromium',
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
        command:
          'VITE_SUPABASE_URL=http://127.0.0.1:54321 ' +
          'VITE_SUPABASE_PUBLISHABLE_KEY=safe-placeholder-anon-key ' +
          'VITE_OMNIVERSE_KIT_URL=http://kit.aura-truth.local/api ' +
          `npx vite build && npx vite preview --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        // Covers a cold production build on a shared CI runner.
        timeout: 600_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
