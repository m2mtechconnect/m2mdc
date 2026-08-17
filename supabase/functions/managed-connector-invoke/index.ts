/**
 * Executes a single allowlisted operation against an AURA Managed Shared
 * Connector.
 *
 * Fail-closed rules:
 *   - Session JWT required; roles and tenant resolved server-side.
 *   - The caller never supplies a URL, host, credential or gateway key.
 *   - authorizeManagedOperation() is the only gate; default is deny.
 *   - Writes require an APPROVED, unexpired approval record.
 *   - Every attempt writes a managed_connector_invocations row with the
 *     decision, reason code and correlation ID. No credential is ever logged.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveCallerTenant } from '../_shared/connectionTenant.ts';
import { manifestEntry, operationFor } from '../_shared/managedConnectorManifest.ts';
import { authorizeManagedOperation } from '../_shared/managedConnectorAuthz.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GATEWAY_BASE = 'https://connector-gateway.lovable.dev';

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json(405, { error_code: 'method_not_allowed' });

  const correlationId = crypto.randomUUID();
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
  const operationId = typeof body.operation_id === 'string' ? body.operation_id : '';
  const facilityId = typeof body.facility_id === 'string' ? body.facility_id : null;
  if (!connectionId || !operationId) {
    return json(400, { error_code: 'invalid_request', correlation_id: correlationId });
  }

  const { data: connection } = await admin
    .from('connection_instances')
    .select('id, connector_id, tenant_id, facility_id, binding_class, platform_binding_state, enabled, status')
    .eq('id', connectionId)
    .maybeSingle();

  async function record(decision: string, reasonCode: string, tenantId: string | null) {
    await admin.from('managed_connector_invocations').insert({
      connection_id: connection?.id ?? null,
      tenant_id: tenantId,
      actor_id: user!.id,
      operation_id: operationId,
      decision,
      reason_code: reasonCode,
      latency_ms: Date.now() - startedAt,
      correlation_id: correlationId,
    });
  }

  const tenantId = await resolveCallerTenant(admin, user.id);
  if (!connection) {
    await record('DENIED', 'connection_not_found', tenantId);
    return json(404, { error_code: 'connection_not_found', correlation_id: correlationId });
  }

  const { data: roleRows } = await admin.from('user_roles').select('role').eq('user_id', user.id);
  const roles = (roleRows ?? []).map((r: { role: string }) => r.role);

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
    await record('DENIED', decision.reason_code, tenantId);
    const status = decision.reason_code === 'rate_limited' ? 429 : 403;
    return json(status, {
      error_code: decision.reason_code,
      safe_message: decision.safe_message,
      correlation_id: correlationId,
    });
  }

  // Managed credentials are resolved by the secure connector gateway. AURA
  // never reads, stores or forwards a provider token.
  const platformKey = Deno.env.get('LOVABLE_API_KEY');
  const connectionKeyName = `${(entry!.gateway_connector_key ?? '').toUpperCase()}_API_KEY`;
  const connectionKey = connectionKeyName === '_API_KEY' ? undefined : Deno.env.get(connectionKeyName);
  if (!platformKey || !connectionKey) {
    await record('BLOCKED', 'managed_credential_unavailable', tenantId);
    return json(503, {
      error_code: 'managed_credential_unavailable',
      safe_message: 'The platform-managed credential for this connector is not available to this environment.',
      correlation_id: correlationId,
    });
  }

  const path = typeof body.path === 'string' && body.path.startsWith('/') ? body.path : null;
  if (!path) {
    await record('DENIED', 'operation_path_not_resolved', tenantId);
    return json(400, { error_code: 'operation_path_not_resolved', correlation_id: correlationId });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), operation!.timeout_ms);
  try {
    const upstream = await fetch(`${GATEWAY_BASE}/${entry!.gateway_connector_key}${path}`, {
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
      await record('FAILED', `upstream_${upstream.status}`, tenantId);
      return json(upstream.status, {
        error_code: 'provider_request_failed',
        status: upstream.status,
        details: text.slice(0, 2000),
        correlation_id: correlationId,
      });
    }
    await record('ALLOWED', 'authorized', tenantId);
    await admin
      .from('connection_instances')
      .update({ last_success_at: new Date().toISOString(), last_verified_at: new Date().toISOString() })
      .eq('id', connection.id);
    return json(200, { correlation_id: correlationId, result: text ? JSON.parse(text) : null });
  } catch (_error) {
    await record('FAILED', 'upstream_timeout_or_network', tenantId);
    return json(504, { error_code: 'upstream_unavailable', correlation_id: correlationId });
  } finally {
    clearTimeout(timer);
  }
});