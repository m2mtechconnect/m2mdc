/**
 * Revokes the caller's own AURA Managed User Connection: the gateway
 * connection is destroyed, the encrypted handle is deleted and the evidence
 * record is marked revoked. Fails closed.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { disconnectAppUser } from '../_shared/appUserConnector.ts';
import { deleteConnectionKeyForUser, getConnectionKeyForUser } from '../_shared/appUserConnections.ts';
import { managedUserBinding } from '../_shared/managedUserBindings.ts';
import { resolveCallerTenant } from '../_shared/connectionTenant.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import {
  managedUserOAuthGatewayPolicy,
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

Deno.serve(async (req) => {
  CORS = { ...getCorsHeaders(req.headers.get('origin')), ...CORS_EXTRA };
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const correlationId = crypto.randomUUID();

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json(401, { error_code: 'unauthorized', correlation_id: correlationId });
  const { data: userData } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
  const user = userData?.user;
  if (!user) return json(401, { error_code: 'unauthorized', correlation_id: correlationId });

  let body: { connector_definition_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error_code: 'invalid_request', correlation_id: correlationId });
  }
  const definitionId = typeof body.connector_definition_id === 'string' ? body.connector_definition_id : '';
  const binding = managedUserBinding(definitionId);
  if (!binding) return json(400, { error_code: 'invalid_request', correlation_id: correlationId });

  const connectionAPIKey = await getConnectionKeyForUser(user.id, binding.gateway_connector_key).catch(() => null);
  if (connectionAPIKey) {
    const gateway = managedUserOAuthGatewayPolicy();
    if (!gateway.runtimeAllowed || !gateway.gatewayBaseUrl) {
      const tenantId = await resolveCallerTenant(admin, user.id);
      await admin.from('connection_audit_events').insert({
        actor_id: user.id,
        tenant_id: tenantId,
        action: 'managed_user_connection.revoke_blocked',
        new_state: 'BLOCKED_WHITE_LABEL_POLICY',
        evidence: { connector_definition_id: definitionId, reason_code: gateway.reason },
        correlation_id: correlationId,
      });
      const blocked = whiteLabelBlockedResponse(gateway.reason);
      return json(503, { ...blocked, correlation_id: correlationId });
    }

    try {
      await disconnectAppUser({
        gatewayBaseUrl: gateway.gatewayBaseUrl,
        connectionAPIKey,
        connectorId: binding.gateway_connector_key,
      });
    } catch (_error) {
      return json(502, {
        error_code: 'managed_disconnect_failed',
        safe_message: 'The connection could not be revoked at the authorization service. It remains active.',
        correlation_id: correlationId,
      });
    }
    await deleteConnectionKeyForUser(user.id, binding.gateway_connector_key);
  }

  const tenantId = await resolveCallerTenant(admin, user.id);
  const now = new Date().toISOString();
  await admin
    .from('managed_user_connections')
    .update({ status: 'REVOKED', revoked_at: now, granted_scopes: [], updated_at: now })
    .eq('user_id', user.id)
    .eq('connector_definition_id', definitionId);

  await admin.from('connection_audit_events').insert({
    actor_id: user.id,
    tenant_id: tenantId,
    action: 'managed_user_connection.revoked',
    previous_state: 'CONNECTED_NO_DATA',
    new_state: 'REVOKED',
    evidence: { connector_definition_id: definitionId },
    correlation_id: correlationId,
  });

  return json(200, { ok: true, status: 'REVOKED', correlation_id: correlationId });
});
