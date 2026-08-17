/**
 * /v1/zapier-webhook/{app_key}  -  EXTERNAL_ENTRYPOINT
 *
 * Receives webhook events from Zapier integrations.
 *
 * Phase 11 security hardening. Previously this function accepted any request
 * that carried an admin JWT and merely *logged* the signature value with a
 * `TODO: implement verification`. It now:
 *  - verifies an HMAC-SHA256 signature and fails closed when the shared
 *    secret is absent (503 - the endpoint is unverifiable, not open),
 *  - enforces timestamp tolerance and replay rejection,
 *  - is POST-only, bounded in payload size and rate limited per app key,
 *  - never logs signatures, headers, or payload bodies,
 *  - returns `{ error, correlation_id }` and nothing else.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyWebhookRequest, webhookErrorResponse } from '../_shared/webhookSignature.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'null',
  'Access-Control-Allow-Headers': 'content-type, x-zapier-signature, x-zapier-timestamp',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

function log(correlationId: string, event: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({
    service: 'zapier-webhook',
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

  const appKey = new URL(req.url).pathname.split('/').filter(Boolean).pop() ?? '';
  if (!/^[a-z0-9_-]{2,64}$/i.test(appKey) || appKey === 'zapier-webhook') {
    log(correlationId, 'rejected', { reason: 'missing_app_key' });
    return new Response(
      JSON.stringify({ error: 'missing_app_key', correlation_id: correlationId }),
      { status: 400, headers: jsonHeaders },
    );
  }

  const verification = await verifyWebhookRequest({
    req,
    secret: Deno.env.get('ZAPIER_WEBHOOK_SECRET'),
    rateLimitKey: `zapier-webhook:${appKey}`,
  });

  if (!verification.ok) {
    log(correlationId, 'rejected', { reason: verification.reason, status: verification.status, app_key: appKey });
    return webhookErrorResponse(verification, correlationId, corsHeaders);
  }

  try {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(verification.rawBody) as Record<string, unknown>;
    } catch {
      log(correlationId, 'rejected', { reason: 'invalid_json', app_key: appKey });
      return new Response(
        JSON.stringify({ error: 'invalid_json', correlation_id: correlationId }),
        { status: 400, headers: jsonHeaders },
      );
    }

    const eventType = typeof payload.event_type === 'string' ? payload.event_type.slice(0, 64) : 'sync';
    const errorText = typeof payload.error === 'string' ? payload.error.slice(0, 500) : null;
    const documentCount = typeof payload.document_count === 'number' && Number.isFinite(payload.document_count)
      ? Math.max(0, Math.min(1_000_000, Math.trunc(payload.document_count)))
      : 1;
    const isSuccess = !errorText && payload.status !== 'failed';

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: integrations, error: fetchError } = await supabase
      .from('integrations')
      .select('id, user_id, config')
      .eq('provider', `zapier_${appKey}`);

    if (fetchError || !integrations || integrations.length === 0) {
      log(correlationId, 'not_found', { app_key: appKey });
      return new Response(
        JSON.stringify({ error: 'not_found', correlation_id: correlationId }),
        { status: 404, headers: jsonHeaders },
      );
    }

    for (const integration of integrations) {
      const config = (integration.config ?? {}) as Record<string, number | unknown>;
      const num = (k: string) => (typeof config[k] === 'number' ? (config[k] as number) : 0);

      await supabase
        .from('integrations')
        .update({
          last_sync: new Date().toISOString(),
          status: isSuccess ? 'connected' : 'error',
          error_message: errorText,
          config: {
            ...config,
            documents_synced: num('documents_synced') + documentCount,
            sync_count: num('sync_count') + 1,
            success_count: isSuccess ? num('success_count') + 1 : num('success_count'),
            last_webhook_at: new Date().toISOString(),
          },
        })
        .eq('id', integration.id);

      // Audit row carries the classification, not the raw payload.
      void supabase.from('integration_logs').insert({
        user_id: integration.user_id,
        integration_id: integration.id,
        action: 'webhook',
        status: isSuccess ? 'success' : 'error',
        error_message: errorText,
        details: { event_type: eventType, document_count: documentCount, correlation_id: correlationId },
      });
    }

    log(correlationId, 'processed', { app_key: appKey, event_type: eventType, outcome: isSuccess ? 'success' : 'error' });

    return new Response(
      JSON.stringify({ success: true, app_key: appKey, correlation_id: correlationId }),
      { headers: jsonHeaders },
    );
  } catch (error) {
    log(correlationId, 'unhandled_error', { error_class: error instanceof Error ? error.name : 'unknown' });
    return new Response(
      JSON.stringify({ error: 'internal_error', correlation_id: correlationId }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
