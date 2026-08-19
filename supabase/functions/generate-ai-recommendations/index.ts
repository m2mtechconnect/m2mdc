/**
 * DEPRECATED: This edge function is deprecated and should not be used.
 * 
 * Use 'url-recommendations' instead for Digital Twin template recommendations.
 * Use 'green-dc-recommend' for Green DC Twin recommendations.
 * 
 * This file is preserved for backward compatibility but returns an error directing
 * callers to use the new endpoints.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";


serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Return deprecation notice
  return new Response(
    JSON.stringify({ 
      error: 'DEPRECATED: This endpoint is deprecated. Use url-recommendations for Digital Twin recommendations or green-dc-recommend for Green DC Twin recommendations.',
      deprecated: true,
      alternatives: [
        'url-recommendations',
        'green-dc-recommend'
      ]
    }),
    { 
      status: 410, // Gone
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
});
