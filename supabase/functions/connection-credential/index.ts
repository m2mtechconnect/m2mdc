/**
 * Credential vault control plane for AURA connections.
 *
 * Rules (do not relax without review):
 *   - Caller must present a valid session JWT, active organization and an
 *     organization-scoped owner/admin grant.
 *   - Every action is checked against the exact active organization before a
 *     service-role client touches credential metadata or material.
 *   - Plaintext credential material travels one way only: into this function.
 *     No action returns, logs or echoes it.
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
import {
  credentialRejectionReason,
  encryptCredential,
  fingerprintCredential,
} from '../_shared/credentialVault.ts';

const CORS_EXTRA: Record<string, string> = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
let CORS: Record<string, string> = { ...getCorsHeaders(null), ...CORS_EXTRA };

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

interface CredentialRow {
  connection_id: string;
  auth_method: string;
  fingerprint: string;
  version: number;
  status: string;
  expires_at: string | null;
  last_rotated_at: string;
  created_at: string;
}

function metadata(row: CredentialRow) {
  return {
    connection_id: row.connection_id,
    auth_method: row.auth_method,
    fingerprint: row.fingerprint,
    version: row.version,
    status: row.status,
    expires_at: row.expires_at,
    last_rotated_at: row.last_rotated_at,
    created_at: row.created_at,
  };
}

Deno.serve(async (req) => {
  CORS = { ...getCorsHeaders(req.headers.get('origin')), ...CORS_EXTRA };
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json(405, { error_code: 'method_not_allowed' });

  const correlationId = crypto.randomUUID();
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

  if (!Deno.env.get('CONNECTION_CREDENTIAL_KEY')) {
    return json(503, {
      error_code: 'vault_key_missing',
      safe_message: 'The credential vault encryption key is not configured on the server.',
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

  if (action === 'list') {
    const { data: connections } = await admin
      .from('connection_instances')
      .select('id')
      .eq('tenant_id', callerTenantId);
    const visibleIds = (connections ?? []).map((connection: { id: string }) => connection.id);
    if (visibleIds.length === 0) return json(200, { credentials: [], correlation_id: correlationId });
    const { data: rows } = await admin
      .from('connection_credentials')
      .select('connection_id, auth_method, fingerprint, version, status, expires_at, last_rotated_at, created_at')
      .in('connection_id', visibleIds);
    return json(200, { credentials: (rows ?? []).map(metadata), correlation_id: correlationId });
  }

  const connectionId = String(body.connection_id ?? '');
  if (!connectionId) return json(400, { error_code: 'invalid_request', correlation_id: correlationId });

  const { data: connection } = await admin
    .from('connection_instances')
    .select('id, tenant_id, display_name, status, configuration, credential_reference')
    .eq('id', connectionId)
    .maybeSingle();
  if (!connection) return json(404, { error_code: 'not_found', correlation_id: correlationId });
  if (!tenantVisible(connection.tenant_id ?? null, callerTenantId)) {
    return json(403, { ...TENANT_FORBIDDEN, correlation_id: correlationId });
  }

  const { data: existing } = await admin
    .from('connection_credentials')
    .select('*')
    .eq('connection_id', connectionId)
    .maybeSingle();

  async function history(fields: { action: string; version: number; fingerprint: string | null }) {
    await admin.from('connection_credential_events').insert({
      connection_id: connectionId,
      tenant_id: callerTenantId,
      actor_id: user.id,
      correlation_id: correlationId,
      ...fields,
    });
    await admin.from('connection_audit_events').insert({
      actor_id: user.id,
      correlation_id: correlationId,
      action: `credential.${fields.action}`,
      connection_id: connectionId,
      tenant_id: callerTenantId,
      previous_state: existing ? `v${existing.version}` : null,
      new_state: `v${fields.version}`,
      evidence: { fingerprint: fields.fingerprint },
    });
  }

  if (action === 'status') {
    return json(200, {
      credential: existing ? metadata(existing as CredentialRow) : null,
      correlation_id: correlationId,
    });
  }

  if (action === 'store' || action === 'rotate') {
    const secret = typeof body.secret === 'string' ? body.secret : '';
    const authMethod = String(body.auth_method ?? existing?.auth_method ?? connection.configuration?.auth_method ?? '');
    if (!authMethod) {
      return json(400, {
        error_code: 'auth_method_required',
        safe_message: 'The authentication method must be known before a credential is stored.',
        correlation_id: correlationId,
      });
    }
    const rejection = credentialRejectionReason(secret);
    if (rejection) {
      return json(400, { error_code: 'credential_rejected', safe_message: rejection, correlation_id: correlationId });
    }
    if (action === 'rotate' && !existing) {
      return json(409, {
        error_code: 'nothing_to_rotate',
        safe_message: 'No credential is stored for this connection yet.',
        correlation_id: correlationId,
      });
    }

    const fingerprint = await fingerprintCredential(secret.trim());
    if (action === 'rotate' && existing && existing.fingerprint === fingerprint) {
      return json(409, {
        error_code: 'credential_unchanged',
        safe_message: 'The new credential is identical to the current one. Rotation requires a different value.',
        correlation_id: correlationId,
      });
    }

    const ciphertext = await encryptCredential(secret.trim());
    const expiresAt = typeof body.expires_at === 'string' && body.expires_at ? body.expires_at : null;
    const nextVersion = existing ? existing.version + 1 : 1;
    const payload = {
      connection_id: connectionId,
      tenant_id: callerTenantId,
      auth_method: authMethod,
      ciphertext,
      fingerprint,
      version: nextVersion,
      status: 'ACTIVE',
      expires_at: expiresAt,
      last_rotated_at: new Date().toISOString(),
      rotated_by: user.id,
      created_by: existing?.created_by ?? user.id,
    };

    const { data: saved, error } = await admin
      .from('connection_credentials')
      .upsert(payload, { onConflict: 'connection_id' })
      .select('connection_id, auth_method, fingerprint, version, status, expires_at, last_rotated_at, created_at')
      .single();
    if (error) {
      return json(400, { error_code: 'vault_write_failed', safe_message: error.message, correlation_id: correlationId });
    }

    await admin
      .from('connection_instances')
      .update({ credential_reference: `vault:${connectionId}#v${nextVersion}` })
      .eq('id', connectionId)
      .eq('tenant_id', callerTenantId);

    await history({ action: existing ? 'rotated' : 'stored', version: nextVersion, fingerprint });
    return json(200, { credential: metadata(saved as CredentialRow), correlation_id: correlationId });
  }

  if (action === 'revoke') {
    if (!existing) {
      return json(404, {
        error_code: 'nothing_to_revoke',
        safe_message: 'No credential is stored for this connection.',
        correlation_id: correlationId,
      });
    }
    const { error } = await admin.from('connection_credentials').delete().eq('connection_id', connectionId);
    if (error) return json(400, { error_code: 'vault_delete_failed', safe_message: error.message, correlation_id: correlationId });

    await admin
      .from('connection_instances')
      .update({
        credential_reference: null,
        enabled: false,
        status: 'DISABLED',
        status_reason: 'Credential revoked. The connection cannot authenticate until a new credential is stored.',
      })
      .eq('id', connectionId)
      .eq('tenant_id', callerTenantId);

    await history({ action: 'revoked', version: existing.version, fingerprint: existing.fingerprint });
    return json(200, { credential: null, revoked: true, correlation_id: correlationId });
  }

  return json(400, { error_code: 'unknown_action', correlation_id: correlationId });
});
