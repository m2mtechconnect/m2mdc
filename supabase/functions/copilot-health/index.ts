import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireCaller, callerRejectedResponse } from "../_shared/callerIdentity.ts";

/**
 * Managed AI health probe.
 *
 * The external contract is provider neutral: `managedAi`, `groundingSearch`
 * and `residency`. Provider names, raw model identifiers, cloud project
 * identifiers, upstream URLs and credentials are never returned; upstream
 * failure detail is logged server side only.
 */

type ProbeResult = {
  status: 'ok' | 'error' | 'disabled' | 'not_applicable';
  latency?: number;
  error?: string;
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Defense in depth alongside verify_jwt = true in supabase/config.toml.
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

  console.log("[copilot-health] health check started");

  try {
    const body = await req.json().catch(() => ({}));
    const { projectId, region, model, groundingEnabled, dataStoreId } = body ?? {};

    const useExternal = Deno.env.get('USE_EXTERNAL_GOOGLE') === 'true';
    const externalCredsJson = Deno.env.get('GOOGLE_APPLICATION_CREDENTIALS_JSON');
    const finalProjectId = projectId || Deno.env.get('GOOGLE_PROJECT_ID');
    const finalRegion = region || Deno.env.get('GOOGLE_LOCATION') || 'northamerica-northeast1';
    const finalModel = model || Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash';
    const finalDataStoreId = dataStoreId || Deno.env.get('VERTEX_DATA_STORE_ID');
    const managedApiKey = Deno.env.get('LOVABLE_API_KEY');

    let managedAi: ProbeResult = { status: 'error', error: 'Managed AI is not configured' };

    if (useExternal && externalCredsJson && finalProjectId) {
      try {
        const credentials = JSON.parse(externalCredsJson);
        const tokenResponse = await getAccessToken(credentials);

        const startTime = Date.now();
        const upstreamUrl = `https://${finalRegion}-aiplatform.googleapis.com/v1/projects/${finalProjectId}/locations/${finalRegion}/publishers/google/models/${finalModel}:generateContent`;

        const response = await fetch(upstreamUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenResponse.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Test' }] }],
            generationConfig: { maxOutputTokens: 10 },
          }),
        });

        const latency = Date.now() - startTime;

        if (response.ok) {
          managedAi = { status: 'ok', latency };
        } else {
          console.error('[copilot-health] managed AI probe failed', response.status, await response.text());
          managedAi = { status: 'error', error: 'Managed AI check failed', latency };
        }
      } catch (error) {
        console.error('[copilot-health] managed AI probe threw', error);
        managedAi = { status: 'error', error: 'Managed AI check failed' };
      }
    } else if (managedApiKey) {
      try {
        const startTime = Date.now();
        // This is the provider-managed gateway path. Its model catalogue is a
        // separate runtime contract from the externally configured Vertex path,
        // so do not couple it to the browser response-profile selector.
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${managedApiKey}`,
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
          managedAi = { status: 'ok', latency };
        } else {
          console.error('[copilot-health] managed AI probe failed', response.status, await response.text());
          managedAi = { status: 'error', error: 'Managed AI check failed', latency };
        }
      } catch (error) {
        console.error('[copilot-health] managed AI probe threw', error);
        managedAi = { status: 'error', error: 'Managed AI check failed' };
      }
    } else {
      console.warn('[copilot-health] no managed AI capability configured');
    }

    let groundingSearch: ProbeResult = { status: 'not_applicable', latency: 0 };
    if (groundingEnabled && finalDataStoreId && useExternal && externalCredsJson && finalProjectId) {
      try {
        const credentials = JSON.parse(externalCredsJson);
        const tokenResponse = await getAccessToken(credentials);
        const startTime = Date.now();
        const searchUrl = `https://discoveryengine.googleapis.com/v1/projects/${finalProjectId}/locations/${finalRegion}/collections/default_collection/dataStores/${finalDataStoreId}/servingConfigs/default_search:search`;

        const response = await fetch(searchUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenResponse.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: 'test', pageSize: 1 }),
        });

        const latency = Date.now() - startTime;

        if (response.ok) {
          groundingSearch = { status: 'ok', latency };
        } else {
          console.error('[copilot-health] grounding probe failed', response.status, await response.text());
          groundingSearch = { status: 'error', error: 'Grounding search check failed', latency };
        }
      } catch (error) {
        console.error('[copilot-health] grounding probe threw', error);
        groundingSearch = { status: 'error', error: 'Grounding search check failed' };
      }
    } else if (groundingEnabled) {
      groundingSearch = { status: 'disabled', error: 'Grounding search is not enabled for this workspace' };
    }

    return new Response(
      JSON.stringify({ managedAi, groundingSearch, residency: finalRegion }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const requestId = crypto.randomUUID();
    console.error('[copilot-health] health check error', requestId, error);
    return new Response(
      JSON.stringify({
        managedAi: { status: 'error', error: 'Health check failed' },
        groundingSearch: { status: 'error', error: 'Health check failed' },
        residency: 'unknown',
        requestId,
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
