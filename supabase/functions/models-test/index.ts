import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireCaller, callerRejectedResponse } from '../_shared/callerIdentity.ts';
import { checkAIHealth, type AITextProfile } from '../_shared/ai-client.ts';

const PROFILE_MAP: Record<string, AITextProfile> = {
  balanced: 'balanced',
  fast: 'fast',
  reasoning: 'reasoning',
  summary: 'compatibilitySummary',
};

/**
 * Legacy administrative compatibility endpoint.
 * Arbitrary provider/model selection was removed. The caller can request only
 * an AURA profile, and the server resolves the real provider and model.
 */
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error_code: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let caller;
  try {
    caller = await requireCaller(req);
  } catch (error) {
    const rejected = callerRejectedResponse(error, req);
    if (rejected) return rejected;
    return new Response(JSON.stringify({ error_code: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', caller.userId);
  const allowed = (roles ?? []).some((row: { role: string }) =>
    ['owner', 'admin', 'executive', 'engineer'].includes(row.role),
  );
  if (!allowed) {
    return new Response(JSON.stringify({ error_code: 'forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json().catch(() => ({}));
  if (typeof body?.modelId === 'string' || typeof body?.model === 'string') {
    return new Response(JSON.stringify({
      error_code: 'client_model_selection_removed',
      safe_message: 'Select an AURA response profile instead of a provider model identifier.',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const requestedProfile = typeof body?.profile === 'string' ? body.profile : 'balanced';
  const runtimeProfile = PROFILE_MAP[requestedProfile];
  if (!runtimeProfile) {
    return new Response(JSON.stringify({
      error_code: 'unsupported_profile',
      safe_message: 'The requested AURA response profile is not available.',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const result = await checkAIHealth({ model: runtimeProfile });
  await admin.from('integration_logs').insert({
    user_id: caller.userId,
    action: 'managed_ai_profile_test',
    status: result.healthy ? 'success' : 'failed',
    duration_ms: result.latency_ms ?? null,
    details: { profile: requestedProfile },
  });

  return new Response(JSON.stringify({
    success: result.healthy,
    profile: requestedProfile,
    status: result.healthy ? 'ok' : 'error',
    latency: result.latency_ms ?? null,
  }), {
    status: result.healthy ? 200 : 503,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
