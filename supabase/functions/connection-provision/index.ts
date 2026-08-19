/**
 * Server-side provisioning for the AURA Connections control plane.
 *
 * Rules (do not relax without review):
 *   - Caller must present a valid session JWT and hold admin or owner.
 *   - Only connectors with IMPLEMENTED status and a runtime adapter may be
 *     instantiated. Everything else is refused with a named reason.
 *   - No credential material is accepted, stored or echoed here. Secret-bearing
 *     methods are provisioned unconfigured; the credential is submitted
 *     separately to the connection-credential vault function.
 *   - Endpoint targets are server-owned; the caller never supplies a URL.
 *   - Activation requires a persisted PASSED health check.
 *   - Every transition writes a connection_audit_events row.
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

const ENVIRONMENTS = new Set(['production', 'staging', 'development']);
const DIRECTIONS = new Set(['READ', 'WRITE', 'READ_WRITE']);
const VAULT_FREE_AUTH = new Set(['jwt', 'none', 'iam_role', 'workload_identity', 'service_account']);

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  CORS = { ...getCorsHeaders(req.headers.get('origin')), ...CORS_EXTRA };
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json(405, { error_code: 'method_not_allowed' });

  const correlationId = crypto.randomUUID();
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json(401, { error_code: 'unauthorized', correlation_id: correlationId });
  const { data: userData } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
  const user = userData?.user;
  if (!user) return json(401, { error_code: 'unauthorized', correlation_id: correlationId });

  const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
  const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === 'admin' || r.role === 'owner');
  if (!isAdmin) {
    return json(403, { error_code: 'forbidden', safe_message: 'Administrator role required.', correlation_id: correlationId });
  }

  // Tenant scope of the caller. The service-role client bypasses RLS, so this
  // is the only thing standing between an admin and another tenant's records.
  const callerTenantId = await resolveCallerTenant(admin, user.id);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error_code: 'invalid_request', correlation_id: correlationId });
  }
  const action = String(body.action ?? '');

  async function audit(fields: Record<string, unknown>) {
    await admin.from('connection_audit_events').insert({
      actor_id: user!.id,
      correlation_id: correlationId,
      ...fields,
    });
  }

  if (action === 'create') {
    const connectorId = String(body.connector_id ?? '');
    const displayName = String(body.display_name ?? '').trim();
    const environment = String(body.environment ?? '');
    const direction = String(body.data_direction ?? 'READ');
    const authMethod = String(body.auth_method ?? '');
    const tenantId = (body.tenant_id as string | null) || null;
    const facilityId = (body.facility_id as string | null) || null;
    const dataClasses = Array.isArray(body.data_classes) ? (body.data_classes as string[]).map(String) : [];

    if (!connectorId || displayName.length < 3 || !ENVIRONMENTS.has(environment) || !DIRECTIONS.has(direction)) {
      return json(400, { error_code: 'invalid_request', safe_message: 'Connector, name, environment and direction are required.', correlation_id: correlationId });
    }
    if ('credential' in body || 'secret' in body || 'password' in body || 'api_key' in body) {
      return json(400, { error_code: 'credential_not_accepted', safe_message: 'Credential material is never accepted by this endpoint.', correlation_id: correlationId });
    }

    const { data: definition } = await admin
      .from('connector_definitions')
      .select('*')
      .eq('id', connectorId)
      .maybeSingle();
    if (!definition) return json(404, { error_code: 'connector_not_found', correlation_id: correlationId });
    if (definition.implementation_status !== 'IMPLEMENTED' || !definition.runtime_adapter) {
      return json(400, { error_code: 'connector_not_instantiable', safe_message: 'This connector has no runtime adapter, so no connection can be created.', correlation_id: correlationId });
    }
    if (!definition.supported_auth_methods?.includes(authMethod)) {
      return json(400, { error_code: 'unsupported_auth_method', safe_message: 'This connector does not support the selected authentication method.', correlation_id: correlationId });
    }
    if (!(definition.supported_directions ?? []).some((d: string) => direction.includes(d))) {
      return json(400, { error_code: 'unsupported_direction', safe_message: 'This connector does not support the selected direction.', correlation_id: correlationId });
    }
    if (tenantId) {
      const { data: tenant } = await admin.from('organizations').select('id').eq('id', tenantId).maybeSingle();
      if (!tenant) return json(400, { error_code: 'tenant_not_found', safe_message: 'The selected tenant does not exist.', correlation_id: correlationId });
    }
    if (!tenantVisible(tenantId, callerTenantId)) {
      return json(403, { ...TENANT_FORBIDDEN, safe_message: 'A connection can only be created inside your own tenant.', correlation_id: correlationId });
    }
    if (facilityId) {
      const { data: facility } = await admin.from('data_centre_twins').select('id').eq('id', facilityId).maybeSingle();
      if (!facility) return json(400, { error_code: 'facility_not_found', safe_message: 'The selected facility does not exist.', correlation_id: correlationId });
    }

    const { data: created, error } = await admin
      .from('connection_instances')
      .insert({
        connector_id: connectorId,
        tenant_id: tenantId,
        facility_id: facilityId,
        environment,
        display_name: displayName,
        status: 'READY_TO_TEST',
        data_direction: direction,
        endpoint_reference: null,
        credential_reference: null,
        configuration: { data_classes: dataClasses, auth_method: authMethod, created_via: 'setup_wizard' },
        owner_id: user.id,
        created_by: user.id,
        is_system: false,
        enabled: false,
        status_reason: VAULT_FREE_AUTH.has(authMethod)
          ? 'Created by the setup wizard. No health check has been executed yet.'
          : 'Created by the setup wizard. A vault credential must be stored before this connection can authenticate.',
      })
      .select('*')
      .single();

    if (error) {
      const duplicate = error.code === '23505';
      return json(duplicate ? 409 : 400, {
        error_code: duplicate ? 'duplicate_connection' : 'insert_failed',
        safe_message: duplicate
          ? 'A connection with this connector, environment, scope and name already exists.'
          : error.message,
        correlation_id: correlationId,
      });
    }

    await audit({
      action: 'connection.created',
      connection_id: created.id,
      previous_state: null,
      new_state: 'READY_TO_TEST',
      facility_id: facilityId,
      tenant_id: tenantId,
      evidence: { connector_id: connectorId, environment, direction, auth_method: authMethod, data_classes: dataClasses },
    });

    return json(200, { connection: created, correlation_id: correlationId });
  }

  if (action === 'activate' || action === 'deactivate') {
    const connectionId = String(body.connection_id ?? '');
    if (!connectionId) return json(400, { error_code: 'invalid_request', correlation_id: correlationId });
    const { data: connection } = await admin.from('connection_instances').select('*').eq('id', connectionId).maybeSingle();
    if (!connection) return json(404, { error_code: 'not_found', correlation_id: correlationId });
    if (!tenantVisible(connection.tenant_id ?? null, callerTenantId)) {
      return json(403, { ...TENANT_FORBIDDEN, correlation_id: correlationId });
    }

    if (action === 'deactivate') {
      await admin.from('connection_instances').update({
        enabled: false,
        status: 'DISABLED',
        status_reason: 'Disabled by an administrator.',
      }).eq('id', connectionId);
      await audit({
        action: 'connection.deactivated',
        connection_id: connectionId,
        previous_state: connection.status,
        new_state: 'DISABLED',
        evidence: {},
      });
      return json(200, { status: 'DISABLED', correlation_id: correlationId });
    }

    const { data: lastCheck } = await admin
      .from('connection_health_checks')
      .select('status, data_availability, started_at')
      .eq('connection_id', connectionId)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastCheck || lastCheck.status !== 'PASSED') {
      return json(409, {
        error_code: 'activation_requires_passing_check',
        safe_message: 'Activation requires a passing server-side health check.',
        correlation_id: correlationId,
      });
    }

    const dataObserved = ['events_present', 'objects_present', 'application_records_present'].includes(
      String(lastCheck.data_availability ?? ''),
    );
    const newStatus = dataObserved ? 'HEALTHY' : 'CONNECTED_NO_DATA';
    await admin.from('connection_instances').update({
      enabled: true,
      status: newStatus,
      status_reason: dataObserved
        ? 'Last health check passed and data was observed.'
        : 'Endpoint reachable and authorised. No data received yet.',
    }).eq('id', connectionId);

    await audit({
      action: 'connection.activated',
      connection_id: connectionId,
      previous_state: connection.status,
      new_state: newStatus,
      evidence: { last_check: lastCheck.status, data_availability: lastCheck.data_availability },
    });

    return json(200, { status: newStatus, correlation_id: correlationId });
  }

  if (action === 'delete') {
    const connectionId = String(body.connection_id ?? '');
    if (!connectionId) return json(400, { error_code: 'invalid_request', correlation_id: correlationId });
    const { data: connection } = await admin.from('connection_instances').select('*').eq('id', connectionId).maybeSingle();
    if (!connection) return json(404, { error_code: 'not_found', correlation_id: correlationId });
    if (!tenantVisible(connection.tenant_id ?? null, callerTenantId)) {
      return json(403, { ...TENANT_FORBIDDEN, correlation_id: correlationId });
    }
    if (connection.is_system) {
      return json(403, { error_code: 'system_connection', safe_message: 'System connections cannot be removed.', correlation_id: correlationId });
    }
    await audit({
      action: 'connection.deleted',
      connection_id: connectionId,
      previous_state: connection.status,
      new_state: 'DELETED',
      evidence: { display_name: connection.display_name },
    });
    const { error } = await admin.from('connection_instances').delete().eq('id', connectionId);
    if (error) return json(400, { error_code: 'delete_failed', safe_message: error.message, correlation_id: correlationId });
    return json(200, { deleted: true, correlation_id: correlationId });
  }

  return json(400, { error_code: 'unknown_action', correlation_id: correlationId });
});
