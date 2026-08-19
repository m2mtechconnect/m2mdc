/**
 * AURA DC - RAG document upload endpoint.
 *
 * STATUS: STUBBED (Phase 0 containment).
 *
 * The previous implementation accepted file bytes, DISCARDED them, inserted a
 * `queued` row and reported success to the UI. Documents could therefore never
 * become retrievable, while the interface claimed ingestion had started.
 *
 * Until object storage, checksum verification, extraction, chunking and
 * embedding generation exist, this endpoint rejects uploads honestly instead of
 * persisting a misleading `queued` record.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { getCorsHeaders } from "../_shared/cors.ts";

// Scoped CORS headers for this invocation. Module-level helpers below render
// responses, so the resolved headers are held here and refreshed per request.
let corsHeaders = getCorsHeaders(null);



const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    console.log("[rag-upload] upload rejected: ingestion pipeline not implemented");

    return json(
      {
        error:
          "Document ingestion is unavailable: AURA DC has no object storage or extraction pipeline yet, so uploaded bytes cannot be stored or indexed. Nothing was saved.",
        status: "ingestion_unavailable",
        capability_status: "STUBBED",
        items: [],
      },
      501,
    );
  } catch (error) {
    console.error("[rag-upload] Error:", error);
    return json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
