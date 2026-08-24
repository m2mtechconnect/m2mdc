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

export interface AuraAnalyticsResult {
  provider: AuraAnalyticsProvider;
  status: 'disabled' | 'not_configured' | 'queued' | 'failed';
}

const SENSITIVE_KEY_PATTERN = /(token|secret|password|authorization|credential|cookie|content|document|body|email|phone|address|api[_-]?key)/i;
const SESSION_KEY = 'aura_analytics_distinct_id';

function configuredProvider(): AuraAnalyticsProvider {
  const raw = (import.meta.env.VITE_AURA_ANALYTICS_PROVIDER ?? 'disabled').trim().toLowerCase();
  return raw === 'posthog' ? 'posthog' : 'disabled';
}

function posthogHost(): string | null {
  const raw = (import.meta.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com').trim();
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') return null;
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

export async function captureAuraEvent(
  event: AuraAnalyticsEventName,
  context: AuraAnalyticsEvent,
): Promise<AuraAnalyticsResult> {
  const provider = configuredProvider();
  if (provider === 'disabled') return { provider, status: 'disabled' };

  const apiKey = (import.meta.env.VITE_POSTHOG_KEY ?? '').trim();
  const host = posthogHost();
  if (!apiKey || !host || !context.organizationId.trim()) {
    return { provider, status: 'not_configured' };
  }

  const payload = {
    api_key: apiKey,
    event,
    properties: {
      distinct_id: analyticsDistinctId(),
      organization_id: context.organizationId,
      ...sanitizeAnalyticsProperties(context.properties),
    },
  };

  try {
    const response = await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    return { provider, status: response.ok ? 'queued' : 'failed' };
  } catch {
    return { provider, status: 'failed' };
  }
}
