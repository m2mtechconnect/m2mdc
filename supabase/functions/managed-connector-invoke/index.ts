/**
 * Executes a single allowlisted operation against an AURA Managed Shared
 * Connector.
 *
 * Fail-closed rules:
 *   - Session JWT required; roles and tenant resolved server-side.
 *   - The caller never supplies a URL, host, path, credential or gateway key.
 *   - authorizeManagedOperation() is the application authorization gate.
 *   - Operation id resolves to one exact server-owned transport route.
 *   - Strict white-label policy must resolve an approved AURA-owned gateway.
 *   - Writes require an APPROVED, unexpired approval record.
 *   - Every attempt writes a managed_connector_invocations row with the
 *     decision, reason code and correlation ID. No credential is ever logged.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveCallerTenant } from '../_shared/connectionTenant.ts';
import { manifestEntry, operationFor } from '../_shared/managedConnectorManifest.ts';
import { authorizeManagedOperation } from '../_shared/managedConnectorAuthz.ts';
import { managedTransportFor } from '../_shared/managedConnectorTransport.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import {
  managedConnectorGatewayPolicy,
  strictWhiteLabelEnabled,
  whiteLabelBlockedResponse,
} from '../_shared/whiteLabelGateway.ts';

const CORS_EXTRA: Record<string, string> = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
let CORS: Record<string, string> = { ...getCorsHeaders(null), ...CORS_EXTRA };

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

function gatewayToken(): string | null {
  const auraToken = Deno.env.get('AURA_MANAGED_GATEWAY_TOKEN')?.trim();
  if (auraToken) return auraToken;
  if (!strictWhiteLabelEnabled()) return Deno.env.get('LOVABLE_API_KEY')?.trim() || null;
  return null;
}

function parseProviderResult(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

Deno.serve(async (req) => {
  CORS = { ...getCorsHeaders(req.headers.get('origin')), ...CORS_EXTRA };
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
  const transport = entry ? managedTransportFor(entry.connector_definition_id, operationId) : null;

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

  if (!entry?.gateway_connector_key || !transport || transport.gateway_connector_key !== entry.gateway_connector_key) {
    await record('DENIED', 'operation_transport_not_resolved', tenantId);
    return json(422, {
      error_code: 'operation_transport_not_resolved',
      safe_message: 'This managed operation has no approved AURA transport route.',
      correlation_id: correlationId,
    });
  }

  const gateway = managedConnectorGatewayPolicy();
  if (!gateway.runtimeAllowed || !gateway.gatewayBaseUrl) {
    await record('BLOCKED', gateway.reason.toLowerCase(), tenantId);
    return json(503, {
      ...whiteLabelBlockedResponse(gateway.reason),
      correlation_id: correlationId,
    });
  }

  const platformKey = gatewayToken();
  const connectionKeyName = `${entry.gateway_connector_key.toUpperCase()}_API_KEY`;
  const connectionKey = Deno.env.get(connectionKeyName);
  if (!platformKey || !connectionKey) {
    await record('BLOCKED', 'managed_credential_unavailable', tenantId);
    return json(503, {
      error_code: 'managed_credential_unavailable',
      safe_message: 'The AURA-managed credential for this connector is not available to this environment.',
      correlation_id: correlationId,
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), operation!.timeout_ms);
  try {
    const upstream = await fetch(`${gateway.gatewayBaseUrl}/${transport.gateway_connector_key}${transport.path}`, {
      method: transport.method,
      headers: {
        Authorization: `Bearer ${platformKey}`,
        'X-Connection-Api-Key': connectionKey,
        'X-AURA-Correlation-Id': correlationId,
        'Content-Type': 'application/json',
      },
      body: transport.sends_payload ? JSON.stringify(body.payload ?? {}) : undefined,
      signal: controller.signal,
    });
    const text = await upstream.text();
    if (!upstream.ok) {
      await record('FAILED', `upstream_${upstream.status}`, tenantId);
      return json(upstream.status, {
        error_code: 'provider_request_failed',
        safe_message: 'The AURA managed provider request did not complete successfully.',
        status: upstream.status,
        correlation_id: correlationId,
      });
    }
    await record('ALLOWED', 'authorized', tenantId);
    await admin
      .from('connection_instances')
      .update({ last_success_at: new Date().toISOString(), last_verified_at: new Date().toISOString() })
      .eq('id', connection.id);
    return json(200, { correlation_id: correlationId, result: parseProviderResult(text) });
  } catch (_error) {
    await record('FAILED', 'upstream_timeout_or_network', tenantId);
    return json(504, {
      error_code: 'upstream_unavailable',
      safe_message: 'The AURA managed connection is temporarily unavailable.',
      correlation_id: correlationId,
    });
  } finally {
    clearTimeout(timer);
  }
});
