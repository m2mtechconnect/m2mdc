import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(
  path.resolve(process.cwd(), 'src/monitoring/runtimeMonitoring.ts'),
  'utf8',
);
const mainSource = fs.readFileSync(path.resolve(process.cwd(), 'src/main.tsx'), 'utf8');

describe('runtime monitoring contract', () => {
  it('supports uncaught browser failures and unhandled rejections when explicitly configured', () => {
    expect(source).toContain("window.addEventListener('error', onError)");
    expect(source).toContain("window.addEventListener('unhandledrejection', onUnhandledRejection)");
    expect(source).toContain("'runtime.client_error'");
    expect(source).toContain("'runtime.unhandled_rejection'");
    expect(mainSource).toContain('startRuntimeMonitoring()');
  });

  it('is fail-closed and does not read ambient browser environment configuration', () => {
    expect(source).toContain('startRuntimeMonitoring(config: AuraAnalyticsConfig = {})');
    expect(source).toContain("if (config.provider !== 'posthog') return () => {}");
    expect(source).not.toContain('import.meta.env');
    expect(source).not.toContain('VITE_AURA_ANALYTICS_PROVIDER');
    expect(source).not.toContain('VITE_POSTHOG_KEY');
    expect(source).not.toContain('VITE_POSTHOG_HOST');
    expect(source).not.toContain('POSTHOG_PERSONAL_API_KEY');
    expect(source).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('sends classification and immutable build metadata, never raw failure content', () => {
    for (const field of [
      'error_type',
      'route',
      'release_sha',
      'build_id',
      'app_version',
    ]) {
      expect(source).toContain(field);
    }

    expect(source).not.toContain('event.message');
    expect(source).not.toContain('event.filename');
    expect(source).not.toContain('error.stack');
    expect(source).not.toContain('location.search');
    expect(source).not.toContain('location.href');
    expect(source).not.toContain('userId');
    expect(source).not.toContain('email');
  });

  it('deduplicates repeated failures and bounds route metadata', () => {
    expect(source).toContain('MAX_DEDUPE_KEYS');
    expect(source).toContain('seen.has(dedupeKey)');
    expect(source).toContain('path.slice(0, 160)');
  });
});
