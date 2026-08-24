import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callerRejectedResponse, requireCaller } from "../_shared/callerIdentity.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await requireCaller(req);

    const managedAvailable = !!Deno.env.get("LOVABLE_API_KEY");
    const externalEnabled = Deno.env.get("USE_EXTERNAL_GOOGLE") === "true";
    const externalConfigured = !!(
      Deno.env.get("GOOGLE_APPLICATION_CREDENTIALS_JSON") &&
      Deno.env.get("GOOGLE_PROJECT_ID")
    );

    // Customer-facing callers receive capability state only. Provider names,
    // model identifiers, project ids and infrastructure locations stay server-side.
    const config = {
      managed_ai: {
        available: managedAvailable,
      },
      external_ai: {
        enabled: externalEnabled && externalConfigured,
        configured: externalConfigured,
      },
      active_mode: externalEnabled && externalConfigured ? "external" : "managed",
      ready: managedAvailable || (externalEnabled && externalConfigured),
    };

    return new Response(JSON.stringify(config), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const rejected = callerRejectedResponse(error, req);
    if (rejected) return rejected;

    console.error("Config error:", error);
    return new Response(JSON.stringify({
      error: "Failed to load configuration",
      requestId: crypto.randomUUID(),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
