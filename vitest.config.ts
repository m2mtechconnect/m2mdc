import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { nodeScriptShebangPlugin } from './scripts/vitestScriptShebang';

const configDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [nodeScriptShebangPlugin(), react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    // The Windows workspace reuses pnpm junctions from the prepared dependency
    // runtime. Externalizing Zod through that junction drops its named `z`
    // export under Vitest even though Node and Bun resolve it correctly.
    // Transform it through Vite so test collection sees the same ESM contract
    // as the application build.
    server: {
      deps: {
        inline: ['zod'],
      },
    },
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
      '@': path.resolve(configDir, './src'),
    },
  },
});
