/**
 * /v1/builder-generate-summary
 * 
 * PURPOSE: Generate business summary for AI system
 * AUTH: public (no auth required)
 * 
 * REQUEST:
 * - systemName: string (required)
 * - department: string (optional)
 * - outcome: string (optional)
 * - successMetric: string (optional)
 * - selectedModel: string (optional)
 * - connectedTools: array (optional)
 * - integrations: array (optional)
 * - roiEstimate: object (optional)
 * - recommendationData: object (optional)
 * - systemPrompt: string (optional)
 * 
 * RESPONSE:
 * - summary: Generated business summary text
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";

// Input validation schema
const InputSchema = z.object({
  systemName: z.string().min(1, "System name is required"),
  department: z.string().optional(),
  outcome: z.string().optional(),
  successMetric: z.string().optional(),
  selectedModel: z.string().optional(),
  connectedTools: z.array(z.unknown()).optional().default([]),
  integrations: z.array(z.unknown()).optional().default([]),
  roiEstimate: z.record(z.unknown()).optional(),
  recommendationData: z.record(z.unknown()).optional(),
  systemPrompt: z.string().optional(),
  digitalTwinDraft: z.record(z.unknown()).optional(),
});

serve(createHandler({
  name: "builder-generate-summary",
  authLevel: "public",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const {
      systemName,
      department,
      outcome,
      successMetric,
      selectedModel,
      connectedTools,
      integrations,
      roiEstimate,
      recommendationData,
      systemPrompt,
      digitalTwinDraft
    } = input;
    const { log } = context;

    log("Generating system summary", { 
      systemName, 
      hasRecommendationData: !!recommendationData,
      hasDigitalTwinDraft: !!digitalTwinDraft
    });

    // Get Lovable API key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw {
        code: 'CONFIGURATION_ERROR',
        message: 'AI service not configured',
        status: 500,
      };
    }

    // Build digital twin context
    const twinContext = digitalTwinDraft ? `

DIGITAL TWIN PROCESS MODEL:
────────────────────────────────────
Type: Process Twin
Goal: ${(digitalTwinDraft as any).goal || 'N/A'}
Entities: ${(digitalTwinDraft as any).entities?.length || 0} defined (${(digitalTwinDraft as any).entities?.map((e: any) => e.name).join(', ') || 'N/A'})
Events: ${(digitalTwinDraft as any).events?.length || 0} trigger events
Workflow Nodes: ${(digitalTwinDraft as any).workflow?.nodes?.length || 0} nodes
Entry Point: ${(digitalTwinDraft as any).workflow?.entryPoint || 'N/A'}

This system is backed by a Digital Twin that models the real-world process.
Your summary MUST describe it as a process automation with structured workflow.
` : '';

    // Build recommendation context
    const recContext = recommendationData ? `

SELECTED AI RECOMMENDATION CONTEXT:
────────────────────────────────────
Title: ${recommendationData.title || 'N/A'}
Problem Statement: ${recommendationData.problem || 'N/A'}
Proposed Solution: ${recommendationData.solution || 'N/A'}
Expected Impact: ${recommendationData.impact || 'N/A'}
Industry: ${recommendationData.industry || 'N/A'}
Department: ${recommendationData.department || 'N/A'}
Tags: ${(recommendationData.tags as string[] || []).join(', ') || 'N/A'}
Source: ${recommendationData.source || 'N/A'}

This recommendation was specifically selected by the user. Your summary MUST explicitly reference this recommendation context throughout.
` : `

Note: No recommendation context provided. Generate summary based only on system configuration.
`;

    const prompt = `You are summarizing an AI system built in the Agentic Studio.
${twinContext}
${recContext}

SYSTEM CONFIGURATION:
────────────────────────────────────
- Name: ${systemName}
- Department: ${department || "Not specified"}
- Desired Outcome: ${outcome || "Not specified"}
- Success Metric: ${successMetric || "Not specified"}
- AI Model: ${selectedModel || "Not specified"}
- Connected Tools: ${connectedTools?.length || 0} MCP servers
- Integrations: ${integrations?.length || 0} apps
- ROI Estimate: ${roiEstimate ? JSON.stringify(roiEstimate, null, 2) : "Not calculated"}

SYSTEM PROMPT (Current Behavior Configuration):
────────────────────────────────────
${systemPrompt || "Not yet configured - use generic behavior description"}

INSTRUCTIONS:
────────────────────────────────────
Summarize this system in plain business language using this structure:

1. **System Overview**: One compelling sentence that connects the system to the selected recommendation (if provided) OR the digital twin process model (if configured). If it's a process twin, mention it automates a real-world workflow with structured events and approvals. If the system prompt has been configured, reference its defined behavior.

2. **Department Impact**: 2-3 sentences on how this helps the ${department || "target"} department specifically. If a recommendation was provided, explain how this system delivers on the recommended solution. If it's a digital twin, explain how it mirrors and optimizes the real process. Reference the system prompt's defined behavior and tone if configured. Include concrete metrics like time savings, cost reductions, or accuracy improvements if available.

3. **Core Intelligence**: Brief description of the AI model (${selectedModel || "selected model"}) and how it implements the system prompt's defined behavior. If it's a digital twin, mention how AI is used within the workflow (classification, decision support, etc.). Mention if it's optimized for speed, accuracy, or cost.

4. **Connected Tools & Data**: Describe the ${connectedTools?.length || 0} MCP servers and ${integrations?.length || 0} integrations. If it's a digital twin, mention the ${(digitalTwinDraft as any)?.entities?.length || 0} entities and ${(digitalTwinDraft as any)?.events?.length || 0} events being tracked. If none, say "Direct configuration without external dependencies."

5. **Performance Goals**: Translate the success metric (${successMetric || "efficiency metrics"}) into clear targets. If ROI data or recommendation impact metrics are provided, use specific numbers (e.g., "X hours saved per week", "$Y annual savings", "Z% accuracy improvement").

6. **Expected Outcome**: 2-3 bullet points showing specific business value this system delivers:
   - If a recommendation was provided, explain how the system fulfills the recommended solution
   - If it's a digital twin, explain how process automation and human-in-the-loop approvals deliver value
   - If ROI data is available, cite specific numbers (annual savings, time saved, accuracy gains)
   - Ground everything in concrete, measurable outcomes

CRITICAL REQUIREMENTS:
- If a digital twin is configured, you MUST describe it as a process automation with structured workflow
- If a recommendation context was provided, you MUST explicitly reference it throughout the summary
- Use specific numbers from the recommendation and ROI data when available
- Connect the system configuration back to the original problem/solution
- Keep tone professional, concise, and positive
- Use clear business language, not technical jargon`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a business analyst creating clear, compelling system summaries. Write in a professional, accessible tone." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log("AI API error", { status: response.status, error: errorText });
      
      if (response.status === 429) {
        throw {
          code: ErrorCodes.EXTERNAL_API_ERROR,
          message: "Rate limit exceeded, please try again later.",
          status: 429,
        };
      }
      if (response.status === 402) {
        throw {
          code: ErrorCodes.EXTERNAL_API_ERROR,
          message: "Payment required, please add funds to your Lovable AI workspace.",
          status: 402,
        };
      }
      throw {
        code: ErrorCodes.EXTERNAL_API_ERROR,
        message: `AI gateway error: ${response.status}`,
        status: 500,
      };
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content;

    if (!summary) {
      throw new Error("No content in AI response");
    }

    log("Summary generated successfully");

    return { summary };
  }
}));
