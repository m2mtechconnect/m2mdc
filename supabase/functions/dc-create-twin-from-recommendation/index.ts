import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";


Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "Session ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user ID from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the scan session
    const { data: session, error: sessionError } = await supabase
      .from("dc_scan_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: "Scan session not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if twin already created
    if (session.blueprint_id) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          twinId: session.blueprint_id,
          message: "Twin already exists"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the blueprint template
    const { data: template, error: templateError } = await supabase
      .from("dc_blueprint_templates")
      .select("*")
      .eq("slug", session.blueprint_profile)
      .single();

    if (templateError || !template) {
      return new Response(
        JSON.stringify({ error: "Blueprint template not found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract recommendation data
    const recommendation = session.recommendation_json as any;
    const domain = (() => {
      try {
        return new URL(session.url).hostname.replace("www.", "").split(".")[0];
      } catch {
        return "new";
      }
    })();

    // Generate a slug
    const timestamp = Date.now();
    const slug = `${domain}-${session.blueprint_profile}-${timestamp}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");

    // Create the digital twin record
    const twinConfig = {
      sourceUrl: session.url,
      detectedIndustry: session.detected_industry,
      blueprintProfile: session.blueprint_profile,
      capacity: recommendation?.suggestedCapacityKw || template.default_capacity_kw,
      tier: template.default_tier,
      targetPue: template.target_pue,
      renewableTargetPct: template.renewable_target_pct,
      sovereignComputePct: template.sovereign_compute_pct,
      annualCarbonTargetTonnes: template.annual_carbon_target_tonnes,
      agents: template.default_agents || [],
      complianceFocus: template.compliance_focus || [],
      sustainabilityFocus: template.sustainability_focus || [],
      costFocus: template.cost_focus,
      createdFromScan: true,
      scanSessionId: sessionId
    };

    const { data: twin, error: twinError } = await supabase
      .from("digital_twins")
      .insert({
        user_id: user.id,
        name: recommendation?.blueprintName || template.name,
        slug,
        description: recommendation?.summary || template.description,
        config: twinConfig,
        status: "active"
      })
      .select()
      .single();

    if (twinError) {
      console.error("Twin creation error:", twinError);
      return new Response(
        JSON.stringify({ error: "Failed to create twin" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the scan session with the twin ID
    await supabase
      .from("dc_scan_sessions")
      .update({ blueprint_id: twin.id })
      .eq("id", sessionId);

    // Create agent definition bindings for the twin
    const agentSlugs = template.default_agents || [];
    if (agentSlugs.length > 0) {
      // Fetch system default agent definitions
      const { data: agents } = await supabase
        .from("agent_definitions")
        .select("id, slug")
        .in("slug", agentSlugs)
        .eq("is_system_default", true);

      // If we have matching agents, we could create bindings here
      // For now, the agents are stored in the twin config
    }

    return new Response(
      JSON.stringify({
        success: true,
        twinId: twin.id,
        twinSlug: slug,
        twinName: twin.name
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Create twin error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Creation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
