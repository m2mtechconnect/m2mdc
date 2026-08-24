export type AuraWorkflowProvider = 'disabled' | 'inngest';
export type AuraWorkflowStatus = 'disabled' | 'not_configured' | 'queued' | 'failed';
export type AuraWorkflowPrimitive = string | number | boolean | null;

export type AuraWorkflowEventName =
  | 'aura/onboarding.organization.provisioned'
  | 'aura/onboarding.invite.created';

export interface AuraWorkflowEvent {
  name: AuraWorkflowEventName;
  organizationId: string;
  data?: Record<string, AuraWorkflowPrimitive>;
}

export interface AuraWorkflowResult {
  provider: AuraWorkflowProvider;
  status: AuraWorkflowStatus;
  eventId: string | null;
  error: string | null;
}

const SENSITIVE_KEY_PATTERN = /(token|secret|password|authorization|credential|cookie|content|document|body|email|phone|address|api[_-]?key)/i;
const RESERVED_KEYS = new Set(['organization_id']);

function provider(): AuraWorkflowProvider {
  const raw = (Deno.env.get('AURA_WORKFLOW_PROVIDER') ?? 'disabled').trim().toLowerCase();
  return raw === 'inngest' ? 'inngest' : 'disabled';
}

function inngestEndpoint(): string | null {
  const raw = (Deno.env.get('AURA_INNGEST_ENDPOINT') ?? 'https://inn.gs/e').trim();
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') return null;
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

export function sanitizeWorkflowData(
  data: Record<string, AuraWorkflowPrimitive> | undefined,
): Record<string, AuraWorkflowPrimitive> {
  if (!data) return {};
  return Object.fromEntries(
    Object.entries(data).filter(([key, value]) => {
      if (RESERVED_KEYS.has(key) || SENSITIVE_KEY_PATTERN.test(key)) return false;
      return value === null || ['string', 'number', 'boolean'].includes(typeof value);
    }),
  ) as Record<string, AuraWorkflowPrimitive>;
}

export async function enqueueAuraWorkflow(event: AuraWorkflowEvent): Promise<AuraWorkflowResult> {
  const selected = provider();
  if (selected === 'disabled') {
    return { provider: selected, status: 'disabled', eventId: null, error: null };
  }

  const eventKey = (Deno.env.get('INNGEST_EVENT_KEY') ?? '').trim();
  const endpoint = inngestEndpoint();
  if (!eventKey || !endpoint || !event.organizationId.trim()) {
    return {
      provider: selected,
      status: 'not_configured',
      eventId: null,
      error: 'Workflow provider is not completely configured',
    };
  }

  const payload = {
    name: event.name,
    data: {
      ...sanitizeWorkflowData(event.data),
      organization_id: event.organizationId,
    },
  };

  try {
    const response = await fetch(`${endpoint}/${encodeURIComponent(eventKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return {
        provider: selected,
        status: 'failed',
        eventId: null,
        error: `Workflow provider request failed (HTTP ${response.status})`,
      };
    }

    const responseBody = await response.json().catch(() => ({}));
    const ids = Array.isArray(responseBody?.ids) ? responseBody.ids : [];
    return {
      provider: selected,
      status: 'queued',
      eventId: typeof ids[0] === 'string' ? ids[0] : null,
      error: null,
    };
  } catch {
    return {
      provider: selected,
      status: 'failed',
      eventId: null,
      error: 'Workflow provider request failed',
    };
  }
}
