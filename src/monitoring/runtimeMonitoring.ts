import {
  captureAuraEvent,
  type AuraAnalyticsConfig,
  type AuraAnalyticsEventName,
} from '@/analytics/auraAnalytics';
import { getBuildFingerprint } from '@/lib/buildFingerprint';

const MAX_DEDUPE_KEYS = 100;

function runtimeAnalyticsConfig(): AuraAnalyticsConfig {
  return {
    provider: import.meta.env.VITE_AURA_ANALYTICS_PROVIDER === 'posthog' ? 'posthog' : 'disabled',
    posthogKey: import.meta.env.VITE_POSTHOG_KEY,
    posthogHost: import.meta.env.VITE_POSTHOG_HOST,
  };
}

function classifyError(value: unknown): string {
  if (value instanceof Error) return value.name || 'Error';
  if (value && typeof value === 'object') {
    const ctor = (value as { constructor?: { name?: string } }).constructor?.name;
    if (ctor) return ctor;
  }
  return typeof value;
}

function boundedRoute(): string {
  if (typeof window === 'undefined') return 'server';
  const path = window.location.pathname || '/';
  return path.length <= 160 ? path : path.slice(0, 160);
}

/**
 * Installs privacy-safe global browser diagnostics.
 *
 * Raw error messages, stack traces, URLs with query strings, user ids, emails,
 * tokens, request bodies and tenant identifiers are deliberately not captured.
 * Only error class, route pathname and immutable build metadata are sent, and
 * delivery remains disabled unless a public PostHog configuration is supplied.
 */
export function startRuntimeMonitoring(): () => void {
  if (typeof window === 'undefined') return () => {};

  const config = runtimeAnalyticsConfig();
  if (config.provider === 'disabled') return () => {};

  const build = getBuildFingerprint();
  const seen = new Set<string>();

  const report = (event: AuraAnalyticsEventName, source: string, value: unknown) => {
    const errorType = classifyError(value);
    const route = boundedRoute();
    const dedupeKey = `${event}:${source}:${errorType}:${route}`;
    if (seen.has(dedupeKey)) return;
    if (seen.size >= MAX_DEDUPE_KEYS) seen.clear();
    seen.add(dedupeKey);

    void captureAuraEvent(
      event,
      {
        properties: {
          source,
          error_type: errorType,
          route,
          release_sha: build.commitSha,
          build_id: build.buildId,
          app_version: build.appVersion,
        },
      },
      config,
    );
  };

  const onError = (event: ErrorEvent) => {
    report('runtime.client_error', 'window.error', event.error ?? 'unknown');
  };
  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    report('runtime.unhandled_rejection', 'window.unhandledrejection', event.reason);
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
  };
}
