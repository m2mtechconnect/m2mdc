/**
 * /v1/health
 * 
 * PURPOSE: Service health check for AI and integration providers
 * AUTH: public (no auth required)
 * 
 * REQUEST: None
 * 
 * RESPONSE:
 * - gemini: AI service status (lovable_managed or external_google)
 * - vertex: Vertex Search status
 * - zapier: Zapier availability
 * - region: Deployment region
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHandler } from "../_shared/handler.ts";

let cachedResult: any = null;
let cacheTime = 0;
const CACHE_DURATION = 60000; // 60s

serve(createHandler({
  name: "health",
  authLevel: "public",
  handler: async (input, context) => {
    const { log } = context;

    // Check cache
    const now = Date.now();
    if (cachedResult && (now - cacheTime) < CACHE_DURATION) {
      log("Returning cached health check");
      return cachedResult;
    }

    log("Performing health check");

    const results: any = {
      gemini: { status: 'unknown', latency: 0 },
      vertex: { status: 'unknown', latency: 0 },
      zapier: { status: 'unknown', latency: 0 },
      region: Deno.env.get('GOOGLE_LOCATION') || 'northamerica-northeast1'
    };

    // Check AI - Primary: Lovable managed, Optional: External Google
    const geminiStart = Date.now();
    try {
      const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
      const useExternalGoogle = Deno.env.get('USE_EXTERNAL_GOOGLE') === 'true';
      const googleCreds = Deno.env.get('GOOGLE_APPLICATION_CREDENTIALS_JSON');
      const projectId = Deno.env.get('GOOGLE_PROJECT_ID');
      
      // Lovable managed is primary
      if (lovableApiKey) {
        results.gemini.status = 'healthy';
        results.gemini.provider = 'lovable_managed';
        results.gemini.latency = Date.now() - geminiStart;
      } 
      // Fallback to external Google if explicitly enabled
      else if (useExternalGoogle && googleCreds && projectId) {
        results.gemini.status = 'healthy';
        results.gemini.provider = 'external_google';
        results.gemini.latency = Date.now() - geminiStart;
      } 
      else {
        results.gemini.status = 'not_configured';
        log("AI provider not configured");
      }
    } catch (e) {
      log("AI health check failed", { error: String(e) });
      results.gemini.status = 'error';
      results.gemini.latency = Date.now() - geminiStart;
    }

    // Check Vertex Search
    const vertexStart = Date.now();
    try {
      const dataStoreId = Deno.env.get('VERTEX_DATA_STORE_ID');
      if (dataStoreId) {
        results.vertex.status = 'healthy';
        results.vertex.latency = Date.now() - vertexStart;
      } else {
        results.vertex.status = 'not_configured';
      }
    } catch (e) {
      log("Vertex health check failed", { error: String(e) });
      results.vertex.status = 'error';
      results.vertex.latency = Date.now() - vertexStart;
    }

    // Zapier is always available (user provides webhook)
    results.zapier.status = 'available';

    // Cache result
    cachedResult = results;
    cacheTime = now;

    log("Health check completed", { gemini: results.gemini.status, vertex: results.vertex.status });

    return results;
  }
}));
