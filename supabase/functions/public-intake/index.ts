/**
 * Server-controlled public intake for onboarding submissions and contact
 * requests. Direct anonymous table inserts are revoked; this is the only path.
 *
 * Controls: schema validation, payload size limit, per-bucket hourly rate
 * limiting, duplicate suppression, safe error responses, audit correlation id.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_BODY_BYTES = 16_000;
const RATE_LIMIT_PER_HOUR = 5;

type Json = Record<string, unknown>;

function json(status: number, body: Json) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function str(value: unknown, min: number, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) return null;
  return trimmed;
}

function email(value: unknown): string | null {
  const v = str(value, 3, 320);
  if (!v) return null;
  return /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(v) ? v.toLowerCase() : null;
}

function list(value: unknown, max = 32): string[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  if (!value.every((v) => typeof v === 'string' && v.length <= 120)) return null;
  return value as string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const correlationId = crypto.randomUUID();

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json(413, { error: 'payload_too_large', correlation_id: correlationId });
  }

  let payload: Json;
  try {
    payload = JSON.parse(raw) as Json;
  } catch {
    return json(400, { error: 'invalid_payload', correlation_id: correlationId });
  }

  // Honeypot: a filled hidden field is always a bot.
  if (typeof payload.company_website === 'string' && payload.company_website.length > 0) {
    console.warn(`public-intake ${correlationId}: honeypot triggered`);
    return json(202, { ok: true, correlation_id: correlationId });
  }

  const kind = payload.kind;
  if (kind !== 'onboarding' && kind !== 'contact') {
    return json(400, { error: 'unknown_intake_kind', correlation_id: correlationId });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // Identity: derived server-side only. A client-supplied user id is ignored.
  let userId: string | null = null;
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const { data } = await supabase.auth.getUser(authHeader.slice(7));
    userId = data.user?.id ?? null;
  }

  const forwarded = req.headers.get('x-forwarded-for') ?? '';
  const ip = forwarded.split(',')[0]?.trim() || 'unknown';
  const bucketKey = userId ? `user:${userId}` : `ip:${ip}`;
  const windowStart = new Date(new Date().setMinutes(0, 0, 0)).toISOString();

  const { data: limitRow } = await supabase
    .from('public_intake_rate_limits')
    .select('id, request_count')
    .eq('bucket_key', bucketKey)
    .eq('intake_kind', kind)
    .eq('window_start', windowStart)
    .maybeSingle();

  if (limitRow && limitRow.request_count >= RATE_LIMIT_PER_HOUR) {
    console.warn(`public-intake ${correlationId}: rate limited (${kind})`);
    return json(429, { error: 'rate_limited', correlation_id: correlationId });
  }

  if (limitRow) {
    await supabase
      .from('public_intake_rate_limits')
      .update({ request_count: limitRow.request_count + 1, updated_at: new Date().toISOString() })
      .eq('id', limitRow.id);
  } else {
    await supabase
      .from('public_intake_rate_limits')
      .insert({ bucket_key: bucketKey, intake_kind: kind, window_start: windowStart });
  }

  try {
    if (kind === 'contact') {
      const name = str(payload.name, 1, 120);
      const mail = email(payload.email);
      const message = str(payload.message, 0, 4000) ?? '';
      if (!name || !mail) return json(400, { error: 'invalid_payload', correlation_id: correlationId });

      const { error } = await supabase.from('contact_expert_logs').insert({
        user_id: userId,
        name,
        email: mail,
        message,
        is_anonymous: userId === null,
        intake_source: 'SERVER_INTAKE',
        correlation_id: correlationId,
      });
      if (error) throw error;
      return json(200, { ok: true, correlation_id: correlationId });
    }

    const record = {
      full_name: str(payload.full_name, 1, 160),
      email: email(payload.email),
      job_title: str(payload.job_title, 1, 160),
      company_name: str(payload.company_name, 1, 200),
      company_size: str(payload.company_size, 1, 60),
      num_data_centres: str(payload.num_data_centres, 1, 60),
      rack_count: str(payload.rack_count, 1, 60),
      workload_types: list(payload.workload_types),
      current_pue: typeof payload.current_pue === 'string' ? str(payload.current_pue, 0, 40) : null,
      goals: list(payload.goals),
      challenge: typeof payload.challenge === 'string' ? str(payload.challenge, 0, 2000) : null,
      timeline: str(payload.timeline, 1, 60),
    };

    const required = [
      record.full_name, record.email, record.job_title, record.company_name,
      record.company_size, record.num_data_centres, record.rack_count, record.timeline,
    ];
    if (required.some((v) => v === null) || record.workload_types === null || record.goals === null) {
      return json(400, { error: 'invalid_payload', correlation_id: correlationId });
    }

    // Duplicate suppression: same email within the last hour is a no-op.
    const since = new Date(Date.now() - 3_600_000).toISOString();
    const { data: dupe } = await supabase
      .from('onboarding_submissions')
      .select('id')
      .eq('email', record.email)
      .gte('created_at', since)
      .maybeSingle();
    if (dupe) return json(200, { ok: true, duplicate: true, correlation_id: correlationId });

    const { error } = await supabase
      .from('onboarding_submissions')
      .insert({ ...record, intake_source: 'SERVER_INTAKE', correlation_id: correlationId });
    if (error) throw error;

    return json(200, { ok: true, correlation_id: correlationId });
  } catch (err) {
    console.error(`public-intake ${correlationId} failed:`, err);
    return json(500, { error: 'intake_failed', correlation_id: correlationId });
  }
});
