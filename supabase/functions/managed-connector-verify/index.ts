/**
 * Operator-triggered runtime verification for an AURA Managed Connector.
 *
 * Executes the manifest-declared read-only probe against the managed gateway
 * and records the evidence-derived verification state. Fail-closed rules:
 *   - Session JWT required; roles, tenant and probe path resolved server-side.
 *   - The caller never supplies a URL, host, path, credential or gateway key.
 *   - authorizeManagedOperation() is the only gate; default is deny.
 *   - The state is derived from the probe result, never from the request.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveCallerTenant, tenantVisible, TENANT_FORBIDDEN } from '../_shared/connectionTenant.ts';
import { manifestEntry, operationFor } from '../_shared/managedConnectorManifest.ts';
import { authorizeManagedOperation } from '../_shared/managedConnectorAuthz.ts';
import { countLiveRecords, evaluateVerification } from '../_shared/managedVerification.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

// Scoped CORS: origin is resolved per request from the shared allowlist;
// the method/header allowances below are specific to this function.
const CORS_EXTRA: Record<string, string> = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
let CORS: Record<string, string> = { ...getCorsHeaders(null), ...CORS_EXTRA };

const GATEWAY_BASE = 'https://connector-gateway.lovable.dev';
const OPERATOR_ROLES = ['owner', 'admin', 'operator', 'engineer'];

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  CORS = { ...getCorsHeaders(req.headers.get('origin')), ...CORS_EXTRA };
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json(405, { error_code: 'method_not_allowed' });

  const correlationId = crypto.randomUUID();
  const startedAtIso = new Date().toISOString();
  const startedAt = Date.now();
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json(401, { error_code: 'unauthorized', correlation_id: correlationId });
  const { data: userData } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
  const user = userData?.user;
  if (!user) return json(401, { error_code: 'unauthorized', correlation_id: correlationId });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error_code: 'invalid_request', correlation_id: correlationId });
  }
  const connectionId = typeof body.connection_id === 'string' ? body.connection_id : '';
  if (!connectionId) return json(400, { error_code: 'invalid_request', correlation_id: correlationId });

  const { data: connection } = await admin
    .from('connection_instances')
    .select('id, connector_id, tenant_id, facility_id, binding_class, platform_binding_state, enabled, status, verification_state')
    .eq('id', connectionId)
    .maybeSingle();

  const tenantId = await resolveCallerTenant(admin, user.id);
  if (!connection) return json(404, { error_code: 'connection_not_found', correlation_id: correlationId });
  if (!tenantVisible(connection.tenant_id, tenantId)) return json(403, { ...TENANT_FORBIDDEN, correlation_id: correlationId });

  const { data: roleRows } = await admin.from('user_roles').select('role').eq('user_id', user.id);
  const roles = (roleRows ?? []).map((r: { role: string }) => r.role);
  if (!roles.some((r) => OPERATOR_ROLES.includes(r))) {
    return json(403, {
      error_code: 'operator_role_required',
      safe_message: 'Runtime verification requires an operator, engineer, administrator or owner role.',
      correlation_id: correlationId,
    });
  }

  const entry = manifestEntry(connection.connector_id);
  const probe = entry?.health_probe ?? null;
  if (!entry || !probe) {
    return json(422, {
      error_code: 'no_managed_probe',
      safe_message: 'No managed read-only probe is declared for this connector, so runtime verification cannot be proven.',
      correlation_id: correlationId,
    });
  }

  const operation = operationFor(entry, probe.operation_id);
  const decision = authorizeManagedOperation({
    actor_id: user.id,
    actor_roles: roles,
    actor_tenant_id: tenantId,
    connection: {
      id: connection.id,
      tenant_id: connection.tenant_id,
      facility_id: connection.facility_id,
      binding_class: connection.binding_class,
      platform_binding_state: connection.platform_binding_state,
      enabled: connection.enabled,
      status: connection.status,
    },
    requested_facility_id: null,
    operation,
    approval: null,
    invocations_last_hour: 0,
    now: new Date(),
  });
  if (!decision.allowed) {
    return json(403, { error_code: decision.reason_code, safe_message: decision.safe_message, correlation_id: correlationId });
  }

  const platformKey = Deno.env.get('LOVABLE_API_KEY');
  const connectionKeyName = `${(entry.gateway_connector_key ?? '').toUpperCase()}_API_KEY`;
  const connectionKey = connectionKeyName === '_API_KEY' ? undefined : Deno.env.get(connectionKeyName);
  if (!platformKey || !connectionKey) {
    return json(503, {
      error_code: 'managed_credential_unavailable',
      safe_message: 'The platform-managed credential for this connector is not available to this environment, so no probe was run.',
      correlation_id: correlationId,
    });
  }

  let httpStatus: number | null = null;
  let recordCount: number | null = null;
  let reachable = false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), operation!.timeout_ms);
  try {
    const upstream = await fetch(`${GATEWAY_BASE}/${entry.gateway_connector_key}${probe.path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${platformKey}`,
        'X-Connection-Api-Key': connectionKey,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    reachable = true;
    httpStatus = upstream.status;
    const text = await upstream.text();
    if (upstream.ok) {
      try {
        recordCount = countLiveRecords(text ? JSON.parse(text) : null);
      } catch {
        recordCount = null;
      }
    }
  } catch {
    reachable = false;
  } finally {
    clearTimeout(timer);
  }

  const latency = Date.now() - startedAt;
  const verdict = evaluateVerification({ reachable, http_status: httpStatus, record_count: recordCount });
  const previousState = (connection.verification_state as string | null) ?? 'NOT_VERIFIED';
  const completedAt = new Date().toISOString();
  // Only shape-level evidence is stored. No provider payload is retained.
  const evidence = {
    probe_operation_id: probe.operation_id,
    http_status: httpStatus,
    record_count: recordCount,
    latency_ms: latency,
    reason_code: verdict.reason_code,
  };

  await admin
    .from('connection_instances')
    .update({
      verification_state: verdict.state,
      verification_reason: verdict.safe_message,
      verification_evidence: evidence,
      verified_by: user.id,
      last_verification_at: completedAt,
      last_tested_at: completedAt,
      ...(verdict.state === 'VERIFIED' ? { last_success_at: completedAt, last_verified_at: completedAt } : {}),
    })
    .eq('id', connection.id);

  await admin.from('connection_health_checks').insert({
    connection_id: connection.id,
    check_type: 'MANAGED_RUNTIME_VERIFICATION',
    started_at: startedAtIso,
    completed_at: completedAt,
    status: verdict.state === 'VERIFIED' ? 'PASSED' : verdict.state === 'PARTIAL' ? 'PARTIAL' : 'FAILED',
    latency_ms: latency,
    auth_result: reachable && httpStatus === 200 ? 'AUTHORISED' : 'NOT_PROVEN',
    network_result: reachable ? 'REACHABLE' : 'UNREACHABLE',
    data_availability: recordCount === null ? 'UNKNOWN' : recordCount > 0 ? 'RECORDS_RETURNED' : 'NO_RECORDS',
    error_code: verdict.state === 'FAILED' ? verdict.reason_code : null,
    safe_message: verdict.safe_message,
    correlation_id: correlationId,
    requested_by: user.id,
  });

  await admin.from('connection_audit_events').insert({
    actor_id: user.id,
    action: 'connection.runtime_verification',
    connection_id: connection.id,
    previous_state: previousState,
    new_state: verdict.state,
    tenant_id: connection.tenant_id,
    correlation_id: correlationId,
    evidence,
  });

  await admin.from('managed_connector_invocations').insert({
    connection_id: connection.id,
    tenant_id: tenantId,
    actor_id: user.id,
    operation_id: probe.operation_id,
    decision: verdict.state === 'FAILED' ? 'FAILED' : 'ALLOWED',
    reason_code: verdict.reason_code,
    latency_ms: latency,
    correlation_id: correlationId,
  });

  return json(200, {
    correlation_id: correlationId,
    previous_state: previousState,
    verification_state: verdict.state,
    reason_code: verdict.reason_code,
    safe_message: verdict.safe_message,
    record_count: recordCount,
    latency_ms: latency,
  });
});
