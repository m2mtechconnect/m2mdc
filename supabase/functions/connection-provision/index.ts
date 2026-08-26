/**
 * Server-side provisioning for the AURA Connections control plane.
 *
 * Rules (do not relax without review):
 *   - Caller must present a valid session JWT, an active organization and an
 *     organization-scoped owner/admin grant.
 *   - Tenant identity is derived server-side from active_org_id(). A caller
 *     supplied tenant id is ignored and never confers authority.
 *   - Only connectors with IMPLEMENTED status and a runtime adapter may be
 *     instantiated.
 *   - No credential material is accepted, stored or echoed here.
 *   - Endpoint targets are server-owned; the caller never supplies a URL.
 *   - Activation requires a persisted PASSED health check.
 *   - Every transition writes a tenant-scoped audit event.
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
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json(401, { error_code: 'unauthorized', correlation_id: correlationId });
  }

  const caller = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: authData, error: authError } = await caller.auth.getUser();
  const user = authData?.user;
  if (authError || !user) return json(401, { error_code: 'unauthorized', correlation_id: correlationId });

  const callerTenantId = await resolveCallerTenant(caller);
  if (!callerTenantId) return json(403, { ...TENANT_REQUIRED, correlation_id: correlationId });

  const canManage = await callerHasOrgRole(caller, user.id, callerTenantId, CONNECTION_ADMIN_ROLES);
  if (!canManage) {
    return json(403, {
      error_code: 'forbidden',
      safe_message: 'Organization owner or administrator permission is required.',
      correlation_id: correlationId,
    });
  }

  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error_code: 'invalid_request', correlation_id: correlationId });
  }
  const action = String(body.action ?? '');

  async function audit(fields: Record<string, unknown>) {
    await admin.from('connection_audit_events').insert({
      actor_id: user.id,
      correlation_id: correlationId,
      ...fields,
      tenant_id: callerTenantId,
    });
  }

  if (action === 'create') {
    const connectorId = String(body.connector_id ?? '');
    const displayName = String(body.display_name ?? '').trim();
    const environment = String(body.environment ?? '');
    const direction = String(body.data_direction ?? 'READ');
    const authMethod = String(body.auth_method ?? '');
    const facilityId = typeof body.facility_id === 'string' && body.facility_id ? body.facility_id : null;
    const dataClasses = Array.isArray(body.data_classes) ? (body.data_classes as unknown[]).map(String) : [];

    if (!connectorId || displayName.length < 3 || !ENVIRONMENTS.has(environment) || !DIRECTIONS.has(direction)) {
      return json(400, {
        error_code: 'invalid_request',
        safe_message: 'Connector, name, environment and direction are required.',
        correlation_id: correlationId,
      });
    }
    if ('credential' in body || 'secret' in body || 'password' in body || 'api_key' in body) {
      return json(400, {
        error_code: 'credential_not_accepted',
        safe_message: 'Credential material is never accepted by this endpoint.',
        correlation_id: correlationId,
      });
    }

    const { data: definition } = await admin
      .from('connector_definitions')
      .select('*')
      .eq('id', connectorId)
      .maybeSingle();
    if (!definition) return json(404, { error_code: 'connector_not_found', correlation_id: correlationId });
    if (definition.implementation_status !== 'IMPLEMENTED' || !definition.runtime_adapter) {
      return json(400, {
        error_code: 'connector_not_instantiable',
        safe_message: 'This connector has no runtime adapter, so no connection can be created.',
        correlation_id: correlationId,
      });
    }
    if (!definition.supported_auth_methods?.includes(authMethod)) {
      return json(400, {
        error_code: 'unsupported_auth_method',
        safe_message: 'This connector does not support the selected authentication method.',
        correlation_id: correlationId,
      });
    }
    if (!(definition.supported_directions ?? []).some((d: string) => direction.includes(d))) {
      return json(400, {
        error_code: 'unsupported_direction',
        safe_message: 'This connector does not support the selected direction.',
        correlation_id: correlationId,
      });
    }

    if (facilityId) {
      const { data: facility } = await admin
        .from('data_centre_twins')
        .select('id, org_id, metadata')
        .eq('id', facilityId)
        .maybeSingle();
      if (!facility) {
        return json(400, {
          error_code: 'facility_not_found',
          safe_message: 'The selected facility does not exist.',
          correlation_id: correlationId,
        });
      }
      if (facility.org_id !== callerTenantId) {
        return json(403, {
          error_code: 'facility_scope_violation',
          safe_message: 'A connection can only target a facility in your active organization.',
          correlation_id: correlationId,
        });
      }
      if (facility.metadata?.provisioned === 'default_starter_twin') {
        return json(400, {
          error_code: 'placeholder_facility_not_allowed',
          safe_message: 'Legacy starter facilities cannot be used for a connection.',
          correlation_id: correlationId,
        });
      }
    }

    const { data: created, error } = await admin
      .from('connection_instances')
      .insert({
        connector_id: connectorId,
        tenant_id: callerTenantId,
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
        status_reason: 'Disabled by an organization administrator.',
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
        ? 'Last health check passed and connection-scoped data was observed.'
        : 'Endpoint reachable and authorized. No connection-scoped data has been proven yet.',
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
      return json(403, {
        error_code: 'system_connection',
        safe_message: 'System connections cannot be removed.',
        correlation_id: correlationId,
      });
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
