/**
 * Starts an AURA Managed User Connection authorization for the signed-in user.
 * Returns only a provider authorization URL - never a token, credential name,
 * handle, or implementation gateway URL.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorizeAppUserOAuth } from '../_shared/appUserConnector.ts';
import { getConnectionKeyForUser } from '../_shared/appUserConnections.ts';
import { managedUserBinding } from '../_shared/managedUserBindings.ts';
import { resolveCallerTenant } from '../_shared/connectionTenant.ts';
import { evaluateCorsOrigin, getCorsHeaders } from '../_shared/cors.ts';
import {
  authorizationUrlIsDemoProviderSafe,
  authorizationUrlIsWhiteLabelSafe,
  demoManagedOAuthEnabled,
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
  const requestOrigin = req.headers.get('origin');
  const originDecision = evaluateCorsOrigin(requestOrigin, {}, true);
  CORS = { ...originDecision.headers, ...CORS_EXTRA };
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: originDecision.allowed ? 204 : 403, headers: CORS });
  }
  if (req.method !== 'POST') return json(405, { error_code: 'method_not_allowed' });
  if (!originDecision.allowed || !originDecision.origin) {
    return json(403, { error_code: 'origin_not_allowed' });
  }

  const correlationId = crypto.randomUUID();
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json(401, { error_code: 'unauthorized', correlation_id: correlationId });
  const { data: userData } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
  const user = userData?.user;
  if (!user) return json(401, { error_code: 'unauthorized', correlation_id: correlationId });

  let body: { connector_definition_id?: unknown; origin?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error_code: 'invalid_request', correlation_id: correlationId });
  }
  const definitionId = typeof body.connector_definition_id === 'string' ? body.connector_definition_id : '';
  const requestedOrigin = typeof body.origin === 'string' ? body.origin : '';
  if (!definitionId || requestedOrigin !== originDecision.origin) {
    return json(400, {
      error_code: requestedOrigin ? 'origin_mismatch' : 'invalid_request',
      safe_message: 'The authorization return origin did not match the approved AURA origin.',
      correlation_id: correlationId,
    });
  }

  const binding = managedUserBinding(definitionId);
  if (!binding) {
    return json(400, {
      error_code: 'connector_not_user_bindable',
      safe_message: 'This connector is not an AURA Managed User Connection.',
      correlation_id: correlationId,
    });
  }

  const gateway = managedUserOAuthGatewayPolicy();
  if (!gateway.runtimeAllowed || !gateway.gatewayBaseUrl) {
    const blocked = whiteLabelBlockedResponse(gateway.reason);
    return json(503, { ...blocked, correlation_id: correlationId });
  }

  const clientAPIKey = Deno.env.get(binding.client_api_key_env);
  if (!clientAPIKey) {
    return json(503, {
      error_code: 'managed_client_not_configured',
      safe_message:
        'No AURA managed connector client is configured for this connector, so no user can authorize it yet. An administrator must configure it first.',
      correlation_id: correlationId,
    });
  }

  const tenantId = await resolveCallerTenant(admin, user.id);
  let connectionAPIKey: string | null = null;
  try {
    connectionAPIKey = await getConnectionKeyForUser(user.id, binding.gateway_connector_key);
  } catch {
    connectionAPIKey = null;
  }

  let authorizationUrl: string;
  try {
    const started = await authorizeAppUserOAuth({
      gatewayBaseUrl: gateway.gatewayBaseUrl,
      connectorId: binding.gateway_connector_key,
      appUserId: user.id,
      clientAPIKey,
      returnUrl: new URL('/oauth/managed-user/return', originDecision.origin).toString(),
      connectionAPIKey: connectionAPIKey ?? undefined,
      credentialsConfiguration: { scopes: binding.scopes },
    });
    authorizationUrl = started.authorizationUrl;
  } catch (_error) {
    return json(502, {
      error_code: 'managed_authorization_unavailable',
      safe_message: 'The authorization service could not start this connection.',
      correlation_id: correlationId,
    });
  }

  const demoAuthorization = gateway.reason === 'DEMO_MANAGED_OAUTH_ALLOWED' && demoManagedOAuthEnabled();
  const authorizationAllowed = demoAuthorization
    ? authorizationUrlIsDemoProviderSafe(authorizationUrl, binding.authorization_hosts)
    : authorizationUrlIsWhiteLabelSafe(authorizationUrl);

  if (!authorizationAllowed) {
    await admin.from('connection_audit_events').insert({
      actor_id: user.id,
      tenant_id: tenantId,
      action: 'managed_user_connection.authorization_blocked',
      new_state: 'BLOCKED_WHITE_LABEL_POLICY',
      evidence: { connector_definition_id: definitionId, reason_code: 'authorization_url_not_approved' },
      correlation_id: correlationId,
    });
    return json(503, {
      error_code: 'authorization_url_not_approved',
      safe_message: 'This authorization path is not approved for the AURA runtime.',
      correlation_id: correlationId,
    });
  }

  await admin.from('managed_user_connections').upsert(
    {
      user_id: user.id,
      tenant_id: tenantId,
      connector_definition_id: definitionId,
      binding_class: 'MANAGED_USER',
      status: 'AWAITING_USER_AUTHORIZATION',
      granted_scopes: [],
      correlation_id: correlationId,
      revoked_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,connector_definition_id' },
  );

  await admin.from('connection_audit_events').insert({
    actor_id: user.id,
    tenant_id: tenantId,
    action: 'managed_user_connection.authorization_started',
    new_state: 'AWAITING_USER_AUTHORIZATION',
    evidence: {
      connector_definition_id: definitionId,
      authorization_mode: demoAuthorization ? 'DEMO_PROVIDER_OAUTH' : 'AURA_GATEWAY_OAUTH',
    },
    correlation_id: correlationId,
  });

  return json(200, { authorization_url: authorizationUrl, correlation_id: correlationId });
});
