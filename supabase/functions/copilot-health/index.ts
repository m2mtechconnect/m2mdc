import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";


serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Co-Pilot health check started");

  try {
    const { projectId, region, model, groundingEnabled, dataStoreId } = await req.json();

    // Check if we should use external Google credentials
    const useExternalGoogle = Deno.env.get('USE_EXTERNAL_GOOGLE') === 'true';
    const googleCredsJson = Deno.env.get('GOOGLE_APPLICATION_CREDENTIALS_JSON');
    const finalProjectId = projectId || Deno.env.get('GOOGLE_PROJECT_ID');
    const finalRegion = region || Deno.env.get('GOOGLE_LOCATION') || 'northamerica-northeast1';
    const finalModel = model || Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-pro';
    const finalDataStoreId = dataStoreId || Deno.env.get('VERTEX_DATA_STORE_ID');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    // Test Gemini - Use Lovable managed by default
    let geminiStatus: any = { status: 'error' };
    
    if (useExternalGoogle && googleCredsJson && finalProjectId) {
      // External Google Cloud path
      console.log('[copilot-health] Using external Google credentials');
      try {
        const credentials = JSON.parse(googleCredsJson);
        const tokenResponse = await getAccessToken(credentials);
        
        const startTime = Date.now();
        const geminiUrl = `https://${finalRegion}-aiplatform.googleapis.com/v1/projects/${finalProjectId}/locations/${finalRegion}/publishers/google/models/${finalModel}:generateContent`;
        
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenResponse.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [{ text: 'Test' }]
            }],
            generationConfig: {
              maxOutputTokens: 10,
            }
          })
        });

        const latency = Date.now() - startTime;
        
        if (response.ok) {
          geminiStatus = { status: 'ok', provider: 'external_google', latency };
        } else {
          const errorText = await response.text();
          geminiStatus = { status: 'error', provider: 'external_google', error: `API returned ${response.status}`, latency };
        }
      } catch (error) {
        geminiStatus = { status: 'error', provider: 'external_google', error: error instanceof Error ? error.message : 'Unknown error' };
      }
    } else if (lovableApiKey) {
      // Lovable managed path (default)
      console.log('[copilot-health] Using Lovable managed Gemini');
      try {
        const startTime = Date.now();
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: 'Test' }],
            max_tokens: 10,
          }),
        });

        const latency = Date.now() - startTime;
        
        if (response.ok) {
          geminiStatus = { status: 'ok', provider: 'lovable_managed', model: 'google/gemini-2.5-flash', latency };
        } else {
          const errorText = await response.text();
          geminiStatus = { status: 'error', provider: 'lovable_managed', error: `API returned ${response.status}`, latency };
        }
      } catch (error) {
        geminiStatus = { status: 'error', provider: 'lovable_managed', error: error instanceof Error ? error.message : 'Unknown error' };
      }
    } else {
      geminiStatus = { status: 'error', error: 'No AI provider configured' };
      console.warn('[copilot-health] Neither Lovable nor external Google AI configured');
    }

    // Test Vertex Search if enabled (only available with external Google)
    let vertexSearchStatus: any = { status: 'not_applicable', latency: 0 };
    if (groundingEnabled && finalDataStoreId && useExternalGoogle && googleCredsJson && finalProjectId) {
      try {
        const credentials = JSON.parse(googleCredsJson);
        const tokenResponse = await getAccessToken(credentials);
        const startTime = Date.now();
        const searchUrl = `https://discoveryengine.googleapis.com/v1/projects/${finalProjectId}/locations/${finalRegion}/collections/default_collection/dataStores/${finalDataStoreId}/servingConfigs/default_search:search`;
        
        const response = await fetch(searchUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenResponse.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: 'test',
            pageSize: 1,
          })
        });

        const latency = Date.now() - startTime;
        
        if (response.ok) {
          vertexSearchStatus = { status: 'ok', latency };
        } else {
          vertexSearchStatus = { status: 'error', error: `API returned ${response.status}`, latency };
        }
      } catch (error) {
        vertexSearchStatus = { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
      }
    } else if (groundingEnabled) {
      vertexSearchStatus = { status: 'disabled', note: 'Vertex Search requires external Google credentials' };
    }

    return new Response(
      JSON.stringify({
        gemini: geminiStatus,
        vertexSearch: vertexSearchStatus,
        region: finalRegion
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Health check error:", error);
    return new Response(
      JSON.stringify({
        gemini: { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' },
        vertexSearch: { status: 'error', error: 'Not checked' },
        region: 'unknown'
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function getAccessToken(credentials: any) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    str2ab(atob(credentials.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, ''))),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signatureInput)
  );

  const jwt = `${signatureInput}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  return await tokenResponse.json();
}

function str2ab(str: string): ArrayBuffer {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}
