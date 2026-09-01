/**
 * Negative reproduction gate for the lovable-tagger ref-injection flood.
 *
 * This config deliberately starts a development-mode Vite server WITH the
 * component tagger ENABLED (no AURA_DISABLE_COMPONENT_TAGGER) so the spec in
 * tests/harness-negative/ can prove the React "Function components cannot be
 * given refs" warning flood is still OBSERVABLE through the console. That
 * keeps the truth suite's console-cleanliness assertions honest: if anyone
 * ever "fixes" the suite by filtering console output instead of correcting
 * the environment, this gate fails, because the flood would no longer be
 * observable under instrumentation either.
 *
 * Root cause evidence: head 0371589a, /tmp/aura-release-qual-0371589a-v2/
 * (74,044 warning entries in one DSX sweep; pageerror 0; production-mode
 * perf gate green on the same head).
 */

import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.AURA_TAGGER_REPRO_PORT ?? 8098);
const PLAYWRIGHT_EXECUTABLE_PATH = process.env.PLAYWRIGHT_EXECUTABLE_PATH?.trim();

export default defineConfig({
  testDir: './tests/harness-negative',
  testMatch: 'tagger-flood-reproduction.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/tagger-flood-reproduction.json' }],
  ],
  use: {
    baseURL: `http://localhost:${PORT}`,
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
  webServer: {
    // INTENTIONALLY no AURA_DISABLE_COMPONENT_TAGGER: this server must run
    // the tagger so the flood mechanism stays regression-covered.
    command:
      'VITE_SUPABASE_URL=http://127.0.0.1:54321 ' +
      'VITE_SUPABASE_PUBLISHABLE_KEY=safe-placeholder-anon-key ' +
      `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
