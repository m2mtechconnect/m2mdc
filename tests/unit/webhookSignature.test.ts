/**
 * Phase 11 - negative tests for external webhook signature verification.
 * Covers: missing, malformed, invalid, expired and replayed signatures,
 * plus the fail-closed path when no shared secret is configured.
 */
import { describe, it, expect } from 'vitest';
import {
  verifyWebhookRequest,
  hmacSha256Hex,
  MAX_WEBHOOK_BODY_BYTES,
} from '../../supabase/functions/_shared/webhookSignature';

const SECRET = 'test-shared-secret';

async function makeRequest(opts: {
  body?: string;
  timestamp?: number | string;
  signature?: string | null;
  method?: string;
  contentLength?: number;
}) {
  const body = opts.body ?? JSON.stringify({ systemId: 'x', input: {} });
  const timestamp = opts.timestamp ?? Math.floor(Date.now() / 1000);
  const headers = new Headers({ 'content-type': 'application/json' });
  if (opts.signature !== null) {
    headers.set(
      'x-zapier-signature',
      opts.signature ?? (await hmacSha256Hex(SECRET, `${timestamp}.${body}`)),
    );
  }
  headers.set('x-zapier-timestamp', String(timestamp));
  if (opts.contentLength) headers.set('content-length', String(opts.contentLength));
  return new Request('https://edge.test/zapier-webhook/acme', {
    method: opts.method ?? 'POST',
    headers,
    body: opts.method === 'GET' ? undefined : body,
  });
}

describe('verifyWebhookRequest', () => {
  it('accepts a correctly signed, fresh request', async () => {
    const res = await verifyWebhookRequest({ req: await makeRequest({}), secret: SECRET });
    expect(res.ok).toBe(true);
  });

  it('fails closed with 503 when no shared secret is configured', async () => {
    const res = await verifyWebhookRequest({ req: await makeRequest({}), secret: undefined });
    expect(res).toMatchObject({ ok: false, reason: 'signature_unverifiable', status: 503 });
  });

  it('rejects a missing signature', async () => {
    const res = await verifyWebhookRequest({ req: await makeRequest({ signature: null }), secret: SECRET });
    expect(res).toMatchObject({ ok: false, reason: 'signature_missing', status: 401 });
  });

  it('rejects a malformed signature', async () => {
    const res = await verifyWebhookRequest({ req: await makeRequest({ signature: 'not-hex' }), secret: SECRET });
    expect(res).toMatchObject({ ok: false, reason: 'signature_malformed', status: 401 });
  });

  it('rejects an invalid signature', async () => {
    const res = await verifyWebhookRequest({
      req: await makeRequest({ signature: 'a'.repeat(64) }),
      secret: SECRET,
    });
    expect(res).toMatchObject({ ok: false, reason: 'signature_invalid', status: 401 });
  });

  it('rejects an expired timestamp outside tolerance', async () => {
    const stale = Math.floor(Date.now() / 1000) - 3600;
    const res = await verifyWebhookRequest({ req: await makeRequest({ timestamp: stale }), secret: SECRET });
    expect(res).toMatchObject({ ok: false, reason: 'timestamp_out_of_tolerance', status: 401 });
  });

  it('rejects a replayed request', async () => {
    const body = JSON.stringify({ systemId: 'replay', input: {} });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await hmacSha256Hex(SECRET, `${timestamp}.${body}`);
    const first = await verifyWebhookRequest({
      req: await makeRequest({ body, timestamp, signature }),
      secret: SECRET,
    });
    expect(first.ok).toBe(true);
    const second = await verifyWebhookRequest({
      req: await makeRequest({ body, timestamp, signature }),
      secret: SECRET,
    });
    expect(second).toMatchObject({ ok: false, reason: 'replayed', status: 409 });
  });

  it('rejects non-POST methods', async () => {
    const res = await verifyWebhookRequest({ req: await makeRequest({ method: 'GET' }), secret: SECRET });
    expect(res).toMatchObject({ ok: false, reason: 'method_not_allowed', status: 405 });
  });

  it('rejects an oversized declared payload', async () => {
    const res = await verifyWebhookRequest({
      req: await makeRequest({ contentLength: MAX_WEBHOOK_BODY_BYTES + 1 }),
      secret: SECRET,
    });
    expect(res).toMatchObject({ ok: false, reason: 'payload_too_large', status: 413 });
  });
});
