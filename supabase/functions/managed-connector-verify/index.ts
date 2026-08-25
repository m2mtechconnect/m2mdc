/**
 * Operator-triggered runtime verification for an AURA Managed Connector.
 *
 * Executes the manifest-declared read-only probe against the managed gateway
 * and records evidence-derived verification state. Tenant and role authority
 * are derived from the caller-scoped database client before service-role access.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  MANAGED_OPERATOR_ROLES,
  resolveCallerOrgRoles,
  resolveCallerTenant,
  tenantVisible,
  TENANT_FORBIDDEN,
  TENANT_REQUIRED,
} from '../_shared/connectionTenant.ts';
import { manifestEntry, operationFor } from '../_shared/managedConnectorManifest.ts';
import { authorizeManagedOperation } from '../_shared/managedConnectorAuthz.ts';
import { countLiveRecords, evaluateVerification } from '../_shared/managedVerification.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

const CORS_EXTRA: Record<string, string> = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
let CORS: Record<string, string> = { ...getCorsHeaders(null), ...CORS_EXTRA };

const GATEWAY_BASE = 'https://connector-gateway.lovable.dev';

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
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json(401, { error_code: 'unauthorized', correlation_id: correlationId });

  const caller = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: authData, error: authError } = await caller.auth.getUser();
  const user = authData?.user;
  if (authError || !user) return json(401, { error_code: 'unauthorized', correlation_id: correlationId });

  const tenantId = await resolveCallerTenant(caller);
  if (!tenantId) return json(403, { ...TENANT_REQUIRED, correlation_id: correlationId });
  const roles = await resolveCallerOrgRoles(caller, user.id, tenantId, MANAGED_OPERATOR_ROLES);
  if (roles.length === 0) {
    return json(403, {
      error_code: 'operator_role_required',
      safe_message: 'Runtime verification requires an organization operator, engineer, administrator or owner role.',
      correlation_id: correlationId,
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error_code: 'invalid_request', correlation_id: correlationId });
  }
  const connectionId = typeof body.connection_id === 'string' ? body.connection_id : '';
  if (!connectionId) return json(400, { error_code: 'invalid_request', correlation_id: correlationId });

  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: connection } = await admin
    .from('connection_instances')
    .select('id, connector_id, tenant_id, facility_id, binding_class, platform_binding_state, enabled, status, verification_state')
    .eq('id', connectionId)
    .maybeSingle();

  if (!connection) return json(404, { error_code: 'connection_not_found', correlation_id: correlationId });
  if (!tenantVisible(connection.tenant_id ?? null, tenantId)) {
    return json(403, { ...TENANT_FORBIDDEN, correlation_id: correlationId });
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
    requested_facility_id: connection.facility_id ?? null,
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
    .eq('id', connection.id)
    .eq('tenant_id', tenantId);

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
    tenant_id: tenantId,
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
