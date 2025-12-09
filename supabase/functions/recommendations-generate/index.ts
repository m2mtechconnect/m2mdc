/**
 * /v1/recommendations-generate
 * 
 * PURPOSE: Generate AI-powered recommendations based on RAG content
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - departments: string[] (required, non-empty)
 * - systemId: string (optional, for context)
 * 
 * RESPONSE:
 * - recommendations: Array of recommendation objects
 * - metadata: Generation metadata
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

const SYSTEM_PROMPT = `You are an analyst generating CLIENT-FACING recommendations based ONLY on provided website excerpts (RAG results).
Task: Generate department-specific recommendations for Operations, Sales & Marketing, and Finance & Administration.

CRITICAL LANGUAGE RULES:
- Write FOR the client organization, not about M2M Tech
- Use "your organization", "your team", "your operations" as main actors
- Position M2M Tech as delivery/enablement partner only where relevant
- Focus on what the CLIENT will achieve with M2M Tech's support
- Example: "Enhance your customer engagement strategy with AI-powered insights, implemented in partnership with M2M Tech"

Rules:
- Use ONLY evidence from RAG results. Do not invent facts or use prior knowledge.
- Every recommendation must include: Actionable suggestion (client-focused), Why it matters (client benefit), Implementation steps (client actions with M2M support), Confidence (0–100), and at least one citation (URL + snippet id).
- If evidence is weak or missing, return: "Insufficient evidence in site content." for that department.
- Keep language concise, executive-ready, and specific to the client organization's stated offerings, positioning, and customer promises found on the site.
- Never output confidential or speculative claims.`;

// Input validation schema
const InputSchema = z.object({
  departments: z.array(z.string()).min(1, "At least one department required"),
  systemId: z.string().uuid().optional(),
});

// Recommendation schema
const RecommendationSchema = z.object({
  department: z.string(),
  recommendation: z.string().max(900),
  why_it_matters: z.string().max(400),
  steps: z.array(z.string()),
  confidence: z.number().min(0).max(100),
  citations: z.array(z.object({
    url: z.string(),
    snippet: z.string(),
    snippet_id: z.string().optional(),
  })),
});

serve(createHandler({
  name: "recommendations-generate",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { departments, systemId } = input;
    const { supabase, userId, log } = context;

    log("Generating recommendations", { departments, systemId });

    // Try to fetch RAG documents or knowledge sources
    let contextChunks: Array<{ url: string; content: string; id: string }> = [];
    
    // First try knowledge sources
    try {
      const { data: knowledgeSources } = await supabase
        .from('knowledge_sources')
        .select('name, description, tags, metadata')
        .eq('user_id', userId)
        .limit(10);
      
      if (knowledgeSources && knowledgeSources.length > 0) {
        contextChunks = knowledgeSources.map((ks: any, idx: number) => ({
          url: ks.name,
          content: `${ks.name}: ${ks.description || ''}`,
          id: `ks_${idx}`,
        }));
      }
    } catch (ksError) {
      log("Knowledge sources not available", { error: String(ksError) });
    }
    
    // Try RAG documents if knowledge sources empty
    if (contextChunks.length === 0) {
      try {
        const { data: ragData } = await supabase
          .from('rag_documents')
          .select('id, content, metadata')
          .eq('user_id', userId)
          .limit(20);
        
        if (ragData && ragData.length > 0) {
          contextChunks = ragData.map((doc: any, idx: number) => ({
            url: (doc.metadata as any)?.url || `document_${doc.id}`,
            content: doc.content || '',
            id: `rag_${idx}`,
          }));
        }
      } catch (ragError) {
        log("RAG documents not available", { error: String(ragError) });
      }
    }
    
    // If still no content, try system info as fallback
    if (contextChunks.length === 0 && systemId) {
      const { data: systemData } = await supabase
        .from('agents')
        .select('name, config')
        .eq('id', systemId)
        .single();
      
      if (systemData) {
        const config = systemData.config as any;
        contextChunks = [{
          url: 'system-configuration',
          content: `System: ${systemData.name}. Department: ${config?.department || 'General'}. Configuration: ${JSON.stringify(config || {})}`,
          id: 'system_0',
        }];
      }
    }

    if (contextChunks.length === 0) {
      log("No content available for recommendations");
      return {
        recommendations: [],
        message: 'No website content found. Ingest content in Step 3.',
        metadata: {
          departments,
          chunks_retrieved: 0,
          context_chars: 0,
        }
      };
    }

    // Check minimum context threshold
    const totalContextLength = contextChunks.reduce((sum, chunk) => sum + chunk.content.length, 0);
    const isSystemFallback = contextChunks[0]?.id === 'system_0';
    
    if (!isSystemFallback && totalContextLength < 500) {
      log("Insufficient context", { totalContextLength });
      return {
        recommendations: [],
        message: 'Add knowledge sources or website content in earlier steps to generate grounded recommendations.',
        metadata: {
          departments,
          chunks_retrieved: contextChunks.length,
          context_chars: totalContextLength,
        }
      };
    }

    // Format retrieved chunks for the prompt
    const retrievedContent = contextChunks
      .map((chunk, idx) => `[${chunk.id}] URL: ${chunk.url}\n${chunk.content.slice(0, 800)}`)
      .join('\n\n---\n\n');

    const userPrompt = `Generate grounded recommendations for: ${departments.join(', ')}
Context window (RAG):
${retrievedContent}

Output JSON array of up to 3 objects per department with keys:
["department","recommendation","why_it_matters","steps","confidence","citations"]

Each citation must include: url, snippet (text excerpt from the chunk), snippet_id (chunk id like rag_0, ks_1).`;

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw {
        code: 'CONFIGURATION_ERROR',
        message: 'LOVABLE_API_KEY not configured',
        status: 500,
      };
    }

    log("Calling Lovable AI");

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-preview',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      log("AI generation failed", { status: aiResponse.status, error: errorText });
      throw {
        code: 'EXTERNAL_API_ERROR',
        message: 'AI generation failed',
        status: 500,
      };
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw {
        code: 'EXTERNAL_API_ERROR',
        message: 'No content generated',
        status: 500,
      };
    }

    // Parse JSON from AI response
    let recommendations: any[] = [];
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      recommendations = JSON.parse(jsonStr);
    } catch (parseError) {
      log("JSON parse error", { error: String(parseError), content: content.slice(0, 200) });
      throw {
        code: 'PARSING_ERROR',
        message: 'Failed to parse AI response',
        status: 500,
      };
    }

    // Validate and filter recommendations
    const validRecommendations = recommendations
      .map(rec => {
        // Validate with schema
        const validated = RecommendationSchema.safeParse(rec);
        return validated.success ? validated.data : null;
      })
      .filter(rec => {
        if (!rec) return false;
        // Must have citations and high confidence
        if (!rec.citations || rec.citations.length === 0) return false;
        if (rec.confidence < 60) return false;
        return true;
      });

    log("Recommendations generated", {
      total: recommendations.length,
      valid: validRecommendations.length,
      chunks: contextChunks.length,
      contextChars: totalContextLength
    });

    return {
      recommendations: validRecommendations,
      metadata: {
        departments,
        chunks_retrieved: contextChunks.length,
        context_chars: totalContextLength,
      },
    };
  }
}));
