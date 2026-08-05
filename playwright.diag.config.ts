import { defineConfig, devices } from '@playwright/test';
const PORT = Number(process.env.AURA_XB_PORT ?? 8093);
export default defineConfig({
  testDir: './tests/truth-in-ui/_diag',
  fullyParallel: false, retries: 0, workers: 1, timeout: 180_000,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, trace: 'off', screenshot: 'off', video: 'off' },
  projects: [{ name: 'desktop-webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 900 } } }],
  webServer: { command: `npx vite --port ${PORT} --strictPort`, url: `http://localhost:${PORT}`, reuseExistingServer: true, timeout: 120_000 },
});
