/**
 * /v1/search
 * 
 * PURPOSE: Unified search endpoint with intent classification and routing
 * AUTH: public (optional user auth)
 * 
 * REQUEST:
 * - input: string (required, search query or URL)
 * - type: string (optional, 'URL' | 'QUERY', auto-classified if not provided)
 * 
 * RESPONSE:
 * - Varies by intent:
 *   - URL: Captured website data
 *   - QUERY: AI-generated answer with citations
 * - type: Detected intent type
 * - intent: Contextual intent (website, automation, kpi, compliance, search)
 * - query: Original input
 * - latency_ms: Processing time
 * - requestId: Correlation ID
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";

// Input validation schema
const InputSchema = z.object({
  input: z.string().min(1, "Input is required"),
  type: z.enum(['URL', 'QUERY']).optional(),
});

serve(createHandler({
  name: "search",
  authLevel: "public",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { input: searchInput, type } = input;
    const { supabase, userId, log } = context;

    const startTime = Date.now();

    log("Processing search", { input: searchInput, type, userId });

    // Step 1: Classify intent if not provided
    let intent = type;
    let normalized_url = null;

    if (!intent) {
      log("Classifying intent");
      const { data: classification, error: classifyError } = await supabase.functions.invoke(
        'classify-intent',
        { body: { input: searchInput } }
      );

      if (classifyError) {
        log("Intent classification failed", { error: classifyError.message });
        throw {
          code: ErrorCodes.EXTERNAL_API_ERROR,
          message: 'Failed to classify intent',
          status: 500,
        };
      }

      intent = classification.intent;
      normalized_url = classification.normalized_url;
    }

    log("Intent determined", { intent, normalized_url });

    let result: any = {};

    // Step 2: Execute based on intent
    if (intent === 'URL') {
      // URL Capture flow
      log("Capturing URL", { url: normalized_url || searchInput });
      
      const { data: captureData, error: captureError } = await supabase.functions.invoke(
        'url-capture',
        { 
          body: { 
            url: normalized_url || searchInput,
            userId 
          } 
        }
      );

      if (captureError) {
        log("URL capture failed", { error: captureError.message });
        throw {
          code: ErrorCodes.EXTERNAL_API_ERROR,
          message: 'Failed to capture URL',
          status: 500,
        };
      }

      result = {
        ...captureData,
        type: 'url',
        intent: 'website',
        query: searchInput,
        latency_ms: Date.now() - startTime,
      };

    } else if (intent === 'QUERY') {
      // Query Answer flow with RAG
      log("Answering query");
      
      const { data: answerData, error: answerError } = await supabase.functions.invoke(
        'query-answer',
        { 
          body: { 
            query: searchInput,
            userId 
          } 
        }
      );

      if (answerError) {
        log("Query answer failed", { error: answerError.message });
        throw {
          code: ErrorCodes.EXTERNAL_API_ERROR,
          message: 'Failed to generate answer',
          status: 500,
        };
      }

      // Determine contextual intent for actions
      let contextualIntent = 'search';
      const lowerInput = searchInput.toLowerCase();
      if (lowerInput.includes('automat') || lowerInput.includes('build') || lowerInput.includes('create system')) {
        contextualIntent = 'automation';
      } else if (lowerInput.includes('roi') || lowerInput.includes('kpi') || lowerInput.includes('metric')) {
        contextualIntent = 'kpi';
      } else if (lowerInput.includes('complian') || lowerInput.includes('policy') || lowerInput.includes('regulation')) {
        contextualIntent = 'compliance';
      }

      result = {
        ...answerData,
        type: 'query',
        intent: contextualIntent,
        query: searchInput,
        latency_ms: Date.now() - startTime,
        confidence: answerData.faithfulness || 0.85,
        model: 'gemini-1.5-pro',
        grounded: true
      };
    } else {
      log("Unknown intent type", { intent });
      throw {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Unknown intent type',
        status: 400,
      };
    }

    // Store search history if user is authenticated (non-blocking)
    if (userId) {
      void supabase
        .from('search_history')
        .insert({
          user_id: userId,
          query: searchInput,
          intent,
          result_type: result.type
        });
    }

    log("Search completed", { type: result.type, latency: result.latency_ms });

    return result;
  }
}));
