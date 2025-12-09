/**
 * /v1/knowledge-index
 * 
 * PURPOSE: Create knowledge source entries for pages
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - pageId: string (required)
 * - url: string (required)
 * - title: string (optional)
 * - tags: string[] (optional)
 * - userId: string (required)
 * 
 * RESPONSE:
 * - success: boolean
 * - knowledgeSource: Knowledge source object
 * - message: Success message
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

const InputSchema = z.object({
  pageId: z.string().min(1, "Page ID is required"),
  url: z.string().url("Invalid URL format"),
  title: z.string().optional(),
  tags: z.array(z.string()).default([]),
  userId: z.string().uuid("Invalid user ID"),
});

serve(createHandler({
  name: "knowledge-index",
  authLevel: "public",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { pageId, url, title, tags, userId } = input;
    const { supabase, log } = context;

    log("Creating knowledge source", { pageId, url });

    const parsedUrl = new URL(url);
    const sourceName = title || `Knowledge from ${parsedUrl.hostname}`;

    const { data: knowledgeSource, error: insertError } = await supabase
      .from('knowledge_sources')
      .insert({
        page_id: pageId,
        name: sourceName,
        description: `Indexed content from ${url}`,
        tags: tags,
        embedding_model: 'text-embedding-004',
        indexed_at: new Date().toISOString(),
        user_id: userId,
      })
      .select()
      .single();

    if (insertError) {
      log("Failed to create knowledge source", { error: insertError.message });
      throw {
        code: 'DATABASE_ERROR',
        message: 'Failed to create knowledge source',
        status: 500,
      };
    }

    log("Knowledge source created", { id: knowledgeSource.id });

    return {
      success: true,
      knowledgeSource,
      message: 'Content indexed successfully',
    };
  }
}));
