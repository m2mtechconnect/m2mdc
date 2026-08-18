import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.AURA_STRESS_PORT ?? 8093);

export default defineConfig({
  testDir: './tests/route-stress',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 600_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    viewport: { width: 1280, height: 900 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chromium' } }],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
