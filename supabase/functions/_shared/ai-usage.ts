import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveCallerTenant } from './connectionTenant.ts';
import {
  classifyReservationFailure,
  normalizeTokenUsage,
  publicProviderClass,
  type AiUsageOperation,
  type AiUsageStatus,
} from './ai-usage-policy.ts';

export class AiUsageControlError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 500,
  ) {
    super(message);
    this.name = 'AiUsageControlError';
  }
}

export interface AiUsageReservation {
  eventId: string;
  userId: string;
  tenantId: string | null;
  agentId: string | null;
  operation: AiUsageOperation;
  correlationId: string;
  benchmarkMode: boolean;
}

function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRole) {
    throw new AiUsageControlError(
      'AI_USAGE_CONTROL_UNAVAILABLE',
      'AURA durable AI usage controls are not configured on the server.',
      503,
    );
  }
  return createClient(url, serviceRole);
}

async function recordQuotaBlocked(
  admin: ReturnType<typeof serviceClient>,
  fields: {
    correlationId: string;
    userId: string;
    tenantId: string | null;
    agentId: string | null;
    operation: AiUsageOperation;
    errorCode: string;
    benchmarkMode: boolean;
  },
) {
  // Quota-blocked events are diagnostic evidence. Failure to record this
  // secondary event never converts a denied request into an allowed request.
  await admin.from('ai_usage_events').insert({
    correlation_id: fields.correlationId,
    user_id: fields.userId,
    tenant_id: fields.tenantId,
    agent_id: fields.agentId,
    operation: fields.operation,
    provider_class: 'unknown',
    status: 'quota-blocked',
    benchmark_mode: fields.benchmarkMode,
    error_code: fields.errorCode,
    completed_at: new Date().toISOString(),
  }).catch(() => undefined);
}

/**
 * Atomically reserve durable AI request capacity and create the usage ledger
 * event before any paid provider call is made.
 */
export async function reserveAiRequest(input: {
  userId: string;
  correlationId: string;
  operation: AiUsageOperation;
  agentId?: string | null;
  benchmarkMode?: boolean;
}): Promise<AiUsageReservation> {
  const admin = serviceClient();
  const tenantId = await resolveCallerTenant(admin, input.userId);
  const benchmarkMode = input.benchmarkMode === true;

  const { error: reservationError } = await admin.rpc('reserve_ai_request', {
    _user_id: input.userId,
    _tenant_id: tenantId,
    _operation: input.operation,
  });

  if (reservationError) {
    const classified = classifyReservationFailure(String(reservationError.message ?? reservationError));
    await recordQuotaBlocked(admin, {
      correlationId: input.correlationId,
      userId: input.userId,
      tenantId,
      agentId: input.agentId ?? null,
      operation: input.operation,
      errorCode: classified.code,
      benchmarkMode,
    });
    throw new AiUsageControlError(classified.code, classified.message, classified.status);
  }

  const { data: event, error: ledgerError } = await admin
    .from('ai_usage_events')
    .insert({
      correlation_id: input.correlationId,
      user_id: input.userId,
      tenant_id: tenantId,
      agent_id: input.agentId ?? null,
      operation: input.operation,
      provider_class: 'unknown',
      status: 'reserved',
      benchmark_mode: benchmarkMode,
    })
    .select('id')
    .single();

  if (ledgerError || !event?.id) {
    throw new AiUsageControlError(
      'AI_USAGE_LEDGER_WRITE_FAILED',
      'AURA could not create the durable AI usage ledger entry.',
      503,
    );
  }

  return {
    eventId: String(event.id),
    userId: input.userId,
    tenantId,
    agentId: input.agentId ?? null,
    operation: input.operation,
    correlationId: input.correlationId,
    benchmarkMode,
  };
}

/** Finalize a pre-reserved usage event with truthful provider/token evidence. */
export async function finalizeAiUsage(
  reservation: AiUsageReservation,
  result: {
    status: Exclude<AiUsageStatus, 'quota-blocked'>;
    provider?: string | null;
    model?: string | null;
    modelProfile?: 'fast' | 'reasoning' | 'supervisor' | null;
    usage?: unknown;
    latencyMs?: number | null;
    errorCode?: string | null;
    estimatedCostUsd?: number | null;
  },
): Promise<void> {
  const admin = serviceClient();
  const normalized = normalizeTokenUsage(result.usage);
  const cost = typeof result.estimatedCostUsd === 'number' && Number.isFinite(result.estimatedCostUsd) && result.estimatedCostUsd >= 0
    ? result.estimatedCostUsd
    : null;

  const { error } = await admin
    .from('ai_usage_events')
    .update({
      provider_class: publicProviderClass(result.provider),
      model_profile: result.modelProfile ?? null,
      model_id: result.model ?? null,
      status: result.status,
      input_tokens: normalized.inputTokens,
      output_tokens: normalized.outputTokens,
      total_tokens: normalized.totalTokens,
      latency_ms: typeof result.latencyMs === 'number' && result.latencyMs >= 0 ? Math.floor(result.latencyMs) : null,
      estimated_cost_usd: cost,
      provider_usage: normalized.raw,
      error_code: result.errorCode ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', reservation.eventId);

  if (error) {
    throw new AiUsageControlError(
      'AI_USAGE_LEDGER_FINALIZE_FAILED',
      'AURA could not finalize the durable AI usage ledger entry.',
      503,
    );
  }
}
