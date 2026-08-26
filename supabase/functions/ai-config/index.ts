import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireCaller, callerRejectedResponse } from '../_shared/callerIdentity.ts';

/**
 * Provider-neutral managed AI capability probe.
 * Runtime authority is server-owned. Browser values never select a provider,
 * project, raw model identifier, residency region or credential.
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

  const managedAiAvailable = Boolean(Deno.env.get('LOVABLE_API_KEY'));
  const groundingAvailable = false;

  return new Response(JSON.stringify({
    runtimeControl: 'server_owned',
    managedAi: { available: managedAiAvailable },
    groundingSearch: {
      available: groundingAvailable,
      reason: groundingAvailable
        ? 'Grounding is available through the server-owned runtime.'
        : 'Grounding is not exposed by the current server-owned AURA runtime contract.',
    },
    profiles: [
      {
        id: 'balanced',
        label: 'Balanced',
        description: 'Default AURA profile for general analysis and operator assistance.',
        available: managedAiAvailable,
      },
      {
        id: 'fast',
        label: 'Fast',
        description: 'Lower-latency AURA profile for concise operational interactions.',
        available: managedAiAvailable,
      },
      {
        id: 'reasoning',
        label: 'Reasoning',
        description: 'Deeper AURA profile for complex analysis when the managed runtime supports it.',
        available: managedAiAvailable,
      },
    ],
    ready: managedAiAvailable,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
