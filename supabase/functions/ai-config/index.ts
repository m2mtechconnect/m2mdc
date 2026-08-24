import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireCaller, callerRejectedResponse } from "../_shared/callerIdentity.ts";

/**
 * Provider-neutral managed AI capability probe.
 *
 * The response describes capability availability only. Provider names, model
 * identifiers, cloud project identifiers, regions and upstream URLs are never
 * echoed to the caller; they stay server side.
 */
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Defense in depth. Gateway JWT verification is enabled for this function in
  // supabase/config.toml; the in-code check means the capability configuration
  // is never disclosed even if the gateway setting is later relaxed.
  try {
    await requireCaller(req);
  } catch (error) {
    const rejected = callerRejectedResponse(error, req);
    if (rejected) return rejected;
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const managedAiAvailable = !!Deno.env.get('LOVABLE_API_KEY');
    const externalConfigured = !!(
      Deno.env.get('GOOGLE_APPLICATION_CREDENTIALS_JSON') &&
      Deno.env.get('GOOGLE_PROJECT_ID')
    );
    const externalEnabled = Deno.env.get('USE_EXTERNAL_GOOGLE') === 'true' && externalConfigured;

    const config = {
      managedAi: {
        available: managedAiAvailable || externalEnabled,
      },
      groundingSearch: {
        available: externalEnabled && !!Deno.env.get('VERTEX_DATA_STORE_ID'),
      },
      residency: {
        configured: externalEnabled,
      },
      ready: managedAiAvailable || externalEnabled,
    };

    return new Response(JSON.stringify(config), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const requestId = crypto.randomUUID();
    console.error('[ai-config] configuration probe failed', requestId, error);
    return new Response(JSON.stringify({
      error: 'Unable to load AI capability configuration',
      requestId,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
