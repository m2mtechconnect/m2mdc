export type AuraAnalyticsProvider = 'disabled' | 'posthog';
export type AuraAnalyticsPrimitive = string | number | boolean | null;
export type AuraAnalyticsEventName =
  | 'tenant.organization_switched'
  | 'platform.customer_provisioned'
  | 'onboarding.invite_created'
  | 'onboarding.invite_delivery';

export interface AuraAnalyticsEvent {
  organizationId: string;
  properties?: Record<string, AuraAnalyticsPrimitive>;
}

export interface AuraAnalyticsConfig {
  provider?: AuraAnalyticsProvider;
  posthogKey?: string;
  posthogHost?: string;
}

export interface AuraAnalyticsResult {
  provider: AuraAnalyticsProvider;
  status: 'disabled' | 'not_configured' | 'queued' | 'failed';
}

const SENSITIVE_KEY_PATTERN = /(token|secret|password|authorization|credential|cookie|content|document|body|email|phone|address|api[_-]?key)/i;
const RESERVED_PROPERTY_KEYS = new Set(['organization_id', 'distinct_id']);
const SESSION_KEY = 'aura_analytics_distinct_id';
const ANALYTICS_TIMEOUT_MS = 5_000;

function configuredProvider(config: AuraAnalyticsConfig): AuraAnalyticsProvider {
  return config.provider === 'posthog' ? 'posthog' : 'disabled';
}

function posthogHost(config: AuraAnalyticsConfig): string | null {
  const raw = (config.posthogHost ?? 'https://us.i.posthog.com').trim();
  try {
    const url = new URL(raw);
    const allowed = url.protocol === 'https:'
      || (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1'));
    if (!allowed) return null;
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

export function sanitizeAnalyticsProperties(
  properties: Record<string, AuraAnalyticsPrimitive> | undefined,
): Record<string, AuraAnalyticsPrimitive> {
  if (!properties) return {};
  return Object.fromEntries(
    Object.entries(properties).filter(([key, value]) => {
      if (RESERVED_PROPERTY_KEYS.has(key)) return false;
      if (SENSITIVE_KEY_PATTERN.test(key)) return false;
      return value === null || ['string', 'number', 'boolean'].includes(typeof value);
    }),
  ) as Record<string, AuraAnalyticsPrimitive>;
}

function analyticsDistinctId(): string {
  if (typeof window === 'undefined') return 'aura-server-render';
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/**
 * Analytics is disabled unless the caller supplies an explicit public runtime
 * configuration. This avoids hidden build-time browser environment dependencies
 * and keeps private/white-label packaging provider-neutral.
 */
export async function captureAuraEvent(
  event: AuraAnalyticsEventName,
  context: AuraAnalyticsEvent,
  config: AuraAnalyticsConfig = {},
): Promise<AuraAnalyticsResult> {
  const provider = configuredProvider(config);
  if (provider === 'disabled') return { provider, status: 'disabled' };

  const apiKey = (config.posthogKey ?? '').trim();
  const host = posthogHost(config);
  if (!apiKey || !host || !context.organizationId.trim()) {
    return { provider, status: 'not_configured' };
  }

  const payload = {
    api_key: apiKey,
    event,
    properties: {
      ...sanitizeAnalyticsProperties(context.properties),
      distinct_id: analyticsDistinctId(),
      organization_id: context.organizationId,
    },
  };

  try {
    const response = await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
      signal: AbortSignal.timeout(ANALYTICS_TIMEOUT_MS),
    });
    return { provider, status: response.ok ? 'queued' : 'failed' };
  } catch {
    return { provider, status: 'failed' };
  }
}
