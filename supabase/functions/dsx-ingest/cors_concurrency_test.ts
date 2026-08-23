import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import {
  handleRequest,
  __resetJwksCacheForTests,
  __resetTestAdapters,
  __setTestAdapters,
} from './index.ts';

const ISSUER = 'https://dsx-gateway.cors-test';
const AUDIENCE = 'aura.dsx.ingest.cors-test';
const KID = 'dsx-cors-concurrency-key';
const DSX_KEY_REF = 'dsx-cors-concurrency-ref';
const SUB = 'dc.test.power.pdu-cors';
const ORIGIN_A = 'http://origin-a.test';
const ORIGIN_B = 'http://origin-b.test';
const CONN_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ORG_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const TWIN_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

Deno.test('keeps DSX CORS origin request-local across interleaved async requests', async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
  const jwk = {
    ...(await exportJWK(publicKey)),
    kid: KID,
    use: 'sig',
    alg: 'RS256',
    dsx_key_ref: DSX_KEY_REF,
  };

  Deno.env.set('ENVIRONMENT', 'test');
  Deno.env.set('CORS_ALLOWED_ORIGINS', `${ORIGIN_A},${ORIGIN_B}`);
  Deno.env.set('DSX_GATEWAY_JWKS_JSON', JSON.stringify({ keys: [jwk] }));
  Deno.env.set('DSX_GATEWAY_JWT_ISSUER', ISSUER);
  Deno.env.set('DSX_GATEWAY_JWT_AUDIENCE', AUDIENCE);
  Deno.env.set('SUPABASE_URL', 'http://ignored.test');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'ignored');
  __resetJwksCacheForTests();

  let signalResolverEntered!: () => void;
  const resolverEntered = new Promise<void>((resolve) => {
    signalResolverEntered = resolve;
  });
  let releaseResolver!: () => void;
  const resolverGate = new Promise<void>((resolve) => {
    releaseResolver = resolve;
  });

  __setTestAdapters({
    resolveConnectionForSubject: async () => {
      signalResolverEntered();
      await resolverGate;
      return {
        id: CONN_ID,
        org_id: ORG_ID,
        twin_id: TWIN_ID,
        status: 'active',
        gateway_jwt_key_ref: DSX_KEY_REF,
        allowed_source_subjects: [SUB],
      };
    },
    invokeIngestRpc: async () => ({ decision: 'accepted', event_pk: crypto.randomUUID() }),
  });

  const nowSec = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: KID })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(SUB)
    .setIssuedAt(nowSec)
    .setExpirationTime(nowSec + 60)
    .sign(privateKey);

  const now = new Date().toISOString();
  const body = {
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
    value: 42,
    unit: 'kW',
    quality: 'validated',
    validation_state: 'accepted',
    mapping_state: 'mapped',
    ingestion_version: 'gw-cors-test',
  };

  const requestA = new Request('http://localhost/dsx-ingest', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      origin: ORIGIN_A,
    },
    body: JSON.stringify(body),
  });

  const responseAPromise = handleRequest(requestA);
  await resolverEntered;

  // Interleave a second request after A selected its CORS policy but before A
  // produces its response. A module-global CORS object would now be overwritten.
  const responseB = await handleRequest(new Request('http://localhost/dsx-ingest', {
    method: 'OPTIONS',
    headers: { origin: ORIGIN_B },
  }));
  assertEquals(responseB.headers.get('access-control-allow-origin'), ORIGIN_B);

  releaseResolver();
  const responseA = await responseAPromise;

  assertEquals(responseA.status, 200);
  assertEquals(responseA.headers.get('access-control-allow-origin'), ORIGIN_A);

  __resetTestAdapters();
});
