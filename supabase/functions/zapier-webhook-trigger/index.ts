/**
 * /v1/zapier-webhook-trigger  -  EXTERNAL_ENTRYPOINT
 *
 * Phase 11 security hardening:
 *  - fail-closed HMAC-SHA256 signature verification (no secret => 503)
 *  - timestamp tolerance + replay protection
 *  - POST only, bounded payload, per-isolate rate limit
 *  - structured JSON logs with a correlation id; signatures, headers and
 *    payload bodies are never logged
 *  - safe error envelope: reason code + correlation id only
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyWebhookRequest, webhookErrorResponse } from '../_shared/webhookSignature.ts';

const corsHeaders = {
  // External machine-to-machine entrypoint: no browser origin is trusted.
  'Access-Control-Allow-Origin': 'null',
  'Access-Control-Allow-Headers': 'content-type, x-zapier-signature, x-zapier-timestamp',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

function log(correlationId: string, event: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({
    service: 'zapier-webhook-trigger',
    correlation_id: correlationId,
    event,
    ts: new Date().toISOString(),
    ...extra,
  }));
}

serve(async (req) => {
  const correlationId = crypto.randomUUID();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const verification = await verifyWebhookRequest({
    req,
    secret: Deno.env.get('ZAPIER_WEBHOOK_SECRET'),
    rateLimitKey: 'zapier-webhook-trigger',
  });

  if (!verification.ok) {
    log(correlationId, 'rejected', { reason: verification.reason, status: verification.status });
    return webhookErrorResponse(verification, correlationId, corsHeaders);
  }

  try {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(verification.rawBody) as Record<string, unknown>;
    } catch {
      log(correlationId, 'rejected', { reason: 'invalid_json' });
      return new Response(
        JSON.stringify({ error: 'invalid_json', correlation_id: correlationId }),
        { status: 400, headers: jsonHeaders },
      );
    }

    const systemId = typeof payload.systemId === 'string' ? payload.systemId : null;
    const input = payload.input;
    const context = (payload.context ?? null) as { traceId?: string } | null;

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!systemId || !uuidRe.test(systemId) || input === undefined || input === null) {
      log(correlationId, 'rejected', { reason: 'validation_error' });
      return new Response(
        JSON.stringify({ error: 'validation_error', correlation_id: correlationId }),
        { status: 400, headers: jsonHeaders },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, owner_id')
      .eq('id', systemId)
      .maybeSingle();

    if (agentError || !agent) {
      log(correlationId, 'not_found', { system_id: systemId });
      return new Response(
        JSON.stringify({ error: 'not_found', correlation_id: correlationId }),
        { status: 404, headers: jsonHeaders },
      );
    }

    const { data: run, error: runError } = await supabase
      .from('agent_runs')
      .insert({
        agent_id: systemId,
        user_id: agent.owner_id,
        status: 'running',
        input: { ...(input as Record<string, unknown>), source: 'zapier', context },
      })
      .select('id')
      .single();

    if (runError || !run) {
      log(correlationId, 'persist_failed', { system_id: systemId });
      return new Response(
        JSON.stringify({ error: 'persist_failed', correlation_id: correlationId }),
        { status: 500, headers: jsonHeaders },
      );
    }

    const response = {
      message: `Agent ${agent.name} triggered successfully`,
      runId: run.id,
      status: 'queued',
    };

    await supabase
      .from('agent_runs')
      .update({ status: 'completed', output: response, completed_at: new Date().toISOString() })
      .eq('id', run.id);

    log(correlationId, 'accepted', { system_id: systemId, run_id: run.id, trace_id: context?.traceId ?? null });

    return new Response(
      JSON.stringify({ success: true, runId: run.id, response, correlation_id: correlationId }),
      { headers: jsonHeaders },
    );
  } catch (error) {
    // Redacted: only the error class reaches logs, nothing from the payload.
    log(correlationId, 'unhandled_error', { error_class: error instanceof Error ? error.name : 'unknown' });
    return new Response(
      JSON.stringify({ error: 'internal_error', correlation_id: correlationId }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
