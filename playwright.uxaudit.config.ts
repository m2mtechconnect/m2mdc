import { defineConfig, devices } from '@playwright/test';
const PORT = Number(process.env.AURA_UX_PORT ?? 8094);
export default defineConfig({
  testDir: './tests/audit',
  fullyParallel: false,
  workers: 1,
  timeout: 900_000,
  reporter: [['line']],
  use: { baseURL: `http://localhost:${PORT}`, trace: 'off', screenshot: 'off', video: 'off' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chromium' } }],
  // Tagger off for automated runs (see scripts/componentTaggerPolicy.ts).
  webServer: { command: `npx vite --port ${PORT} --strictPort`, env: { AURA_DISABLE_COMPONENT_TAGGER: '1' }, url: `http://localhost:${PORT}`, reuseExistingServer: true, timeout: 120_000 },
});
