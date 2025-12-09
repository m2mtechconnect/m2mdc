/**
 * /v1/rag-urls
 * 
 * PURPOSE: Add URLs as RAG sources with scheduling
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - system_id: string (required)
 * - urls: string[] (required)
 * - schedule: "once" | "daily" | "weekly" (optional, default: once)
 * - options: object (optional)
 *   - residency: string (default: ca-northamerica-northeast1)
 *   - chunking: object (size, overlap)
 *   - embedding_model: string
 * 
 * RESPONSE:
 * - success: boolean
 * - items: Array of created RAG items
 * - invalid: Array of invalid URLs (if any)
 * - message: Success message
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

const InputSchema = z.object({
  system_id: z.string().uuid("Invalid system ID"),
  urls: z.array(z.string().url("Invalid URL format")).min(1, "At least one URL required"),
  schedule: z.enum(["once", "daily", "weekly"]).default("once"),
  options: z.object({
    residency: z.string().default("ca-northamerica-northeast1"),
    chunking: z.object({
      size: z.number().int().positive().default(800),
      overlap: z.number().int().nonnegative().default(150),
    }).default({ size: 800, overlap: 150 }),
    embedding_model: z.string().default("text-embedding-004"),
  }).default({}),
});

serve(createHandler({
  name: "rag-urls",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { system_id, urls, schedule, options } = input;
    const { supabase, userId, log } = context;

    log("Processing URLs for RAG ingestion", { system_id, url_count: urls.length });

    const validUrls: string[] = [];
    const invalidUrls: Array<{ url: string; reason: string }> = [];

    // Validate URLs
    for (const url of urls) {
      try {
        const parsed = new URL(url.trim());
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          validUrls.push(parsed.href);
        } else {
          invalidUrls.push({ url, reason: 'Invalid protocol' });
        }
      } catch {
        invalidUrls.push({ url, reason: 'Invalid URL format' });
      }
    }

    if (validUrls.length === 0) {
      throw {
        code: 'VALIDATION_ERROR',
        message: 'No valid URLs provided',
        status: 400,
        details: { invalid: invalidUrls },
      };
    }

    // Create RAG items for each URL
    const items = [];
    for (const url of validUrls) {
      const { data: item, error: insertError } = await supabase
        .from('rag_items')
        .insert({
          system_id,
          user_id: userId,
          source: 'url',
          name: url.split('/').pop() || url,
          uri: url,
          residency: options?.residency || 'ca-northamerica-northeast1',
          status: 'queued',
          options: {
            schedule,
            chunking: options?.chunking || { size: 800, overlap: 150 },
            embedding_model: options?.embedding_model || 'text-embedding-004',
          }
        })
        .select()
        .single();

      if (insertError) {
        log("Failed to insert RAG item", { url, error: insertError.message });
        invalidUrls.push({ url, reason: insertError.message });
      } else {
        items.push(item);
      }
    }

    log("RAG items created", { count: items.length });

    return {
      success: true,
      items,
      invalid: invalidUrls.length > 0 ? invalidUrls : undefined,
      message: `Queued ${items.length} URL(s) for ingestion`,
    };
  }
}));
