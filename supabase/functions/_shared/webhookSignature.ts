/**
 * Phase 11 - Security P0: externally callable webhook signature verification.
 *
 * Fail-closed contract:
 *   - If a webhook endpoint declares that it requires a signature and the
 *     shared secret is NOT configured, the request is REJECTED (503). An
 *     unverifiable webhook is never processed.
 *   - A missing, malformed, stale or replayed signature is rejected (401).
 *   - Signature values, authorization headers and raw bodies are never logged.
 *
 * Scheme: HMAC-SHA256 over `${timestamp}.${rawBody}` (Stripe/Zapier-compatible
 * shape), hex-encoded, compared in constant time.
 */

export const MAX_WEBHOOK_BODY_BYTES = 256 * 1024; // 256 KiB
export const TIMESTAMP_TOLERANCE_SECONDS = 300; // 5 minutes

export type WebhookRejection =
  | 'method_not_allowed'
  | 'payload_too_large'
  | 'signature_unverifiable'
  | 'signature_missing'
  | 'signature_malformed'
  | 'signature_invalid'
  | 'timestamp_out_of_tolerance'
  | 'replayed'
  | 'rate_limited';

export interface VerifiedWebhook {
  ok: true;
  rawBody: string;
}

export interface RejectedWebhook {
  ok: false;
  reason: WebhookRejection;
  status: number;
}

export type WebhookVerification = VerifiedWebhook | RejectedWebhook;

const encoder = new TextEncoder();

/** In-memory replay cache. Per-isolate; bounded. */
const seenSignatures = new Map<string, number>();
const REPLAY_CACHE_MAX = 5000;

function rememberSignature(digest: string, nowSeconds: number): boolean {
  const cutoff = nowSeconds - TIMESTAMP_TOLERANCE_SECONDS;
  if (seenSignatures.size > REPLAY_CACHE_MAX) {
    for (const [k, ts] of seenSignatures) {
      if (ts < cutoff) seenSignatures.delete(k);
    }
  }
  if (seenSignatures.has(digest)) return false;
  seenSignatures.set(digest, nowSeconds);
  return true;
}

/** Naive per-isolate fixed-window limiter keyed by endpoint + app key. */
const rateWindows = new Map<string, { count: number; windowStart: number }>();

export function withinRateLimit(key: string, limit = 60, windowSeconds = 60): boolean {
  const now = Math.floor(Date.now() / 1000);
  const entry = rateWindows.get(key);
  if (!entry || now - entry.windowStart >= windowSeconds) {
    rateWindows.set(key, { count: 1, windowStart: now });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface VerifyOptions {
  req: Request;
  /** Shared secret; undefined means "not configured". */
  secret: string | undefined;
  /** Header carrying the hex HMAC. */
  signatureHeader?: string;
  /** Header carrying the unix-seconds timestamp. */
  timestampHeader?: string;
  allowedMethods?: string[];
  rateLimitKey?: string;
}

/**
 * Reads and verifies the request body. The caller must use the returned
 * `rawBody` - the request stream is consumed here.
 */
export async function verifyWebhookRequest(opts: VerifyOptions): Promise<WebhookVerification> {
  const {
    req,
    secret,
    signatureHeader = 'x-zapier-signature',
    timestampHeader = 'x-zapier-timestamp',
    allowedMethods = ['POST'],
    rateLimitKey,
  } = opts;

  if (!allowedMethods.includes(req.method)) {
    return { ok: false, reason: 'method_not_allowed', status: 405 };
  }

  if (rateLimitKey && !withinRateLimit(rateLimitKey)) {
    return { ok: false, reason: 'rate_limited', status: 429 };
  }

  const declared = Number(req.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > MAX_WEBHOOK_BODY_BYTES) {
    return { ok: false, reason: 'payload_too_large', status: 413 };
  }

  // Fail closed: no secret means the signature cannot be verified at all.
  if (!secret) {
    return { ok: false, reason: 'signature_unverifiable', status: 503 };
  }

  const signature = req.headers.get(signatureHeader);
  if (!signature) {
    return { ok: false, reason: 'signature_missing', status: 401 };
  }
  if (!/^[0-9a-f]{64}$/i.test(signature)) {
    return { ok: false, reason: 'signature_malformed', status: 401 };
  }

  const rawTimestamp = req.headers.get(timestampHeader);
  if (!rawTimestamp || !/^\d{9,11}$/.test(rawTimestamp)) {
    return { ok: false, reason: 'signature_malformed', status: 401 };
  }
  const timestamp = Number(rawTimestamp);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > TIMESTAMP_TOLERANCE_SECONDS) {
    return { ok: false, reason: 'timestamp_out_of_tolerance', status: 401 };
  }

  const rawBody = await req.text();
  if (encoder.encode(rawBody).byteLength > MAX_WEBHOOK_BODY_BYTES) {
    return { ok: false, reason: 'payload_too_large', status: 413 };
  }

  const expected = await hmacSha256Hex(secret, `${timestamp}.${rawBody}`);
  if (!constantTimeEqual(expected, signature.toLowerCase())) {
    return { ok: false, reason: 'signature_invalid', status: 401 };
  }

  if (!rememberSignature(expected, now)) {
    return { ok: false, reason: 'replayed', status: 409 };
  }

  return { ok: true, rawBody };
}

/** Safe error envelope: reason code + correlation id only. */
export function webhookErrorResponse(
  rejection: RejectedWebhook,
  correlationId: string,
  headers: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({ error: rejection.reason, correlation_id: correlationId }),
    { status: rejection.status, headers: { ...headers, 'Content-Type': 'application/json' } },
  );
}