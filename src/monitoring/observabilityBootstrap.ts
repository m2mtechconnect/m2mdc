/**
 * Runtime monitoring bootstrap.
 *
 * The runtime-monitoring adapter is fail-closed and deliberately reads no
 * browser environment configuration itself. This module is the single approved
 * config resolver: it asks the governed backend (observability-config) whether
 * a real observability provider is configured server-side, and only then
 * activates the adapter with a relay URL. No provider keys are ever held in
 * the browser - delivery is relayed through the observability-capture edge
 * function, which injects the server-held credential.
 */
import type { AuraAnalyticsConfig } from '@/analytics/auraAnalytics';

const CONFIG_TIMEOUT_MS = 3_000;

interface ObservabilityConfigEnvelope {
  data?: {
    enabled?: boolean;
    provider?: string | null;
    captureFunction?: string;
  };
}

export async function resolveRuntimeMonitoringConfig(): Promise<AuraAnalyticsConfig> {
  if (typeof window === 'undefined') return {};
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  if (!base) return {};

  try {
    const response = await fetch(`${base}/functions/v1/observability-config`, {
      method: 'GET',
      signal: AbortSignal.timeout(CONFIG_TIMEOUT_MS),
    });
    if (!response.ok) return {};
    const body = (await response.json()) as ObservabilityConfigEnvelope;
    const config = body?.data;
    if (config?.enabled === true && config.provider === 'posthog') {
      const captureFunction = config.captureFunction ?? 'observability-capture';
      return {
        provider: 'posthog',
        relayUrl: `${base}/functions/v1/${captureFunction}`,
      };
    }
    return {};
  } catch {
    // Fail closed: no config evidence, no listeners, no delivery.
    return {};
  }
}
