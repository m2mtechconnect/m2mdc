import {
  captureAuraEvent,
  type AuraAnalyticsConfig,
  type AuraAnalyticsEventName,
} from '@/analytics/auraAnalytics';
import { getBuildFingerprint } from '@/lib/buildFingerprint';

const MAX_DEDUPE_KEYS = 100;

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
 * Installs privacy-safe global browser diagnostics only when an approved caller
 * supplies an explicit analytics configuration.
 *
 * The module deliberately does not read browser environment variables. That
 * keeps production telemetry behind the same explicit configuration boundary as
 * the analytics adapter and preserves the production-perimeter allowlist.
 *
 * Raw error messages, stack traces, URLs with query strings, user ids, emails,
 * tokens, request bodies and tenant identifiers are deliberately not captured.
 */
export function startRuntimeMonitoring(config: AuraAnalyticsConfig = {}): () => void {
  if (typeof window === 'undefined') return () => {};
  if (config.provider !== 'posthog') return () => {};

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
