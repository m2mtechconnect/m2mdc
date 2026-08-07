import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    // Vitest must not collect Playwright specs. Playwright owns
    // tests/e2e, tests/truth-in-ui, tests/visual, tests/builder and
    // tests/settings; collecting them here produced ~122 false failures.
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/unit/**/*.{test,spec}.{ts,tsx}',
      'tests/integration/**/*.{test,spec}.{ts,tsx}',
      'tests/performance/**/*.test.{ts,tsx}',
      'tests/*.test.{ts,tsx}',
      'scripts/**/*.test.ts',
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'tests/e2e/**',
      'tests/truth-in-ui/**',
      'tests/visual/**',
      'tests/builder/**',
      'tests/settings/**',
      'tests/_harness/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'src/integrations/supabase/types.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
