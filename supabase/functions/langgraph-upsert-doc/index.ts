/**
 * /v1/langgraph-upsert-doc
 * 
 * PURPOSE: Store document content in RAG documents table for LangGraph retrieval
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - content: string (required) - Document content
 * - metadata: object (optional) - Additional metadata for the document
 * 
 * RESPONSE:
 * - success: boolean
 * - data: object - Created document record
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";

const InputSchema = z.object({
  content: z.string().min(1, "Content cannot be empty"),
  metadata: z.record(z.unknown()).optional().default({}),
});

serve(createHandler({
  name: "langgraph-upsert-doc",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { content, metadata } = input;
    const { supabase, userId, log } = context;

    log("Upserting document", { contentLength: content.length });

    // Store document without embeddings (embeddings generation to be implemented)
    const { data, error } = await supabase
      .from('rag_documents')
      .insert({
        user_id: userId,
        content,
        metadata
      })
      .select()
      .single();

    if (error) {
      throw {
        code: ErrorCodes.INTERNAL_ERROR,
        message: `Failed to upsert document: ${error.message}`,
        status: 500,
      };
    }

    log("Document upserted successfully", { id: data.id });

    return {
      success: true,
      data,
    };
  }
}));
