import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireCaller, callerRejectedResponse } from "../_shared/callerIdentity.ts";


serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Defense in depth. Gateway JWT verification is enabled for this function in
  // supabase/config.toml; the in-code check means the provider configuration is
  // never disclosed even if the gateway setting is later relaxed.
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
    // Return AI configuration status
    // PRIMARY: Lovable Cloud managed Gemini (always available)
    // OPTIONAL: External Google Cloud credentials (for advanced users)
    
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const useExternalGoogle = Deno.env.get('USE_EXTERNAL_GOOGLE') === 'true';
    const externalGoogleConfigured = !!(
      Deno.env.get('GOOGLE_APPLICATION_CREDENTIALS_JSON') && 
      Deno.env.get('GOOGLE_PROJECT_ID')
    );

    const config = {
      // Primary AI provider (Lovable Cloud managed)
      primary: {
        provider: 'lovable_managed',
        available: !!lovableApiKey,
        models: {
          primary: 'google/gemini-3-pro-preview',
          fallback: 'google/gemini-3.0-pro',
        }
      },
      
      // Optional external Google Cloud
      external_google: {
        enabled: useExternalGoogle && externalGoogleConfigured,
        configured: externalGoogleConfigured,
        projectId: Deno.env.get('GOOGLE_PROJECT_ID') || null,
        location: Deno.env.get('GOOGLE_LOCATION') || 'northamerica-northeast1',
        model: Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-pro',
        vertexDataStoreId: Deno.env.get('VERTEX_DATA_STORE_ID') || null,
      },
      
      // Overall status
      active_provider: useExternalGoogle && externalGoogleConfigured ? 'external_google' : 'lovable_managed',
      ready: !!lovableApiKey, // Always ready if Lovable key exists
    };

    return new Response(JSON.stringify(config), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Config error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to load config',
      requestId: crypto.randomUUID()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
