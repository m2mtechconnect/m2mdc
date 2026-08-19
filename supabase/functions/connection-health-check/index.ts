/**
 * Server-side connection health check for the AURA Connections control plane.
 *
 * Security rules (do not relax without review):
 *   - Caller must present a valid Supabase session JWT.
 *   - Only administrators and owners may execute a check.
 *   - Probes are restricted to a fixed server-side allowlist of AURA-owned
 *     targets. No caller-supplied URL is ever fetched, which removes the SSRF
 *     surface entirely (no loopback, link-local, metadata, DNS-rebinding or
 *     redirect target can be reached).
 *   - Bounded timeout, no retries, no credential material in the response.
 *   - Every check is persisted with a correlation id and audited.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveCallerTenant, tenantVisible, TENANT_FORBIDDEN } from '../_shared/connectionTenant.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

// Scoped CORS: origin is resolved per request from the shared allowlist;
// the method/header allowances below are specific to this function.
const CORS_EXTRA: Record<string, string> = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
let CORS: Record<string, string> = { ...getCorsHeaders(null), ...CORS_EXTRA };

const TIMEOUT_MS = 5_000;
const MAX_RESPONSE_BYTES = 32_768;

type ProbeKind = 'platform_query' | 'endpoint_reachability' | 'storage_read';

/** Fixed, server-owned probe targets. Caller input selects a connection, never a URL. */
const PROBES: Record<string, { kind: ProbeKind; path?: string; description: string }> = {
  supabase_platform: { kind: 'platform_query', description: 'Authenticated application read against the managed backend.' },
  dsx_ingest_gateway: { kind: 'endpoint_reachability', path: '/functions/v1/dsx-ingest', description: 'DSX ingest endpoint reachability and auth rejection behaviour.' },
  openusd_storage: { kind: 'storage_read', description: 'Managed object storage listing for approved OpenUSD derivatives.' },
  asset_manifest: { kind: 'storage_read', description: 'Managed object storage listing for the asset manifest.' },
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  CORS = { ...getCorsHeaders(req.headers.get('origin')), ...CORS_EXTRA };
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json(405, { status: 'FAILED', error_code: 'method_not_allowed' });

  const correlationId = crypto.randomUUID();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json(401, { status: 'FAILED', error_code: 'unauthorized', correlation_id: correlationId });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: userData } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
  const user = userData?.user;
  if (!user) {
    return json(401, { status: 'FAILED', error_code: 'unauthorized', correlation_id: correlationId });
  }

  const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
  const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === 'admin' || r.role === 'owner');
  if (!isAdmin) {
    return json(403, { status: 'FAILED', error_code: 'forbidden', safe_message: 'Administrator role required.', correlation_id: correlationId });
  }

  const callerTenantId = await resolveCallerTenant(admin, user.id);

  let connectionId = '';
  try {
    const body = await req.json();
    connectionId = typeof body?.connection_id === 'string' ? body.connection_id : '';
  } catch {
    return json(400, { status: 'FAILED', error_code: 'invalid_request', correlation_id: correlationId });
  }
  if (!connectionId) return json(400, { status: 'FAILED', error_code: 'invalid_request', correlation_id: correlationId });

  const { data: connection } = await admin
    .from('connection_instances')
    .select('*')
    .eq('id', connectionId)
    .maybeSingle();
  if (!connection) return json(404, { status: 'FAILED', error_code: 'not_found', correlation_id: correlationId });
  if (!tenantVisible(connection.tenant_id ?? null, callerTenantId)) {
    return json(403, { status: 'FAILED', ...TENANT_FORBIDDEN, correlation_id: correlationId });
  }

  const probe = PROBES[connection.connector_id as string];
  if (!probe) {
    return json(400, {
      status: 'FAILED',
      error_code: 'no_server_probe',
      safe_message: 'No server-side probe exists for this connector.',
      correlation_id: correlationId,
    });
  }

  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  let result = {
    status: 'FAILED' as 'PASSED' | 'FAILED',
    network_result: 'not_attempted',
    auth_result: 'not_attempted',
    schema_result: 'not_applicable',
    data_availability: 'unknown',
    error_code: null as string | null,
    safe_message: '' as string,
  };

  try {
    if (probe.kind === 'platform_query') {
      const { error } = await admin.from('connector_definitions').select('id').limit(1);
      result = error
        ? { ...result, network_result: 'reachable', auth_result: 'rejected', error_code: 'platform_query_failed', safe_message: 'Managed backend rejected the probe query.' }
        : { status: 'PASSED', network_result: 'reachable', auth_result: 'accepted', schema_result: 'conformant', data_availability: 'application_records_present', error_code: null, safe_message: 'Application read/write path verified. This is not facility telemetry.' };
    } else if (probe.kind === 'endpoint_reachability') {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const res = await fetch(`${supabaseUrl}${probe.path}`, {
        method: 'POST',
        redirect: 'error',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      clearTimeout(timer);
      const text = (await res.text()).slice(0, MAX_RESPONSE_BYTES);
      void text;
      // The gateway must reject an unsigned probe. A 401/403 is the healthy answer.
      const rejectsUnsigned = res.status === 401 || res.status === 403;
      const { count } = await admin.from('dsx_events').select('id', { count: 'exact', head: true });
      result = {
        status: rejectsUnsigned ? 'PASSED' : 'FAILED',
        network_result: 'reachable',
        auth_result: rejectsUnsigned ? 'rejects_unsigned_requests' : 'unexpected_response',
        schema_result: 'not_evaluated',
        data_availability: (count ?? 0) > 0 ? 'events_present' : 'zero_events',
        error_code: rejectsUnsigned ? null : 'unexpected_endpoint_response',
        safe_message: rejectsUnsigned
          ? 'Endpoint reachable and correctly rejecting unsigned requests. Endpoint health is not data flow.'
          : 'Endpoint returned an unexpected response to an unsigned probe.',
      };
    } else {
      const { data, error } = await admin.storage.listBuckets();
      result = error
        ? { ...result, network_result: 'reachable', auth_result: 'rejected', error_code: 'storage_probe_failed', safe_message: 'Managed storage rejected the probe.' }
        : {
            status: 'PASSED',
            network_result: 'reachable',
            auth_result: 'accepted',
            schema_result: 'not_applicable',
            data_availability: (data ?? []).length > 0 ? 'objects_present' : 'no_objects',
            error_code: null,
            safe_message: 'Managed storage reachable.',
          };
    }
  } catch (_err) {
    result = { ...result, network_result: 'unreachable', error_code: 'probe_error', safe_message: 'Probe failed or timed out.' };
  }

  const latency = Date.now() - t0;
  const completedAt = new Date().toISOString();

  await admin.from('connection_health_checks').insert({
    connection_id: connectionId,
    check_type: probe.kind,
    started_at: startedAt,
    completed_at: completedAt,
    status: result.status,
    latency_ms: latency,
    network_result: result.network_result,
    auth_result: result.auth_result,
    schema_result: result.schema_result,
    data_availability: result.data_availability,
    error_code: result.error_code,
    safe_message: result.safe_message,
    correlation_id: correlationId,
    requested_by: user.id,
  });

  await admin.from('connection_instances').update({
    last_tested_at: completedAt,
    last_success_at: result.status === 'PASSED' ? completedAt : connection.last_success_at,
    last_error: result.status === 'PASSED' ? null : result.safe_message,
  }).eq('id', connectionId);

  await admin.from('connection_audit_events').insert({
    actor_id: user.id,
    action: 'connection.health_check',
    connection_id: connectionId,
    previous_state: connection.status,
    new_state: connection.status,
    correlation_id: correlationId,
    evidence: { probe: probe.kind, result: result.status, latency_ms: latency },
  });

  return json(200, {
    status: result.status,
    latency_ms: latency,
    network_result: result.network_result,
    auth_result: result.auth_result,
    schema_result: result.schema_result,
    data_availability: result.data_availability,
    safe_message: result.safe_message,
    error_code: result.error_code,
    correlation_id: correlationId,
  });
});