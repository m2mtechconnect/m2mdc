import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";


// Industry keywords for detection
const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  finance: [
    "bank", "banking", "fintech", "financial", "investment", "trading",
    "insurance", "payments", "credit", "loan", "mortgage", "wealth",
    "asset management", "capital markets", "securities", "cryptocurrency"
  ],
  government: [
    "government", "gov", "federal", "state", "municipal", "city of",
    "public sector", "ministry", "department of", "agency", "defense"
  ],
  retail: [
    "retail", "ecommerce", "e-commerce", "shop", "store", "marketplace",
    "consumer", "fashion", "grocery", "supermarket", "online shopping"
  ],
  telecom: [
    "telecom", "telecommunications", "carrier", "mobile", "wireless", "5g",
    "network operator", "isp", "broadband", "fiber"
  ],
  cloud_saas: [
    "saas", "software as a service", "cloud platform", "b2b software",
    "enterprise software", "api", "developer platform", "devops"
  ],
  manufacturing: [
    "manufacturing", "industrial", "factory", "production", "automation",
    "robotics", "iot", "industry 4.0", "supply chain"
  ],
  healthcare: [
    "healthcare", "health", "medical", "hospital", "pharmaceutical",
    "biotech", "life sciences", "clinical", "patient", "telemedicine"
  ],
  energy: [
    "energy", "utility", "power", "electricity", "grid", "renewable",
    "solar", "wind", "oil", "gas", "clean energy"
  ],
  ai_compute: [
    "artificial intelligence", "machine learning", "deep learning",
    "foundation model", "llm", "large language model", "generative ai",
    "gpu", "hpc", "high performance computing"
  ]
};

// AI keywords for intensity scoring
const AI_KEYWORDS = [
  "ai", "artificial intelligence", "machine learning", "ml", "deep learning",
  "neural", "model", "training", "inference", "gpu", "llm", "genai"
];

// Blueprint profile mapping
const INDUSTRY_TO_BLUEPRINT: Record<string, string> = {
  finance: "finance_green_dc",
  government: "gov_sovereign_dc",
  retail: "retail_edge_dc",
  telecom: "telco_regional_dc",
  cloud_saas: "saas_multi_tenant_dc",
  manufacturing: "industrial_ai_dc",
  healthcare: "healthcare_compliant_dc",
  energy: "energy_low_carbon_dc",
  ai_compute: "sovereign_ai_factory_dc",
  other: "saas_multi_tenant_dc"
};

function detectIndustry(content: string, url: string): string {
  const lowerContent = (content + " " + url).toLowerCase();
  const scores: Record<string, number> = {};

  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    scores[industry] = 0;
    for (const keyword of keywords) {
      if (lowerContent.includes(keyword)) {
        scores[industry] += 1;
      }
    }
  }

  let maxScore = 0;
  let detectedIndustry = "other";
  
  for (const [industry, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedIndustry = industry;
    }
  }

  if (maxScore < 2) {
    const techKeywords = ["software", "platform", "tech", "digital", "app"];
    if (techKeywords.some(k => lowerContent.includes(k))) {
      return "cloud_saas";
    }
  }

  return detectedIndustry;
}

function calculateAIIntensity(content: string): number {
  const lowerContent = content.toLowerCase();
  let score = 0;
  
  for (const keyword of AI_KEYWORDS) {
    const matches = (lowerContent.match(new RegExp(keyword, "g")) || []).length;
    score += Math.min(matches * 5, 20);
  }
  
  return Math.min(score, 100);
}

function selectBlueprintProfile(industry: string, aiIntensity: number): string {
  if (aiIntensity >= 60) {
    return "sovereign_ai_factory_dc";
  }
  
  if (industry === "cloud_saas" && aiIntensity >= 40) {
    return "sovereign_ai_factory_dc";
  }
  
  return INDUSTRY_TO_BLUEPRINT[industry] || "saas_multi_tenant_dc";
}

function estimateScale(content: string): string {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes("hyperscale") || lowerContent.includes("exabyte")) {
    return "hyperscale";
  }
  if (lowerContent.includes("fortune 500") || lowerContent.includes("global") || lowerContent.includes("worldwide")) {
    return "large";
  }
  if (lowerContent.includes("startup") || lowerContent.includes("small team")) {
    return "small";
  }
  return "medium";
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
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

    // Normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Try to fetch content using Firecrawl if available
    let content = "";
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    
    if (firecrawlKey) {
      try {
        const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: normalizedUrl,
            formats: ["markdown"],
            onlyMainContent: true,
          }),
        });
        
        const scrapeData = await scrapeResponse.json();
        if (scrapeData.success && scrapeData.data?.markdown) {
          content = scrapeData.data.markdown;
        }
      } catch (e) {
        console.error("Firecrawl error:", e);
      }
    }

    // If no content, use basic fetch
    if (!content) {
      try {
        const response = await fetch(normalizedUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; DCScanner/1.0)" }
        });
        const html = await response.text();
        // Extract text content (basic)
        content = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
                      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
                      .replace(/<[^>]+>/g, " ")
                      .replace(/\s+/g, " ")
                      .slice(0, 50000);
      } catch (e) {
        console.error("Fetch error:", e);
        content = normalizedUrl; // Use URL as minimal content
      }
    }

    // Analyze content
    const industry = detectIndustry(content, normalizedUrl);
    const aiIntensity = calculateAIIntensity(content);
    const blueprintProfile = selectBlueprintProfile(industry, aiIntensity);
    const scale = estimateScale(content);

    // Get the blueprint template
    const { data: template, error: templateError } = await supabase
      .from("dc_blueprint_templates")
      .select("*")
      .eq("slug", blueprintProfile)
      .single();

    if (templateError || !template) {
      return new Response(
        JSON.stringify({ error: "Blueprint template not found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate recommendation
    const domain = new URL(normalizedUrl).hostname.replace("www.", "");
    const industryLabels: Record<string, string> = {
      finance: "Financial Services",
      government: "Government & Public Sector",
      retail: "Retail & E-commerce",
      telecom: "Telecommunications",
      cloud_saas: "Cloud & SaaS",
      manufacturing: "Manufacturing & Industrial",
      healthcare: "Healthcare & Life Sciences",
      energy: "Energy & Utilities",
      ai_compute: "AI & High-Performance Computing",
      other: "General Enterprise"
    };

    const scaleMultipliers: Record<string, number> = {
      small: 0.5,
      medium: 1.0,
      large: 1.5,
      hyperscale: 3.0
    };

    const capacity = Math.round(
      template.default_capacity_kw * 
      (scaleMultipliers[scale] || 1.0) * 
      (aiIntensity >= 60 ? 1.5 : aiIntensity >= 40 ? 1.2 : 1.0)
    );

    const agentNames: Record<string, string> = {
      thermal_guardian: "Thermal Guardian Agent",
      power_monitor: "Power & UPS Monitor",
      cooling_optimizer: "Cooling Optimization Agent",
      sovereignty_sentinel: "Sovereignty Sentinel",
      financial_carbon_agent: "Financial & Carbon Agent",
      incident_response: "Incident Response Agent",
      workload_orchestrator: "Workload Orchestrator",
      gpu_scheduler: "GPU Scheduler Agent",
      network_monitor: "Network Monitor Agent",
      facility_safety: "Facility Safety Agent"
    };

    // Create recommendation object
    const recommendation = {
      sessionId: "", // Will be set after insert
      url: normalizedUrl,
      detectedIndustry: industry,
      blueprintProfile,
      blueprintName: template.name,
      summary: `Based on analysis of ${domain}, your organization operates in the ${industryLabels[industry] || industry} sector. We recommend the ${template.name} optimized for ${(template.compliance_focus || []).slice(0, 2).join(" and ")} compliance with a target PUE of ${template.target_pue} and ${template.renewable_target_pct}% renewable energy.`,
      suggestedCapacityKw: capacity,
      suggestedTier: template.default_tier,
      mainKPIs: [
        `PUE < ${template.target_pue}`,
        `${template.renewable_target_pct}% Renewable Energy`,
        `${template.sovereign_compute_pct}% Sovereign Compute`,
        `< ${template.annual_carbon_target_tonnes} tonnes CO₂/year`
      ],
      coreAgents: (template.default_agents || []).map((a: string) => agentNames[a] || a),
      carbonTarget: `${template.renewable_target_pct}% renewable energy mix with target of < ${template.annual_carbon_target_tonnes} tonnes CO₂ annually`,
      costFocus: template.cost_focus || "",
      complianceFocus: template.compliance_focus || [],
      sustainabilityFocus: template.sustainability_focus || []
    };

    // Store scan session
    const rawSignals = {
      url: normalizedUrl,
      industry,
      aiIntensityScore: aiIntensity,
      complianceKeywords: [],
      scaleSignals: { careersPageHints: scale, cloudProviderMentions: [] }
    };

    const { data: session, error: sessionError } = await supabase
      .from("dc_scan_sessions")
      .insert({
        user_id: user.id,
        url: normalizedUrl,
        detected_industry: industry,
        traffic_scale: scale,
        sustainability_priority: aiIntensity >= 40 ? "high" : "medium",
        blueprint_profile: blueprintProfile,
        recommendation_json: recommendation,
        raw_signals: rawSignals
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Session insert error:", sessionError);
      return new Response(
        JSON.stringify({ error: "Failed to save scan session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update recommendation with session ID
    recommendation.sessionId = session.id;

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        recommendation
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Scan error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Scan failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
