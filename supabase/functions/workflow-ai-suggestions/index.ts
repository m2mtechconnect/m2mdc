import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nodes, edges } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Analyze workflow structure
    const nodeTypes = nodes.map((n: any) => n.type).join(", ");
    const nodeCount = nodes.length;
    const edgeCount = edges?.length || 0;
    
    const systemPrompt = `You are an expert workflow optimization assistant. Analyze workflows and provide:
1. Next node suggestions based on current structure
2. Optimization tips to improve efficiency
3. Best practice recommendations

Keep suggestions concise, actionable, and prioritized. Format as structured JSON.`;

    const userPrompt = `Current workflow:
- Nodes (${nodeCount}): ${nodeTypes || "empty"}
- Connections: ${edgeCount}

Provide:
1. 2-3 suggested next nodes to add (with reasons)
2. 1-2 optimization tips for current structure
3. Overall workflow health score (1-10)`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_workflow_suggestions",
              description: "Return workflow suggestions and optimization tips",
              parameters: {
                type: "object",
                properties: {
                  nextNodes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        nodeType: { type: "string" },
                        reason: { type: "string" },
                        priority: { type: "string", enum: ["high", "medium", "low"] }
                      },
                      required: ["nodeType", "reason", "priority"],
                      additionalProperties: false
                    }
                  },
                  optimizationTips: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        tip: { type: "string" },
                        impact: { type: "string", enum: ["high", "medium", "low"] }
                      },
                      required: ["tip", "impact"],
                      additionalProperties: false
                    }
                  },
                  healthScore: { type: "number", minimum: 1, maximum: 10 },
                  summary: { type: "string" }
                },
                required: ["nextNodes", "optimizationTips", "healthScore", "summary"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "provide_workflow_suggestions" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("No suggestions returned from AI");
    }

    const suggestions = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify(suggestions),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in workflow-ai-suggestions:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        fallback: {
          nextNodes: [],
          optimizationTips: [],
          healthScore: 5,
          summary: "Unable to generate suggestions at this time."
        }
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
