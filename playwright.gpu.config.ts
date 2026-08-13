/**
 * GPU matrix configuration for the twin-canvas mounting test.
 *
 * Two lanes, selected by `AURA_GPU_LANE`:
 *   • `software` — default CI runner (SwiftShader). Hardware canvas assertions
 *     are advisory; the 2D fallback is the accepted terminal state.
 *   • `gpu`      — runner with a real GPU. Chromium is launched with GPU
 *     compositing forced on and the run fails if the canvas never mounts.
 *
 * Results are written to a lane-specific JSON file consumed by
 * `scripts/report-gpu-matrix.mjs`, which separates genuine failures from
 * software-rendering limitations.
 */

import { defineConfig, devices } from '@playwright/test';

const LANE = (process.env.AURA_GPU_LANE ?? 'software') as 'software' | 'gpu';
const PORT = Number(process.env.AURA_TRUTH_PORT ?? (LANE === 'gpu' ? 8094 : 8093));
const PLAYWRIGHT_BASE_URL = process.env.PLAYWRIGHT_BASE_URL?.trim();

const GPU_ARGS = [
  '--use-gl=angle',
  '--use-angle=gl-egl',
  '--enable-gpu',
  '--enable-unsafe-webgpu',
  '--ignore-gpu-blocklist',
  '--enable-features=Vulkan,VaapiVideoDecoder',
];

const SOFTWARE_ARGS = ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'];

export default defineConfig({
  testDir: './tests/truth-in-ui',
  testMatch: /twin-canvas-mounting\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['json', { outputFile: `test-results/gpu-matrix-${LANE}.json` }],
  ],
  use: {
    baseURL: PLAYWRIGHT_BASE_URL || `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: `chromium-${LANE}`,
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
        reducedMotion: 'reduce',
        launchOptions: { args: LANE === 'gpu' ? GPU_ARGS : SOFTWARE_ARGS },
      },
    },
  ],
  webServer: PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npx vite --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
