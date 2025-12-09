import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain, url } = await req.json();

    if (!domain) {
      return new Response(
        JSON.stringify({ error: "domain is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build delete query
    let query = supabase
      .from("website_content_cache")
      .delete();

    if (url) {
      // Clear specific URL
      query = query.eq("url", url);
      console.log(`[Cache Clear] Clearing cache for URL: ${url}`);
    } else {
      // Clear entire domain
      query = query.eq("domain", domain);
      console.log(`[Cache Clear] Clearing cache for domain: ${domain}`);
    }

    const { data, error } = await query.select();

    if (error) {
      console.error("[Cache Clear] Error:", error);
      throw error;
    }

    const deletedCount = data?.length || 0;
    console.log(`[Cache Clear] Deleted ${deletedCount} cache entries for ${url || domain}`);

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount,
        domain,
        url: url || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Cache Clear] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
