/**
 * Executes one allowlisted operation against an AURA Managed Shared Connector.
 *
 * Fail-closed rules:
 *   - Session JWT, active organization and organization roles resolve from the
 *     caller-scoped client before service-role access.
 *   - Connection tenant must exactly match the caller active organization.
 *   - The caller never supplies a URL, host, path, credential or gateway key.
 *     Until an operation has an explicit server-owned gateway path, it cannot
 *     be invoked through this generic endpoint.
 *   - Writes require an approved, unexpired approval record.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  MANAGED_OPERATION_ROLES,
  resolveCallerOrgRoles,
  resolveCallerTenant,
  tenantVisible,
  TENANT_FORBIDDEN,
  TENANT_REQUIRED,
} from '../_shared/connectionTenant.ts';
import { manifestEntry, operationFor } from '../_shared/managedConnectorManifest.ts';
import { authorizeManagedOperation } from '../_shared/managedConnectorAuthz.ts';
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
  const roles = await resolveCallerOrgRoles(caller, user.id, tenantId, MANAGED_OPERATION_ROLES);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error_code: 'invalid_request', correlation_id: correlationId });
  }

  const connectionId = typeof body.connection_id === 'string' ? body.connection_id : '';
  const operationId = typeof body.operation_id === 'string' ? body.operation_id : '';
  const facilityId = typeof body.facility_id === 'string' ? body.facility_id : null;
  if (!connectionId || !operationId) {
    return json(400, { error_code: 'invalid_request', correlation_id: correlationId });
  }

  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: connection } = await admin
    .from('connection_instances')
    .select('id, connector_id, tenant_id, facility_id, binding_class, platform_binding_state, enabled, status')
    .eq('id', connectionId)
    .maybeSingle();

  async function record(decision: string, reasonCode: string) {
    await admin.from('managed_connector_invocations').insert({
      connection_id: connection?.id ?? null,
      tenant_id: tenantId,
      actor_id: user.id,
      operation_id: operationId,
      decision,
      reason_code: reasonCode,
      latency_ms: Date.now() - startedAt,
      correlation_id: correlationId,
    });
  }

  if (!connection) {
    await record('DENIED', 'connection_not_found');
    return json(404, { error_code: 'connection_not_found', correlation_id: correlationId });
  }
  if (!tenantVisible(connection.tenant_id ?? null, tenantId)) {
    await record('DENIED', 'tenant_scope_violation');
    return json(403, { ...TENANT_FORBIDDEN, correlation_id: correlationId });
  }

  if (facilityId) {
    const { data: facility } = await admin
      .from('data_centre_twins')
      .select('id, org_id, metadata')
      .eq('id', facilityId)
      .maybeSingle();
    if (!facility || facility.org_id !== tenantId || facility.metadata?.provisioned === 'default_starter_twin') {
      await record('DENIED', 'facility_scope_violation');
      return json(403, {
        error_code: 'facility_scope_violation',
        safe_message: 'The requested facility is not available in your active organization.',
        correlation_id: correlationId,
      });
    }
  }

  const entry = manifestEntry(connection.connector_id);
  const operation = entry ? operationFor(entry, operationId) : null;

  const { data: approval } = await admin
    .from('managed_connector_write_approvals')
    .select('status, expires_at')
    .eq('connection_id', connection.id)
    .eq('operation_id', operationId)
    .eq('status', 'APPROVED')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const sinceIso = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await admin
    .from('managed_connector_invocations')
    .select('id', { count: 'exact', head: true })
    .eq('connection_id', connection.id)
    .eq('tenant_id', tenantId)
    .eq('operation_id', operationId)
    .eq('decision', 'ALLOWED')
    .gte('created_at', sinceIso);

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
    requested_facility_id: facilityId,
    operation,
    approval: approval ?? null,
    invocations_last_hour: count ?? 0,
    now: new Date(),
  });

  if (!decision.allowed) {
    await record('DENIED', decision.reason_code);
    const status = decision.reason_code === 'rate_limited' ? 429 : 403;
    return json(status, {
      error_code: decision.reason_code,
      safe_message: decision.safe_message,
      correlation_id: correlationId,
    });
  }

  // Generic invocation is allowed only when the server manifest owns a path for
  // this exact operation. Today that is the declared health-probe operation.
  const gatewayPath = entry?.health_probe?.operation_id === operationId ? entry.health_probe.path : null;
  if (!gatewayPath) {
    await record('DENIED', 'operation_path_not_resolved');
    return json(422, {
      error_code: 'operation_path_not_resolved',
      safe_message: 'This operation has no server-owned runtime path and cannot be invoked.',
      correlation_id: correlationId,
    });
  }

  const platformKey = Deno.env.get('LOVABLE_API_KEY');
  const connectionKeyName = `${(entry!.gateway_connector_key ?? '').toUpperCase()}_API_KEY`;
  const connectionKey = connectionKeyName === '_API_KEY' ? undefined : Deno.env.get(connectionKeyName);
  if (!platformKey || !connectionKey) {
    await record('BLOCKED', 'managed_credential_unavailable');
    return json(503, {
      error_code: 'managed_credential_unavailable',
      safe_message: 'The platform-managed credential for this connector is not available to this environment.',
      correlation_id: correlationId,
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), operation!.timeout_ms);
  try {
    const upstream = await fetch(`${GATEWAY_BASE}/${entry!.gateway_connector_key}${gatewayPath}`, {
      method: operation!.classification === 'WRITE' ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${platformKey}`,
        'X-Connection-Api-Key': connectionKey,
        'Content-Type': 'application/json',
      },
      body: operation!.classification === 'WRITE' ? JSON.stringify(body.payload ?? {}) : undefined,
      signal: controller.signal,
    });
    const text = await upstream.text();
    if (!upstream.ok) {
      await record('FAILED', `upstream_${upstream.status}`);
      return json(upstream.status, {
        error_code: 'provider_request_failed',
        status: upstream.status,
        safe_message: 'The managed provider request failed.',
        correlation_id: correlationId,
      });
    }
    await record('ALLOWED', 'authorized');
    await admin
      .from('connection_instances')
      .update({ last_success_at: new Date().toISOString(), last_verified_at: new Date().toISOString() })
      .eq('id', connection.id)
      .eq('tenant_id', tenantId);
    return json(200, { correlation_id: correlationId, result: text ? JSON.parse(text) : null });
  } catch (_error) {
    await record('FAILED', 'upstream_timeout_or_network');
    return json(504, { error_code: 'upstream_unavailable', correlation_id: correlationId });
  } finally {
    clearTimeout(timer);
  }
});
