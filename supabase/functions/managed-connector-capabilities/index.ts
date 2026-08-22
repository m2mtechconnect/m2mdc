/**
 * Returns the verified managed connector capability inventory for the caller's
 * tenant. The response is customer-facing, so it carries AURA terminology and
 * eligibility evidence only - never a gateway transport key, credential name
 * or underlying platform vendor name.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { MANAGED_CONNECTOR_MANIFEST, isRuntimeSelectable } from '../_shared/managedConnectorManifest.ts';
import { resolveCallerTenant } from '../_shared/connectionTenant.ts';
import { isManagedUserClientConfigured, managedUserBinding } from '../_shared/managedUserBindings.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { managedConnectorGatewayPolicy, managedUserOAuthGatewayPolicy } from '../_shared/whiteLabelGateway.ts';

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

  const tenantId = await resolveCallerTenant(admin, user.id);
  const { data: roleRows } = await admin.from('user_roles').select('role').eq('user_id', user.id);
  const roles = (roleRows ?? []).map((r: { role: string }) => r.role);
  const sharedGatewayPolicy = managedConnectorGatewayPolicy();
  const userOAuthPolicy = managedUserOAuthGatewayPolicy();

  const { data: userConnections } = await admin
    .from('managed_user_connections')
    .select('connector_definition_id, status, granted_scopes, provider_account_label, consented_at, last_success_at, revoked_at')
    .eq('user_id', user.id);

  const entries = MANAGED_CONNECTOR_MANIFEST.map((entry) => {
    const userBinding = (userConnections ?? []).find(
      (c: { connector_definition_id: string }) => c.connector_definition_id === entry.connector_definition_id,
    );
    const userBindingTransport = managedUserBinding(entry.connector_definition_id);
    const userClientConfigured = userBindingTransport ? isManagedUserClientConfigured(userBindingTransport) : false;
    const eligibility = userBindingTransport && userClientConfigured ? 'RUNTIME_USER_SUPPORTED' : entry.eligibility;
    const linkedToProject = entry.linked_to_project || userClientConfigured;
    const manifestSelectable = isRuntimeSelectable({ ...entry, eligibility, linked_to_project: linkedToProject });

    const gatewayPolicy = entry.connection_class === 'MANAGED_USER' ? userOAuthPolicy : sharedGatewayPolicy;
    const requiresManagedGateway = entry.connection_class === 'MANAGED_SHARED' || entry.connection_class === 'MANAGED_USER';
    const whiteLabelReady = !requiresManagedGateway || gatewayPolicy.runtimeAllowed;
    const whiteLabelReason = !whiteLabelReady
      ? gatewayPolicy.reason
      : gatewayPolicy.reason === 'DEMO_MANAGED_OAUTH_ALLOWED'
        ? 'DEMO_PROVIDER_OAUTH_READY'
        : 'AURA_RUNTIME_READY';

    return {
      connector_definition_id: entry.connector_definition_id,
      provider: entry.display_provider,
      connection_class: entry.connection_class,
      eligibility,
      linked_to_project: linkedToProject,
      runtime_selectable: manifestSelectable && whiteLabelReady,
      white_label_ready: whiteLabelReady,
      white_label_reason: whiteLabelReason,
      user_bindable: Boolean(userBindingTransport) && userClientConfigured && userOAuthPolicy.runtimeAllowed,
      user_client_configured: userClientConfigured,
      requested_scopes: userBindingTransport?.scopes ?? [],
      data_classes: entry.data_classes,
      operations: entry.supported_operations.map((op) => ({
        id: op.id,
        label: op.label,
        classification: op.classification,
        requires_approval: op.requires_approval || op.classification === 'WRITE',
        rate_limit_per_hour: op.rate_limit_per_hour,
        permitted_for_caller: op.allowed_roles.some((r) => roles.includes(r)),
      })),
      disclosure_limitations: entry.disclosure_limitations,
      native_required_reason: entry.native_required_reason,
      verified_at: entry.verified_at,
      evidence_note: entry.evidence_note,
      user_binding: userBinding ?? null,
    };
  });

  return json(200, {
    correlation_id: correlationId,
    tenant_id: tenantId,
    caller_roles: roles,
    white_label_policy: {
      strict: sharedGatewayPolicy.strict,
      managed_gateway_ready: sharedGatewayPolicy.runtimeAllowed,
      reason: sharedGatewayPolicy.reason,
    },
    entries,
  });
});
