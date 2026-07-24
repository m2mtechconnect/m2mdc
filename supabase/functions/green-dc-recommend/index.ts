/**
 * green-dc-recommend
 * 
 * PURPOSE: Generate Green Data Centre Twin recommendations from a scanned URL
 * AUTH: public (no JWT required - uses existing crawl data)
 * 
 * REQUEST:
 * - url: string (required) - Website URL to analyze
 * - forceRecrawl: boolean (optional) - Force re-crawl of the site
 * - deepRecrawl: boolean (optional) - Deep crawl with more pages
 * 
 * RESPONSE:
 * - status: 'ok' | 'error'
 * - recommendation: GreenDcTwinRecommendation (if status ok)
 * - message: string (if status error)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// PR-0.1 Checkpoint B: this function is DISABLED for the pilot surface.
// - Excluded from the production allowlist
//   (docs/remediation/evidence/pr-0.1/route-allowlist.json)
// - Gateway JWT verification restored (supabase/config.toml)
// - Runtime path below fails closed with 503 and performs no outbound HTTP.
// SSRF hardening / restoration is DEFERRED to a later checkpoint.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return new Response(
    JSON.stringify({
      status: "error",
      code: "FUNCTION_DISABLED",
      message:
        "green-dc-recommend is disabled for the PR-0.1 pilot surface. No outbound requests performed.",
    }),
    {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
