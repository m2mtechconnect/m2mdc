/**
 * /v1/analyze-file
 * 
 * PURPOSE: AI-powered file analysis for document understanding
 * AUTH: public (no auth required)
 * 
 * REQUEST:
 * - fileName: string (required) - Name of the file
 * - fileContent: string (required) - Content of the file
 * - fileType: string (optional) - MIME type of file
 * - userId: string (optional) - User ID for storage
 * 
 * RESPONSE:
 * - summary: string - Concise summary (2-3 sentences)
 * - key_topics: string[] - Key topics and themes
 * - entities: object - Detected entities (people, organizations, locations, dates)
 * - automation_suggestions: array - Suggested workflow automations
 * - classification: object - Document classification
 * - insights: string[] - Additional insights
 * - file_name: string - Original file name
 * - file_type: string - File type
 * - indexed_id: string (optional) - ID in indexed_content table
 * - latency_ms: number - Processing time
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";

const InputSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileContent: z.string().min(1, "File content is required"),
  fileType: z.string().optional(),
  userId: z.string().optional(),
});

serve(createHandler({
  name: "analyze-file",
  authLevel: "public",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { fileName, fileContent, fileType, userId } = input;
    const { supabase, log } = context;

    const startTime = Date.now();

    log("Analyzing file", { fileName, fileType });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "AI service not configured",
        status: 500,
      };
    }

    // Use Gemini Flash for document analysis
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a document analysis AI. Analyze documents and provide:
1. A concise summary (2-3 sentences)
2. Key topics and themes (3-5 bullet points)
3. Detected entities (people, organizations, locations, dates)
4. Suggested automation templates (workflows that could be built from this document)
5. Classification (category: finance, legal, marketing, operations, hr, technical, etc.)

Return JSON:
{
  "summary": "...",
  "key_topics": ["...", "..."],
  "entities": {
    "people": ["..."],
    "organizations": ["..."],
    "dates": ["..."],
    "locations": ["..."]
  },
  "automation_suggestions": [
    {
      "title": "...",
      "description": "...",
      "estimated_roi": "...",
      "time_saved": "..."
    }
  ],
  "classification": {
    "category": "...",
    "confidence": 0.0-1.0,
    "tags": ["...", "..."]
  },
  "insights": ["...", "..."]
}`,
          },
          {
            role: "user",
            content: `File: ${fileName}\nType: ${fileType || 'unknown'}\n\nContent:\n${fileContent.substring(0, 8000)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log("AI API error", { status: response.status, error: errorText });

      if (response.status === 429) {
        throw {
          code: ErrorCodes.EXTERNAL_API_ERROR,
          message: "Rate limit exceeded. Please try again later.",
          status: 429,
        };
      }

      if (response.status === 402) {
        throw {
          code: ErrorCodes.EXTERNAL_API_ERROR,
          message: "Payment required. Please add credits to your workspace.",
          status: 402,
        };
      }

      throw {
        code: ErrorCodes.EXTERNAL_API_ERROR,
        message: `AI API error: ${response.status}`,
        status: 502,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw {
        code: ErrorCodes.EXTERNAL_API_ERROR,
        message: "No response from AI",
        status: 502,
      };
    }

    log("AI response received");

    // Parse JSON response
    let analysis;
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      analysis = JSON.parse(jsonStr);
    } catch (e) {
      log("Failed to parse AI response as JSON", { error: e });
      analysis = {
        summary: content.substring(0, 500),
        key_topics: [],
        entities: { people: [], organizations: [], dates: [], locations: [] },
        automation_suggestions: [],
        classification: { category: "general", confidence: 0.5, tags: [] },
        insights: [],
      };
    }

    // Store in indexed_content
    let indexedId;
    try {
      const { data: indexedData, error: indexError } = await supabase
        .from("indexed_content")
        .insert({
          source_type: "doc",
          source_name: "File Upload",
          title: fileName,
          content: fileContent.substring(0, 10000),
          metadata: {
            file_type: fileType,
            analysis: analysis,
            uploaded_at: new Date().toISOString(),
            user_id: userId,
          },
        })
        .select()
        .single();

      if (indexError) {
        log("Failed to store indexed content", { error: indexError.message });
      } else {
        indexedId = indexedData?.id;
      }
    } catch (e) {
      log("Error storing content", { error: e });
    }

    const latency = Date.now() - startTime;
    log("Analysis completed", { latency });

    return {
      ...analysis,
      file_name: fileName,
      file_type: fileType || 'unknown',
      indexed_id: indexedId,
      latency_ms: latency,
    };
  }
}));
