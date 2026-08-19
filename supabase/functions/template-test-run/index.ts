import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";


interface TestRunResult {
  success: boolean;
  answer: string;
  snippets: string[];
  citations: string[];
  faithfulnessScore: number;
  latencyMs: number;
  error?: string;
}

// Seeded scenarios per template
const testScenarios: Record<string, { query: string; expectedKeywords: string[] }> = {
  compliance_ai_healthcare: {
    query: "What are the HIPAA requirements for patient data encryption?",
    expectedKeywords: ["encryption", "HIPAA", "patient", "data"],
  },
  predictive_maintenance_energy: {
    query: "Analyze this sensor reading for anomalies: temperature 95°C, vibration 8.5mm/s",
    expectedKeywords: ["anomaly", "temperature", "vibration", "threshold"],
  },
  quality_control_manufacturing: {
    query: "Classify this defect: surface scratch 2mm depth on component A",
    expectedKeywords: ["defect", "scratch", "classification", "quality"],
  },
  marketing_campaign_bot: {
    query: "Generate a campaign for tech-savvy millennials interested in sustainability",
    expectedKeywords: ["campaign", "millennials", "sustainability", "message"],
  },
  finance_report_automation: {
    query: "Analyze Q4 variance: revenue $2.5M vs budget $2.8M",
    expectedKeywords: ["variance", "revenue", "budget", "analysis"],
  },
  onboarding_assistant_hr: {
    query: "Screen this candidate: 5 years experience, MBA, seeking $95k salary",
    expectedKeywords: ["candidate", "experience", "qualification", "fit"],
  },
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { templateId, config } = await req.json();
    
    console.log(`Running test for template: ${templateId}`);

    const startTime = Date.now();
    
    // Get test scenario
    const scenario = testScenarios[templateId];
    if (!scenario) {
      throw new Error(`No test scenario found for template: ${templateId}`);
    }

    // Simulate AI call (in production would call Lovable AI Gateway)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config?.llm?.model || "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: config?.system_prompt || "You are a helpful AI assistant.",
          },
          {
            role: "user",
            content: scenario.query,
          },
        ],
        temperature: config?.llm?.temperature || 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI Gateway error: ${aiResponse.status} ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content || "No response generated";
    
    const latencyMs = Date.now() - startTime;

    // Simulate grounding with mock snippets
    const snippets = [
      "Source document reference 1",
      "Regulatory guideline reference 2",
    ];

    const citations = [
      "Document A, Section 3.2",
      "Policy Guide B, Page 15",
    ];

    // Calculate faithfulness score (mock - would use actual grounding in production)
    const keywordMatches = scenario.expectedKeywords.filter(keyword =>
      answer.toLowerCase().includes(keyword.toLowerCase())
    );
    const faithfulnessScore = (keywordMatches.length / scenario.expectedKeywords.length) * 100;

    const result: TestRunResult = {
      success: true,
      answer,
      snippets,
      citations,
      faithfulnessScore: Math.round(faithfulnessScore),
      latencyMs,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Test run error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        answer: "",
        snippets: [],
        citations: [],
        faithfulnessScore: 0,
        latencyMs: 0,
        error: error instanceof Error ? error.message : "Unknown test error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
