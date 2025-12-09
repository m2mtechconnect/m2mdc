/**
 * /v1/analyze-document-with-gemini
 * 
 * PURPOSE: Advanced Gemini 3.0 / 2.5 Flash document analysis
 * Generates complete Twin/Agent creation plan from documents
 * 
 * AUTH: public (no auth required)
 * 
 * REQUEST:
 * - fileName: string
 * - fileContent: string
 * - fileType: string
 * - userId: string (optional)
 * 
 * RESPONSE: DraftAgentPlan object for builder pre-population
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";

const InputSchema = z.object({
  fileName: z.string().min(1),
  fileContent: z.string().min(1),
  fileType: z.string().optional(),
  userId: z.string().optional(),
});

serve(createHandler({
  name: "analyze-document-with-gemini",
  authLevel: "public",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { fileName, fileContent, fileType, userId } = input;
    const { supabase, log } = context;

    const startTime = Date.now();
    log("Starting Gemini analysis", { fileName, fileType });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "LOVABLE_API_KEY not configured",
        status: 500,
      };
    }

    // Use Gemini 3.0 Pro for deep document understanding
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-preview",
        messages: [
          {
            role: "system",
            content: `You are an AI architect that analyzes documents to design Digital Twins and AI Agents.

Analyze the document deeply and return a comprehensive plan as JSON:

{
  "summary": "2-3 sentence summary",
  "detected_industry": "Healthcare | Finance | Manufacturing | Retail | Logistics | HR | Marketing | Operations | etc.",
  "detected_department": "Operations | Finance | HR | Sales | Marketing | IT | Legal | Customer Support | etc.",
  "recommended_agent_type": "AI Agent | Process Twin | Decision Twin | Financial Twin | Operational Twin | Workforce Twin",
  "recommended_twin_type": "Process Twin | Decision Twin | Financial Twin | Operational Twin | Workforce Twin | null",
  "use_case": "Brief description of the ideal use case",
  "detected_entities": {
    "people": ["..."],
    "organizations": ["..."],
    "processes": ["..."],
    "systems": ["..."],
    "kpis": ["..."]
  },
  "suggested_workflows": [
    {
      "name": "Workflow name",
      "description": "What it does",
      "trigger": "When should this run",
      "actions": ["Action 1", "Action 2"],
      "integration_needed": ["System A", "System B"]
    }
  ],
  "suggested_integrations": ["Salesforce", "Slack", "Google Drive", "Notion", "HubSpot", "etc."],
  "detected_kpis": [
    {
      "name": "KPI name",
      "current_estimate": "Current value or estimate",
      "target_improvement": "10% reduction | 20% increase | etc."
    }
  ],
  "rag_requirements": {
    "needs_rag": true/false,
    "data_sources": ["This document", "CRM", "etc."],
    "recommended_chunks": 500,
    "recommended_overlap": 50
  },
  "risk_level": "Low | Medium | High",
  "compliance_requirements": ["GDPR", "HIPAA", "SOC2", "ISO27001", "etc."],
  "estimated_complexity": "Low | Medium | High",
  "suggested_safety_policies": ["Human approval for X", "Read-only access to Y", "etc."],
  "analysis_tokens": 0
}

Be specific. Don't use placeholders. Make real recommendations.`,
          },
          {
            role: "user",
            content: `File: ${fileName}\nType: ${fileType || 'unknown'}\n\nContent:\n${fileContent.substring(0, 12000)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log("Gemini API error", { status: response.status, error: errorText });

      if (response.status === 429) {
        throw {
          code: ErrorCodes.EXTERNAL_API_ERROR,
          message: "Rate limit exceeded. Please try again in a moment.",
          status: 429,
        };
      }

      if (response.status === 402) {
        throw {
          code: ErrorCodes.EXTERNAL_API_ERROR,
          message: "Usage limit reached. Please add credits in Settings → Usage.",
          status: 402,
        };
      }

      throw {
        code: ErrorCodes.EXTERNAL_API_ERROR,
        message: `Gemini API error: ${response.status}`,
        status: 502,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw {
        code: ErrorCodes.EXTERNAL_API_ERROR,
        message: "No response from Gemini",
        status: 502,
      };
    }

    log("Gemini response received");

    // Parse JSON response
    let analysis;
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      analysis = JSON.parse(jsonStr);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown parse error';
      log("Failed to parse Gemini JSON", { error: errorMsg });
      // Fallback structure
      analysis = {
        summary: content.substring(0, 500),
        detected_industry: "General",
        detected_department: "Operations",
        recommended_agent_type: "AI Agent",
        recommended_twin_type: null,
        use_case: "Document analysis and automation",
        detected_entities: { people: [], organizations: [], processes: [], systems: [], kpis: [] },
        suggested_workflows: [],
        suggested_integrations: [],
        detected_kpis: [],
        rag_requirements: { needs_rag: true, data_sources: [fileName], recommended_chunks: 500, recommended_overlap: 50 },
        risk_level: "Medium",
        compliance_requirements: [],
        estimated_complexity: "Medium",
        suggested_safety_policies: [],
        analysis_tokens: 0,
      };
    }

    // Store in indexed_content for RAG
    let indexedId;
    try {
      const { data: indexedData, error: indexError } = await supabase
        .from("indexed_content")
        .insert({
          source_type: "doc",
          source_name: fileName,
          title: fileName,
          content: fileContent.substring(0, 15000),
          user_id: userId || null,
          metadata: {
            file_type: fileType,
            gemini_analysis: analysis,
            analyzed_at: new Date().toISOString(),
          },
        })
        .select()
        .single();

      if (!indexError && indexedData) {
        indexedId = indexedData.id;
        log("Stored in indexed_content", { indexedId });
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown storage error';
      log("Failed to store content", { error: errorMsg });
    }

    const latency = Date.now() - startTime;

    return {
      ...analysis,
      file_name: fileName,
      file_type: fileType || 'unknown',
      indexed_id: indexedId,
      latency_ms: latency,
      powered_by: "Gemini 3.0 Pro",
    };
  }
}));
