import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
