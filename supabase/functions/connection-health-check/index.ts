/**
 * Server-side connection health check for the AURA Connections control plane.
 *
 * Security and truth rules:
 *   - Caller must present a valid session JWT, active organization and an
 *     organization-scoped owner/admin grant.
 *   - The selected connection must belong exactly to that organization.
 *   - Probes use fixed server-owned AURA targets. No caller URL is fetched.
 *   - A passing probe proves reachability/authentication only. It never infers
 *     connection data flow from unrelated platform-wide records or storage.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  callerHasOrgRole,
  CONNECTION_ADMIN_ROLES,
  resolveCallerTenant,
  tenantVisible,
  TENANT_FORBIDDEN,
  TENANT_REQUIRED,
} from '../_shared/connectionTenant.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

const CORS_EXTRA: Record<string, string> = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
let CORS: Record<string, string> = { ...getCorsHeaders(null), ...CORS_EXTRA };

const TIMEOUT_MS = 5_000;
const MAX_RESPONSE_BYTES = 32_768;

type ProbeKind = 'platform_query' | 'endpoint_reachability' | 'storage_read';

const PROBES: Record<string, { kind: ProbeKind; path?: string; description: string }> = {
  supabase_platform: { kind: 'platform_query', description: 'Authenticated application read against the managed backend.' },
  dsx_ingest_gateway: { kind: 'endpoint_reachability', path: '/functions/v1/dsx-ingest', description: 'DSX ingest endpoint reachability and auth rejection behavior.' },
  openusd_storage: { kind: 'storage_read', description: 'Managed object storage control-plane reachability for approved OpenUSD derivatives.' },
  asset_manifest: { kind: 'storage_read', description: 'Managed object storage control-plane reachability for the asset manifest.' },
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
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json(401, { status: 'FAILED', error_code: 'unauthorized', correlation_id: correlationId });
  }

  const caller = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: authData, error: authError } = await caller.auth.getUser();
  const user = authData?.user;
  if (authError || !user) {
    return json(401, { status: 'FAILED', error_code: 'unauthorized', correlation_id: correlationId });
  }

  const callerTenantId = await resolveCallerTenant(caller);
  if (!callerTenantId) return json(403, { status: 'FAILED', ...TENANT_REQUIRED, correlation_id: correlationId });
  const canManage = await callerHasOrgRole(caller, user.id, callerTenantId, CONNECTION_ADMIN_ROLES);
  if (!canManage) {
    return json(403, {
      status: 'FAILED',
      error_code: 'forbidden',
      safe_message: 'Organization owner or administrator permission is required.',
      correlation_id: correlationId,
    });
  }

  let connectionId = '';
  try {
    const body = await req.json();
    connectionId = typeof body?.connection_id === 'string' ? body.connection_id : '';
  } catch {
    return json(400, { status: 'FAILED', error_code: 'invalid_request', correlation_id: correlationId });
  }
  if (!connectionId) return json(400, { status: 'FAILED', error_code: 'invalid_request', correlation_id: correlationId });

  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
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
    data_availability: 'not_evaluated',
    error_code: null as string | null,
    safe_message: '' as string,
  };

  try {
    if (probe.kind === 'platform_query') {
      const { error } = await admin.from('connector_definitions').select('id').limit(1);
      result = error
        ? {
            ...result,
            network_result: 'reachable',
            auth_result: 'rejected',
            error_code: 'platform_query_failed',
            safe_message: 'Managed backend rejected the control-plane probe query.',
          }
        : {
            status: 'PASSED',
            network_result: 'reachable',
            auth_result: 'accepted',
            schema_result: 'conformant',
            data_availability: 'not_evaluated',
            error_code: null,
            safe_message: 'Application control-plane path verified. Connection data flow was not evaluated.',
          };
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
      const rejectsUnsigned = res.status === 401 || res.status === 403;
      result = {
        status: rejectsUnsigned ? 'PASSED' : 'FAILED',
        network_result: 'reachable',
        auth_result: rejectsUnsigned ? 'rejects_unsigned_requests' : 'unexpected_response',
        schema_result: 'not_evaluated',
        data_availability: 'not_evaluated',
        error_code: rejectsUnsigned ? null : 'unexpected_endpoint_response',
        safe_message: rejectsUnsigned
          ? 'Endpoint reachable and correctly rejecting unsigned requests. Connection data flow was not evaluated.'
          : 'Endpoint returned an unexpected response to an unsigned probe.',
      };
    } else {
      const { error } = await admin.storage.listBuckets();
      result = error
        ? {
            ...result,
            network_result: 'reachable',
            auth_result: 'rejected',
            error_code: 'storage_probe_failed',
            safe_message: 'Managed storage rejected the control-plane probe.',
          }
        : {
            status: 'PASSED',
            network_result: 'reachable',
            auth_result: 'accepted',
            schema_result: 'not_applicable',
            data_availability: 'not_evaluated',
            error_code: null,
            safe_message: 'Managed storage control plane reachable. Connection data flow was not evaluated.',
          };
    }
  } catch (_err) {
    result = {
      ...result,
      network_result: 'unreachable',
      error_code: 'probe_error',
      safe_message: 'Probe failed or timed out.',
    };
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
  }).eq('id', connectionId).eq('tenant_id', callerTenantId);

  await admin.from('connection_audit_events').insert({
    actor_id: user.id,
    tenant_id: callerTenantId,
    action: 'connection.health_check',
    connection_id: connectionId,
    previous_state: connection.status,
    new_state: connection.status,
    correlation_id: correlationId,
    evidence: { probe: probe.kind, result: result.status, latency_ms: latency, data_availability: 'not_evaluated' },
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
