import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";


serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ts = Date.now();
    
    // Primary: Check Lovable Cloud managed AI (always available)
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const lovableHealthy = !!lovableApiKey;
    
    // Optional: Check external Google Cloud credentials
    const useExternalGoogle = Deno.env.get('USE_EXTERNAL_GOOGLE') === 'true';
    const credentials = Deno.env.get('GOOGLE_APPLICATION_CREDENTIALS_JSON');
    const projectId = Deno.env.get('GOOGLE_PROJECT_ID');
    const location = Deno.env.get('GOOGLE_LOCATION') || 'northamerica-northeast1';
    const vertexDataStoreId = Deno.env.get('VERTEX_DATA_STORE_ID');
    
    const externalGoogleHealthy = !!(credentials && projectId);

    const health = {
      // Primary provider
      lovable_managed: {
        healthy: lovableHealthy,
        provider: 'lovable_cloud',
        models: ['google/gemini-3-pro-preview', 'google/gemini-2.5-flash', 'google/gemini-2.5-flash-lite'],
        status: lovableHealthy ? 'ready' : 'not_configured'
      },
      
      // Optional external Google
      external_google: {
        enabled: useExternalGoogle,
        configured: externalGoogleHealthy,
        vertex_search: externalGoogleHealthy && !!vertexDataStoreId,
        region: location,
        status: useExternalGoogle ? (externalGoogleHealthy ? 'ready' : 'not_configured') : 'disabled'
      },
      
      // Overall status
      active_provider: useExternalGoogle && externalGoogleHealthy ? 'external_google' : 'lovable_managed',
      overall_healthy: lovableHealthy, // Always healthy if Lovable key exists
      ts,
      requestId: crypto.randomUUID()
    };
    
    if (!lovableHealthy) {
      console.warn('[health-ai] LOVABLE_API_KEY not configured - AI features may not work');
    }
    
    if (useExternalGoogle && !externalGoogleHealthy) {
      console.warn('[health-ai] External Google credentials requested but not configured - falling back to Lovable managed');
    }

    return new Response(JSON.stringify(health), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Health check error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Health check failed',
      stage: 'health',
      requestId: crypto.randomUUID()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
