/**
 * AURA DC - RAG retrieval test endpoint.
 *
 * STATUS: STUBBED (Phase 0 containment).
 *
 * The previous implementation fabricated answers, citations, page numbers,
 * relevance scores and token counts. That is a truth-in-UI violation: the
 * retrieval pipeline (extraction, chunking, embeddings, reranking, model
 * inference) does not exist yet.
 *
 * Until the AURA DC agent service (NIM + NeMo Retriever + pgvector) is
 * implemented, this endpoint returns a grounded failure state. Do NOT
 * reintroduce synthetic answers, citations or usage figures here.
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

    const body = await req.json().catch(() => ({}));
    const { system_id, query } = body ?? {};
    if (!system_id || !query) {
      return json({ error: "system_id and query are required" }, 400);
    }

    console.log(
      `[rag-test] grounded-failure returned (retrieval pipeline not implemented) system=${system_id}`,
    );

    return json(
      {
        error:
          "Retrieval is unavailable: the AURA DC document retrieval pipeline is not implemented yet. No answer, citations or usage figures can be produced.",
        status: "retrieval_unavailable",
        capability_status: "STUBBED",
        answer: null,
        citations: [],
        retrieval: null,
        usage: null,
      },
      501,
    );
  } catch (error) {
    console.error("[rag-test] Error:", error);
    return json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
