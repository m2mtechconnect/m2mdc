/**
 * Stage 6F - deep-link alias/redirect harness configuration.
 *
 * Separate from `playwright.truth.config.ts` because each case performs a
 * full cold navigation plus a client-side redirect settle window, which
 * does not fit the truth suite's deliberately tight 20s budget.
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.AURA_DEEPLINK_PORT ?? 8097);

export default defineConfig({
  testDir: './tests/truth-in-ui',
  testMatch: /_debug-integrations.spec.ts/,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['json', { outputFile: 'test-results/deep-link-redirects.json' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'off',
    video: 'off',
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chromium' } }],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
