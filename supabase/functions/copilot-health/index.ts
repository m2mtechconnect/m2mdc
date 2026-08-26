import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireCaller, callerRejectedResponse } from '../_shared/callerIdentity.ts';
import { checkAIHealth } from '../_shared/ai-client.ts';

/**
 * Health probe for the same server-owned managed AI transport used by runtime
 * execution. Client-supplied provider, project, region and model identifiers
 * are deliberately ignored and are not part of this contract.
 */
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    await requireCaller(req);
  } catch (error) {
    const rejected = callerRejectedResponse(error, req);
    if (rejected) return rejected;
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const result = await checkAIHealth({ model: 'primary' });
  const managedAi = result.healthy
    ? { status: 'ok' as const, latency: result.latency_ms }
    : {
        status: 'error' as const,
        error: 'Managed AI runtime check failed',
        ...(typeof result.latency_ms === 'number' ? { latency: result.latency_ms } : {}),
      };

  return new Response(JSON.stringify({
    runtimeControl: 'server_owned',
    managedAi,
    groundingSearch: {
      status: 'disabled',
      error: 'Grounding is not exposed by the current server-owned AURA runtime contract.',
    },
  }), {
    status: result.healthy ? 200 : 503,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
