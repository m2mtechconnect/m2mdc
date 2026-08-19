/**
 * AURA canary deployment gate.
 *
 * One-click canary for the MQTT ingest worker. The gate is fail-closed:
 * runtime resources (connection_runtime_workers) are created or updated ONLY
 * when every authorization precondition is satisfied server-side. When any
 * precondition fails, nothing is created and the exact blocker codes are
 * recorded as a connection_audit_events row so the readiness panel can show
 * a truthful, evidence-backed reason.
 *
 * No credential material is accepted, echoed or logged here.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveCallerTenant, tenantVisible } from '../_shared/connectionTenant.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

// Scoped CORS: origin is resolved per request from the shared allowlist;
// the method/header allowances below are specific to this function.
const CORS_EXTRA: Record<string, string> = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
let CORS: Record<string, string> = { ...getCorsHeaders(null), ...CORS_EXTRA };

const LANES = new Set(['aws', 'brev']);

interface Blocker {
  code: string;
  detail: string;
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

function env(name: string): string | null {
  const value = Deno.env.get(name);
  return value && value.trim().length > 0 ? value.trim() : null;
}

/** Authorization and budget preconditions for the requested lane. */
function laneBlockers(lane: string): Blocker[] {
  const blockers: Blocker[] = [];

  if (lane === 'aws') {
    if (!env('AWS_ACCESS_KEY_ID') || !env('AWS_SECRET_ACCESS_KEY')) {
      blockers.push({ code: 'AWS_NOT_AUTHENTICATED', detail: 'No usable AWS credential pair is injected for this environment.' });
    }
    if (!env('AWS_REGION')) {
      blockers.push({ code: 'AWS_REGION_UNSET', detail: 'AWS_REGION is not configured, so no deployment target exists.' });
    }
  } else {
    if (!env('BREV_API_TOKEN')) {
      blockers.push({ code: 'BREV_NOT_AUTHENTICATED', detail: 'No Brev API token or organisation authorization is available.' });
    }
    if (!env('BREV_ORG_ID')) {
      blockers.push({ code: 'BREV_ORG_UNSET', detail: 'BREV_ORG_ID is not configured, so no Brev instance target exists.' });
    }
  }

  if (!env('CANARY_SPEND_APPROVAL_REFERENCE')) {
    blockers.push({ code: 'NO_SPEND_AUTHORIZATION', detail: 'No budget ceiling or owner approval reference has been recorded for cloud spend.' });
  }
  if (!env('CANARY_WORKER_IMAGE_DIGEST')) {
    blockers.push({ code: 'NO_WORKER_IMAGE', detail: 'No published worker container image digest is registered for the canary.' });
  }
  return blockers;
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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error_code: 'invalid_request', correlation_id: correlationId });
  }

  const lane = String(body.lane ?? '').toLowerCase();
  const connectionId = String(body.connection_id ?? '');
  if (!LANES.has(lane)) return json(400, { error_code: 'invalid_lane', correlation_id: correlationId });
  if (!connectionId) return json(400, { error_code: 'connection_required', correlation_id: correlationId });

  const callerTenantId = await resolveCallerTenant(admin, user.id);

  const { data: connection } = await admin
    .from('connection_instances')
    .select('id, display_name, tenant_id, lifecycle_state')
    .eq('id', connectionId)
    .maybeSingle();
  if (!connection) return json(404, { error_code: 'connection_not_found', correlation_id: correlationId });
  if (!tenantVisible(connection.tenant_id, callerTenantId)) {
    return json(403, { error_code: 'forbidden', safe_message: 'Connection belongs to another tenant.', correlation_id: correlationId });
  }

  const blockers = laneBlockers(lane);

  // Canary readiness of the connection itself: an active mapping and a vaulted
  // credential must exist before any worker may be started.
  const { count: mappingCount } = await admin
    .from('connection_twin_mappings')
    .select('id', { count: 'exact', head: true })
    .eq('connection_id', connectionId)
    .eq('active', true);
  if (!mappingCount) {
    blockers.push({ code: 'NO_ACTIVE_MAPPING', detail: 'The connection has no active signal-to-twin mapping.' });
  }

  const { count: credentialCount } = await admin
    .from('connection_credentials')
    .select('id', { count: 'exact', head: true })
    .eq('connection_id', connectionId)
    .eq('status', 'ACTIVE');
  if (!credentialCount) {
    blockers.push({ code: 'NO_VAULTED_CREDENTIAL', detail: 'The connection has no active vaulted credential.' });
  }

  const approvalReference = env('CANARY_SPEND_APPROVAL_REFERENCE');

  if (blockers.length > 0) {
    // Fail closed: record the blocker, create and update nothing.
    await admin.from('connection_audit_events').insert({
      actor_id: user.id,
      action: 'CANARY_DEPLOY_BLOCKED',
      connection_id: connectionId,
      tenant_id: connection.tenant_id,
      correlation_id: correlationId,
      evidence: { lane, blockers, resources_changed: false },
    });
    return json(409, {
      status: 'BLOCKED',
      lane,
      blockers,
      resources_changed: false,
      correlation_id: correlationId,
    });
  }

  const workerId = `canary-${lane}-${connectionId}`;
  const { data: worker, error: workerError } = await admin
    .from('connection_runtime_workers')
    .upsert(
      {
        worker_id: workerId,
        runtime: lane,
        connection_id: connectionId,
        tenant_id: connection.tenant_id,
        state: 'STARTING',
        protocol: 'mqtt',
        evidence_class: 'TEST_EVIDENCE',
        last_error: null,
        stopped_at: null,
        last_heartbeat_at: new Date().toISOString(),
      },
      { onConflict: 'worker_id' },
    )
    .select('id, worker_id, state')
    .single();

  if (workerError) {
    await admin.from('connection_audit_events').insert({
      actor_id: user.id,
      action: 'CANARY_DEPLOY_FAILED',
      connection_id: connectionId,
      tenant_id: connection.tenant_id,
      correlation_id: correlationId,
      evidence: { lane, error: workerError.message, resources_changed: false },
    });
    return json(500, { status: 'FAILED', lane, error_code: 'worker_write_failed', correlation_id: correlationId });
  }

  await admin.from('connection_audit_events').insert({
    actor_id: user.id,
    action: 'CANARY_DEPLOY_AUTHORIZED',
    connection_id: connectionId,
    tenant_id: connection.tenant_id,
    approval_reference: approvalReference,
    new_state: 'STARTING',
    correlation_id: correlationId,
    evidence: { lane, worker_id: workerId, image_digest: env('CANARY_WORKER_IMAGE_DIGEST'), resources_changed: true },
  });

  return json(200, {
    status: 'AUTHORIZED',
    lane,
    worker,
    approval_reference: approvalReference,
    resources_changed: true,
    correlation_id: correlationId,
  });
});
