/**
 * Completes an AURA Managed User Connection. Exchanges the one-time code for
 * the opaque per-user handle, stores it encrypted, and records a tenant-scoped
 * non-secret evidence record. No token ever reaches the browser.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { exchangeAppUserOAuthCode } from '../_shared/appUserConnector.ts';
import { saveConnectionKeyForUser } from '../_shared/appUserConnections.ts';
import { managedUserBinding } from '../_shared/managedUserBindings.ts';
import { resolveCallerTenant } from '../_shared/connectionTenant.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import {
  managedConnectorGatewayPolicy,
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

  let body: { code?: unknown; connector_definition_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error_code: 'invalid_request', correlation_id: correlationId });
  }
  const code = typeof body.code === 'string' && body.code.length > 0 && body.code.length < 4096 ? body.code : '';
  const definitionId = typeof body.connector_definition_id === 'string' ? body.connector_definition_id : '';
  const binding = managedUserBinding(definitionId);
  if (!code || !binding) return json(400, { error_code: 'invalid_request', correlation_id: correlationId });

  const gateway = managedConnectorGatewayPolicy();
  if (!gateway.runtimeAllowed || !gateway.gatewayBaseUrl) {
    const tenantId = await resolveCallerTenant(admin, user.id);
    await admin.from('connection_audit_events').insert({
      actor_id: user.id,
      tenant_id: tenantId,
      action: 'managed_user_connection.exchange_blocked',
      new_state: 'BLOCKED_WHITE_LABEL_POLICY',
      evidence: { connector_definition_id: definitionId, reason_code: gateway.reason },
      correlation_id: correlationId,
    });
    const blocked = whiteLabelBlockedResponse(gateway.reason);
    return json(503, { ...blocked, correlation_id: correlationId });
  }

  let exchanged: { connectionAPIKey: string; connectorId: string };
  try {
    exchanged = await exchangeAppUserOAuthCode(gateway.gatewayBaseUrl, code);
  } catch (_error) {
    return json(502, {
      error_code: 'managed_authorization_exchange_failed',
      safe_message: 'The authorization could not be completed.',
      correlation_id: correlationId,
    });
  }
  if (exchanged.connectorId !== binding.gateway_connector_key) {
    return json(400, { error_code: 'connector_mismatch', correlation_id: correlationId });
  }

  try {
    await saveConnectionKeyForUser(user.id, exchanged.connectorId, exchanged.connectionAPIKey);
  } catch (_error) {
    return json(500, {
      error_code: 'managed_credential_store_failed',
      safe_message: 'The connection could not be stored securely, so it was not activated.',
      correlation_id: correlationId,
    });
  }

  const tenantId = await resolveCallerTenant(admin, user.id);
  const now = new Date().toISOString();
  await admin.from('managed_user_connections').upsert(
    {
      user_id: user.id,
      tenant_id: tenantId,
      connector_definition_id: definitionId,
      binding_class: 'MANAGED_USER',
      status: 'CONNECTED_NO_DATA',
      granted_scopes: binding.scopes,
      provider_account_label: null,
      consented_at: now,
      revoked_at: null,
      correlation_id: correlationId,
      updated_at: now,
    },
    { onConflict: 'user_id,connector_definition_id' },
  );

  await admin.from('connection_audit_events').insert({
    actor_id: user.id,
    tenant_id: tenantId,
    action: 'managed_user_connection.authorized',
    previous_state: 'AWAITING_USER_AUTHORIZATION',
    new_state: 'CONNECTED_NO_DATA',
    evidence: { connector_definition_id: definitionId, granted_scopes: binding.scopes },
    correlation_id: correlationId,
  });

  return json(200, { ok: true, status: 'CONNECTED_NO_DATA', correlation_id: correlationId });
});
