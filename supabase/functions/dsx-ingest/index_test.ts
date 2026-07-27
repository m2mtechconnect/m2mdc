// Deno test suite for the Phase 2.b DSX ingestion handler.
//
// Generates an in-memory RSA keypair per suite, exports the public key
// as a JWK (with a `dsx_key_ref`), installs it into DSX_GATEWAY_JWKS_JSON,
// then exercises the full auth + envelope + RPC matrix through
// handleRequest(). No network. No live Supabase.

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { SignJWT, exportJWK, generateKeyPair, importJWK } from 'jose';
import {
  handleRequest,
  __resetJwksCacheForTests,
  __setTestAdapters,
  __resetTestAdapters,
} from './index.ts';

const ISSUER = 'https://dsx-gateway.test';
const AUDIENCE = 'aura.dsx.ingest.test';
const KID = 'dsx-test-kid-1';
const DSX_KEY_REF = 'dsx-key-ref-A';
const SUB = 'dc.montreal.power.pdu-1';

const CONN_ID = '11111111-1111-1111-1111-111111111111';
const ORG_ID = '22222222-2222-2222-2222-222222222222';
const TWIN_ID = '33333333-3333-3333-3333-333333333333';

interface Ctx {
  privateKey: CryptoKey;
  jwk: Record<string, unknown>;
}

async function setup(): Promise<Ctx> {
  const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
  const jwk = { ...(await exportJWK(publicKey)), kid: KID, use: 'sig', alg: 'RS256', dsx_key_ref: DSX_KEY_REF };
  Deno.env.set('DSX_GATEWAY_JWKS_JSON', JSON.stringify({ keys: [jwk] }));
  Deno.env.set('DSX_GATEWAY_JWT_ISSUER', ISSUER);
  Deno.env.set('DSX_GATEWAY_JWT_AUDIENCE', AUDIENCE);
  Deno.env.set('SUPABASE_URL', 'http://ignored.test');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'ignored');
  __resetJwksCacheForTests();
  return { privateKey, jwk };
}

async function mint(privateKey: CryptoKey, over: Partial<{
  sub: string; iss: string; aud: string; kid: string; alg: string;
  ageSec: number; lifetimeSec: number; iatFutureSec: number;
}> = {}): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  const iat = nowSec + (over.iatFutureSec ?? 0) - (over.ageSec ?? 0);
  const exp = iat + (over.lifetimeSec ?? 60);
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: over.alg ?? 'RS256', typ: 'JWT', kid: over.kid ?? KID })
    .setIssuer(over.iss ?? ISSUER)
    .setAudience(over.aud ?? AUDIENCE)
    .setSubject(over.sub ?? SUB)
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(privateKey);
  return jwt;
}

function envelope(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    schema_version: 1,
    event_id: crypto.randomUUID(),
    tenant_id: ORG_ID,
    site_id: TWIN_ID,
    asset_id: null,
    connection_id: CONN_ID,
    source_system: 'dsx_power',
    source_subject: SUB,
    event_type: 'telemetry',
    observed_at: now,
    received_at: now,
    value: 42.0,
    unit: 'kW',
    quality: 'validated',
    validation_state: 'accepted',
    mapping_state: 'mapped',
    ingestion_version: 'gw-1.0.0',
    ...overrides,
  };
}

function req(token: string | null, body: unknown, extraHeaders: Record<string, string> = {}): Request {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...extraHeaders,
  };
  if (token) headers.authorization = `Bearer ${token}`;
  return new Request('http://localhost/dsx-ingest', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function installHappyResolver() {
  __setTestAdapters({
    resolveConnectionForSubject: async () => ({
      id: CONN_ID,
      org_id: ORG_ID,
      twin_id: TWIN_ID,
      status: 'active',
      gateway_jwt_key_ref: DSX_KEY_REF,
      allowed_source_subjects: [SUB],
    }),
    invokeIngestRpc: async () => ({ decision: 'accepted', reason_code: undefined, event_pk: crypto.randomUUID() }),
  });
}

// ---------------------------------------------------------------------------

Deno.test('accepts a valid gateway JWT + envelope', async () => {
  const ctx = await setup();
  installHappyResolver();
  const token = await mint(ctx.privateKey);
  const res = await handleRequest(req(token, envelope()));
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.ok, true);
  assertEquals(body.decision, 'accepted');
  __resetTestAdapters();
});

Deno.test('rejects missing Authorization header', async () => {
  await setup();
  installHappyResolver();
  const res = await handleRequest(req(null, envelope()));
  const body = await res.json();
  assertEquals(res.status, 401);
  assertEquals(body.error, 'unauthorized');
  __resetTestAdapters();
});

Deno.test('rejects tokens signed with a foreign key (unknown kid)', async () => {
  const ctx = await setup();
  installHappyResolver();
  const foreign = await generateKeyPair('RS256', { extractable: true });
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: 'foreign-kid' })
    .setIssuer(ISSUER).setAudience(AUDIENCE).setSubject(SUB)
    .setIssuedAt().setExpirationTime('2m')
    .sign(foreign.privateKey);
  const res = await handleRequest(req(token, envelope()));
  assertEquals(res.status, 401);
  void ctx;
  __resetTestAdapters();
});

Deno.test('rejects non-RS256 alg', async () => {
  const ctx = await setup();
  installHappyResolver();
  // Sign RS256 but tamper the header to claim alg=none by hand. jose won't
  // sign 'none'; simplest: mint a normal token, then rewrite header.
  const good = await mint(ctx.privateKey);
  const [, payload, sig] = good.split('.');
  const badHeader = btoa(JSON.stringify({ alg: 'none', typ: 'JWT', kid: KID }))
    .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const tampered = `${badHeader}.${payload}.${sig}`;
  const res = await handleRequest(req(tampered, envelope()));
  assertEquals(res.status, 401);
  __resetTestAdapters();
});

Deno.test('rejects expired tokens', async () => {
  const ctx = await setup();
  installHappyResolver();
  const token = await mint(ctx.privateKey, { ageSec: 3600, lifetimeSec: 60 });
  const res = await handleRequest(req(token, envelope()));
  assertEquals(res.status, 401);
  __resetTestAdapters();
});

Deno.test('rejects tokens with lifetime > 5 minutes', async () => {
  const ctx = await setup();
  installHappyResolver();
  const token = await mint(ctx.privateKey, { lifetimeSec: 3600 });
  const res = await handleRequest(req(token, envelope()));
  assertEquals(res.status, 401);
  __resetTestAdapters();
});

Deno.test('rejects wrong audience', async () => {
  const ctx = await setup();
  installHappyResolver();
  const token = await mint(ctx.privateKey, { aud: 'other-aura' });
  const res = await handleRequest(req(token, envelope()));
  assertEquals(res.status, 401);
  __resetTestAdapters();
});

Deno.test('rejects wrong issuer', async () => {
  const ctx = await setup();
  installHappyResolver();
  const token = await mint(ctx.privateKey, { iss: 'https://evil.example' });
  const res = await handleRequest(req(token, envelope()));
  assertEquals(res.status, 401);
  __resetTestAdapters();
});

Deno.test('rejects when resolver returns not_found', async () => {
  const ctx = await setup();
  __setTestAdapters({
    resolveConnectionForSubject: async () => 'not_found',
    invokeIngestRpc: async () => ({ decision: 'accepted' }),
  });
  const token = await mint(ctx.privateKey);
  const res = await handleRequest(req(token, envelope()));
  assertEquals(res.status, 401);
  __resetTestAdapters();
});

Deno.test('rejects inactive connection', async () => {
  const ctx = await setup();
  __setTestAdapters({
    resolveConnectionForSubject: async () => ({
      id: CONN_ID, org_id: ORG_ID, twin_id: TWIN_ID,
      status: 'disabled', gateway_jwt_key_ref: DSX_KEY_REF,
      allowed_source_subjects: [SUB],
    }),
    invokeIngestRpc: async () => ({ decision: 'accepted' }),
  });
  const token = await mint(ctx.privateKey);
  const res = await handleRequest(req(token, envelope()));
  assertEquals(res.status, 401);
  __resetTestAdapters();
});

Deno.test('rejects key_ref binding mismatch', async () => {
  const ctx = await setup();
  __setTestAdapters({
    resolveConnectionForSubject: async () => ({
      id: CONN_ID, org_id: ORG_ID, twin_id: TWIN_ID,
      status: 'active', gateway_jwt_key_ref: 'different-ref',
      allowed_source_subjects: [SUB],
    }),
    invokeIngestRpc: async () => ({ decision: 'accepted' }),
  });
  const token = await mint(ctx.privateKey);
  const res = await handleRequest(req(token, envelope()));
  assertEquals(res.status, 401);
  __resetTestAdapters();
});

Deno.test('rejects invalid envelope (missing schema_version)', async () => {
  const ctx = await setup();
  installHappyResolver();
  const token = await mint(ctx.privateKey);
  const body = envelope();
  delete (body as Record<string, unknown>).schema_version;
  const res = await handleRequest(req(token, body));
  assertEquals(res.status, 400);
  __resetTestAdapters();
});

Deno.test('rejects envelope connection_id mismatch', async () => {
  const ctx = await setup();
  installHappyResolver();
  const token = await mint(ctx.privateKey);
  const res = await handleRequest(
    req(token, envelope({ connection_id: '00000000-0000-0000-0000-000000000000' })),
  );
  assertEquals(res.status, 401);
  __resetTestAdapters();
});

Deno.test('rejects payloads over MAX_BODY_BYTES', async () => {
  const ctx = await setup();
  installHappyResolver();
  const token = await mint(ctx.privateKey);
  const huge = envelope({ correlation_id: 'x'.repeat(200) });
  // Fake Content-Length far above limit.
  const request = new Request('http://localhost/dsx-ingest', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'content-length': String(1_000_000),
    },
    body: JSON.stringify(huge),
  });
  const res = await handleRequest(request);
  assertEquals(res.status, 413);
  __resetTestAdapters();
});

Deno.test('duplicate decision returns 200 ok=true', async () => {
  const ctx = await setup();
  __setTestAdapters({
    resolveConnectionForSubject: async () => ({
      id: CONN_ID, org_id: ORG_ID, twin_id: TWIN_ID,
      status: 'active', gateway_jwt_key_ref: DSX_KEY_REF,
      allowed_source_subjects: [SUB],
    }),
    invokeIngestRpc: async () => ({ decision: 'duplicate', reason_code: 'event_id_exists' }),
  });
  const token = await mint(ctx.privateKey);
  const res = await handleRequest(req(token, envelope()));
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.decision, 'duplicate');
  assertEquals(body.ok, true);
  __resetTestAdapters();
});

Deno.test('rejects JWKS containing private material', async () => {
  const kp = await generateKeyPair('RS256', { extractable: true });
  const privJwk = await exportJWK(kp.privateKey);
  Deno.env.set('DSX_GATEWAY_JWKS_JSON', JSON.stringify({
    keys: [{ ...privJwk, kid: KID, use: 'sig', alg: 'RS256', dsx_key_ref: DSX_KEY_REF }],
  }));
  Deno.env.set('DSX_GATEWAY_JWT_ISSUER', ISSUER);
  Deno.env.set('DSX_GATEWAY_JWT_AUDIENCE', AUDIENCE);
  __resetJwksCacheForTests();
  installHappyResolver();
  // Any request should now fail auth (jwks_contains_private_material).
  const good = await setup();
  // The setup above just re-installs a valid public JWKS; simulate the
  // private-material path by re-writing again and forcing a fresh load.
  Deno.env.set('DSX_GATEWAY_JWKS_JSON', JSON.stringify({
    keys: [{ ...privJwk, kid: KID, use: 'sig', alg: 'RS256', dsx_key_ref: DSX_KEY_REF }],
  }));
  __resetJwksCacheForTests();
  const token = await mint(good.privateKey);
  const res = await handleRequest(req(token, envelope()));
  assertEquals(res.status, 401);
  __resetTestAdapters();
});

Deno.test('non-POST returns 405', async () => {
  await setup();
  const res = await handleRequest(new Request('http://localhost/dsx-ingest', { method: 'GET' }));
  assertEquals(res.status, 405);
});

// Silence unused-import warnings under strict Deno.
void importJWK;