// Phase 2.b DSX ingestion handler.
//
// Authentication sequence (never re-order without security review):
//   1. Bounded method + Authorization header shape.
//   2. Decode ONLY the protected JWT header (typ, alg, kid).
//   3. Select exactly one candidate public key from the locally
//      configured JWKS (DSX_GATEWAY_JWKS_JSON) by kid. RS256 pinned.
//   4. Verify signature + required claims (iss/aud/sub/iat/exp/nbf?)
//      with jose. Max lifetime 5m, clock tolerance 30s.
//   5. Resolve the connection server-side by verified `sub`, then
//      confirm status='active' and that the selected key's stable
//      `dsx_key_ref` equals dsx_connections.gateway_jwt_key_ref.
//   6. Only then read the byte-bounded body.
//   7. Parse through the canonical DSX contract (strict).
//   8. Call dsx_ingest_event RPC. Return sanitized decision.
//
// Missing / invalid gateway auth MUST fail before the body is read,
// parsed, quarantined, or stored. Responses never leak keys, alg,
// kid, connection ids, tenant ids, claim values, or Zod issues.

import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { jwtVerify, importJWK, decodeProtectedHeader } from 'jose';
import {
  parseDsxEvent,
  DEFAULT_FRESHNESS_BUDGET_MS,
} from '../_shared/dsx-contract.ts';

// ---------------------------------------------------------------------------
// Constants (pinned; do not read from configuration).
// ---------------------------------------------------------------------------
const PINNED_ALG = 'RS256' as const;
const MAX_JWT_LIFETIME_MS = 5 * 60_000;
const CLOCK_TOLERANCE_MS = 30_000;
const MAX_AUTH_HEADER_BYTES = 8_192;
const MAX_BODY_BYTES = 65_536;
const MIN_RSA_MODULUS_BITS = 2048;
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
void DEFAULT_FRESHNESS_BUDGET_MS;

// ---------------------------------------------------------------------------
// Sanitized response helpers. Public shape only.
// ---------------------------------------------------------------------------
type PublicError =
  | 'unauthorized'
  | 'invalid_request'
  | 'payload_too_large'
  | 'method_not_allowed'
  | 'unavailable';

function jsonResponse(
  status: number,
  body: Record<string, unknown>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function errorResponse(
  status: number,
  error: PublicError,
  requestId: string,
): Response {
  return jsonResponse(status, { ok: false, error, request_id: requestId });
}

// ---------------------------------------------------------------------------
// JWKS validation. Public keys only. RS256 only. Custom `dsx_key_ref`
// stable reference is required and must be unique per key entry.
// ---------------------------------------------------------------------------
interface AuraJwk {
  kty: 'RSA';
  kid: string;
  use: 'sig';
  alg: 'RS256';
  n: string;
  e: string;
  dsx_key_ref: string;
}

interface JwksIndex {
  byKid: Map<string, AuraJwk>;
}

const PRIVATE_JWK_MEMBERS = ['d', 'p', 'q', 'dp', 'dq', 'qi'] as const;

function base64UrlByteLength(s: string): number {
  // JWK n/e are base64url without padding.
  const clean = s.replace(/=+$/, '');
  const bytes = Math.floor((clean.length * 6) / 8);
  return bytes;
}

let cachedJwks: JwksIndex | null = null;
let cachedJwksSource: string | null = null;

function loadJwks(): JwksIndex {
  const raw = Deno.env.get('DSX_GATEWAY_JWKS_JSON');
  if (!raw) throw new Error('jwks_missing');
  if (cachedJwks && cachedJwksSource === raw) return cachedJwks;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('jwks_malformed');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('jwks_malformed');
  const keys = (parsed as { keys?: unknown }).keys;
  if (!Array.isArray(keys) || keys.length === 0) throw new Error('jwks_malformed');

  const byKid = new Map<string, AuraJwk>();
  for (const entry of keys) {
    if (!entry || typeof entry !== 'object') throw new Error('jwks_malformed');
    const k = entry as Record<string, unknown>;
    for (const priv of PRIVATE_JWK_MEMBERS) {
      if (priv in k) throw new Error('jwks_contains_private_material');
    }
    if (k.kty !== 'RSA') throw new Error('jwks_unsupported_kty');
    if (k.use !== 'sig') throw new Error('jwks_use_invalid');
    if (k.alg !== 'RS256') throw new Error('jwks_alg_invalid');
    if (typeof k.kid !== 'string' || k.kid.length === 0 || k.kid.length > 256) {
      throw new Error('jwks_kid_invalid');
    }
    if (typeof k.n !== 'string' || typeof k.e !== 'string') {
      throw new Error('jwks_malformed');
    }
    if (typeof k.dsx_key_ref !== 'string' || k.dsx_key_ref.length === 0 || k.dsx_key_ref.length > 256) {
      throw new Error('jwks_missing_dsx_key_ref');
    }
    const modBits = base64UrlByteLength(k.n) * 8;
    if (modBits < MIN_RSA_MODULUS_BITS) throw new Error('jwks_modulus_too_small');
    if (byKid.has(k.kid)) throw new Error('jwks_duplicate_kid');
    byKid.set(k.kid, {
      kty: 'RSA',
      kid: k.kid,
      use: 'sig',
      alg: 'RS256',
      n: k.n,
      e: k.e,
      dsx_key_ref: k.dsx_key_ref,
    });
  }
  cachedJwks = { byKid };
  cachedJwksSource = raw;
  return cachedJwks;
}

/** Reset cached JWKS state. Test-only escape hatch. */
export function __resetJwksCacheForTests(): void {
  cachedJwks = null;
  cachedJwksSource = null;
}

// ---------------------------------------------------------------------------
// Bounded body reader.
// ---------------------------------------------------------------------------
async function readBoundedBody(req: Request): Promise<Uint8Array | 'too_large'> {
  const ct = req.headers.get('content-type') || '';
  if (!ct.toLowerCase().startsWith('application/json')) {
    // Force content-type discipline; treat as invalid.
    // Caller will map to invalid_request.
    return new Uint8Array(0);
  }
  const contentLength = req.headers.get('content-length');
  if (contentLength) {
    const n = Number(contentLength);
    if (!Number.isFinite(n) || n < 0) return 'too_large';
    if (n > MAX_BODY_BYTES) return 'too_large';
  }
  const reader = req.body?.getReader();
  if (!reader) return new Uint8Array(0);
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        try { await reader.cancel(); } catch { /* ignore */ }
        return 'too_large';
      }
      chunks.push(value);
    }
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.byteLength; }
  return out;
}

// ---------------------------------------------------------------------------
// Authentication + verification.
// ---------------------------------------------------------------------------
interface VerifiedGatewayIdentity {
  sub: string;
  jwk: AuraJwk;
  jti?: string;
  iat: number;
  exp: number;
}

async function verifyGatewayJwt(
  token: string,
): Promise<VerifiedGatewayIdentity> {
  // 1. Decode protected header ONLY. Enforce typ/alg/kid presence.
  let header: ReturnType<typeof decodeProtectedHeader>;
  try {
    header = decodeProtectedHeader(token);
  } catch {
    throw new Error('auth_header_undecodable');
  }
  if (header.typ !== 'JWT') throw new Error('auth_typ_invalid');
  if (header.alg !== PINNED_ALG) throw new Error('auth_alg_invalid');
  if (typeof header.kid !== 'string' || header.kid.length === 0) {
    throw new Error('auth_kid_missing');
  }

  // 2. Select exactly one candidate key.
  const jwks = loadJwks();
  const candidate = jwks.byKid.get(header.kid);
  if (!candidate) throw new Error('auth_kid_unknown');

  const issuer = Deno.env.get('DSX_GATEWAY_JWT_ISSUER');
  const audience = Deno.env.get('DSX_GATEWAY_JWT_AUDIENCE');
  if (!issuer || !audience) throw new Error('auth_config_missing');

  const key = await importJWK({ ...candidate }, PINNED_ALG);

  // 3. jose verifies signature + iss + aud + exp + nbf + typ.
  const { payload, protectedHeader } = await jwtVerify(token, key, {
    algorithms: [PINNED_ALG],
    issuer,
    audience,
    typ: 'JWT',
    clockTolerance: Math.floor(CLOCK_TOLERANCE_MS / 1000),
    maxTokenAge: Math.floor(MAX_JWT_LIFETIME_MS / 1000),
  });
  // jose already validated alg via `algorithms`; guard again.
  if (protectedHeader.alg !== PINNED_ALG) throw new Error('auth_alg_invalid');

  const sub = payload.sub;
  const iat = payload.iat;
  const exp = payload.exp;
  if (typeof sub !== 'string' || sub.length === 0 || sub.length > 512) {
    throw new Error('auth_sub_invalid');
  }
  if (typeof iat !== 'number' || typeof exp !== 'number') {
    throw new Error('auth_time_claims_missing');
  }
  // Reject iat too far in future beyond tolerance.
  const nowSec = Math.floor(Date.now() / 1000);
  if (iat - nowSec > Math.floor(CLOCK_TOLERANCE_MS / 1000)) {
    throw new Error('auth_iat_future');
  }
  // Enforce max lifetime end-to-end (jose maxTokenAge is age-of-iat; also
  // require exp - iat <= max lifetime).
  if (exp - iat > Math.floor(MAX_JWT_LIFETIME_MS / 1000)) {
    throw new Error('auth_lifetime_exceeded');
  }

  return {
    sub,
    jwk: candidate,
    jti: typeof payload.jti === 'string' ? payload.jti : undefined,
    iat,
    exp,
  };
}

// ---------------------------------------------------------------------------
// Connection resolution. Server authority. Never trust envelope.
// ---------------------------------------------------------------------------
interface ResolvedConnection {
  id: string;
  org_id: string;
  twin_id: string;
  status: string;
  gateway_jwt_key_ref: string | null;
  allowed_source_subjects: string[];
}

function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('service_config_missing');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function resolveConnectionForSubject(
  sub: string,
): Promise<ResolvedConnection | 'not_found' | 'ambiguous'> {
  if (testAdapters.resolveConnectionForSubject) {
    return testAdapters.resolveConnectionForSubject(sub);
  }
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from('dsx_connections')
    .select('id, org_id, twin_id, status, gateway_jwt_key_ref, allowed_source_subjects')
    .contains('allowed_source_subjects', [sub])
    .limit(2);
  if (error) throw new Error('service_query_failed');
  if (!data || data.length === 0) return 'not_found';
  if (data.length > 1) return 'ambiguous';
  return data[0] as ResolvedConnection;
}

// Test-only injection points. Never referenced in production code paths
// unless a test explicitly sets them. Reset with __resetTestAdapters().
interface TestAdapters {
  resolveConnectionForSubject?: (
    sub: string,
  ) => Promise<ResolvedConnection | 'not_found' | 'ambiguous'>;
  invokeIngestRpc?: (
    args: Record<string, unknown>,
  ) => Promise<{ decision: string; reason_code?: string; event_pk?: string }>;
}
const testAdapters: TestAdapters = {};
export function __setTestAdapters(a: TestAdapters): void {
  Object.assign(testAdapters, a);
}
export function __resetTestAdapters(): void {
  for (const k of Object.keys(testAdapters)) delete (testAdapters as Record<string, unknown>)[k];
}

// ---------------------------------------------------------------------------
// Main handler.
// ---------------------------------------------------------------------------
export async function handleRequest(req: Request): Promise<Response> {
  const requestId =
    req.headers.get('x-request-id') ||
    (globalThis.crypto?.randomUUID?.() ?? String(Date.now()));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return errorResponse(405, 'method_not_allowed', requestId);
  }

  // 1. Bounded Authorization header shape.
  const authHeader = req.headers.get('authorization') || '';
  if (
    !authHeader ||
    authHeader.length > MAX_AUTH_HEADER_BYTES ||
    !/^Bearer [A-Za-z0-9._~+/=-]+$/.test(authHeader)
  ) {
    return errorResponse(401, 'unauthorized', requestId);
  }
  const token = authHeader.slice('Bearer '.length);

  // 2-5. Verify JWT before touching the body.
  let identity: VerifiedGatewayIdentity;
  try {
    identity = await verifyGatewayJwt(token);
  } catch (e) {
    // Log internal reason with request id; never surface to client.
    console.log(`[dsx-ingest] auth_fail request_id=${requestId} reason=${(e as Error).message}`);
    return errorResponse(401, 'unauthorized', requestId);
  }

  // 6. Resolve connection by verified subject.
  let resolved: ResolvedConnection | 'not_found' | 'ambiguous';
  try {
    resolved = await resolveConnectionForSubject(identity.sub);
  } catch (e) {
    console.log(`[dsx-ingest] resolve_fail request_id=${requestId} reason=${(e as Error).message}`);
    return errorResponse(503, 'unavailable', requestId);
  }
  if (resolved === 'not_found' || resolved === 'ambiguous') {
    console.log(`[dsx-ingest] resolve_${resolved} request_id=${requestId}`);
    return errorResponse(401, 'unauthorized', requestId);
  }
  if (resolved.status !== 'active') {
    console.log(`[dsx-ingest] connection_inactive request_id=${requestId}`);
    return errorResponse(401, 'unauthorized', requestId);
  }
  if (
    !resolved.gateway_jwt_key_ref ||
    resolved.gateway_jwt_key_ref !== identity.jwk.dsx_key_ref
  ) {
    console.log(`[dsx-ingest] key_ref_mismatch request_id=${requestId}`);
    return errorResponse(401, 'unauthorized', requestId);
  }

  // 7. Read bounded body.
  const bodyBytes = await readBoundedBody(req);
  if (bodyBytes === 'too_large') {
    return errorResponse(413, 'payload_too_large', requestId);
  }
  if (bodyBytes.byteLength === 0) {
    return errorResponse(400, 'invalid_request', requestId);
  }
  let bodyJson: unknown;
  try {
    bodyJson = JSON.parse(new TextDecoder().decode(bodyBytes));
  } catch {
    return errorResponse(400, 'invalid_request', requestId);
  }

  // 8. Canonical DSX parse.
  const parsed = parseDsxEvent(bodyJson);
  if (!parsed.ok) {
    console.log(`[dsx-ingest] envelope_reject request_id=${requestId} reason=${parsed.reason}`);
    return errorResponse(400, 'invalid_request', requestId);
  }
  const env = parsed.envelope;

  // Server-side cross-check: envelope must claim same connection_id we
  // resolved from the verified sub. Do not trust envelope tenant/site.
  if (env.connection_id !== resolved.id) {
    console.log(`[dsx-ingest] envelope_connection_mismatch request_id=${requestId}`);
    return errorResponse(401, 'unauthorized', requestId);
  }

  // 9. RPC. numeric_value only for numeric payloads.
  const numericValue =
    typeof env.value === 'number' && Number.isFinite(env.value) ? env.value : null;

  let rpcResult: { decision: string; reason_code?: string; event_pk?: string } | null = null;
  try {
    const supabase = serviceClient();
    const { data, error } = await supabase.rpc('dsx_ingest_event', {
      p_connection_id: resolved.id,
      p_event_id: env.event_id,
      p_observed_at: env.observed_at,
      p_received_at: env.received_at,
      p_quality: env.quality,
      p_numeric_value: numericValue,
      p_unit: env.unit,
      p_source_subject: env.source_subject,
      p_gateway_id: env.ingestion_version,
      p_schema_version: env.schema_version,
      p_external_asset_ref: env.source_subject,
      p_envelope: env as unknown as Record<string, unknown>,
      p_request_id: requestId,
    });
    if (error) throw new Error(error.message);
    rpcResult = data as typeof rpcResult;
  } catch (e) {
    console.log(`[dsx-ingest] rpc_fail request_id=${requestId} reason=${(e as Error).message}`);
    return errorResponse(503, 'unavailable', requestId);
  }

  if (!rpcResult || typeof rpcResult.decision !== 'string') {
    return errorResponse(503, 'unavailable', requestId);
  }

  const decision = rpcResult.decision;
  const status =
    decision === 'accepted' ? 200
    : decision === 'duplicate' ? 200
    : decision === 'rejected' ? 400
    : /* retryable */ 503;

  return jsonResponse(status, {
    ok: decision === 'accepted' || decision === 'duplicate',
    decision,
    reason_code: rpcResult.reason_code ?? null,
    request_id: requestId,
  });
}

// Bootstrap. Only invoked in the Edge Runtime, not under Deno.test.
if (import.meta.main) {
  Deno.serve(handleRequest);
}
