/**
 * /v1/knowledge-url
 * 
 * PURPOSE: Fetch and index URL content as knowledge
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - system_id: string (required)
 * - url: string (required, must be HTTP(S))
 * 
 * RESPONSE:
 * - success: boolean
 * - document_id: Created document ID
 * - status: Processing status
 * - content_type: Content type of fetched URL
 * - message: Success message
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

const InputSchema = z.object({
  system_id: z.string().min(1, "System ID required"),
  url: z.string().url("Invalid URL format"),
});

const MAX_CONTENT_SIZE = 100000; // 100KB
const FETCH_TIMEOUT = 10000; // 10 seconds

serve(createHandler({
  name: "knowledge-url",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { system_id, url } = input;
    const { supabase, userId, log } = context;

    log("Fetching URL content", { url });

    // Validate URL protocol
    const validatedUrl = new URL(url);
    if (!['http:', 'https:'].includes(validatedUrl.protocol)) {
      throw {
        code: 'VALIDATION_ERROR',
        message: 'Only HTTP(S) URLs are allowed',
        status: 400,
      };
    }

    // Fetch URL content
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'M2M-Agentic-Studio/1.0',
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      }
    } catch (fetchError) {
      log("URL fetch failed", { error: fetchError instanceof Error ? fetchError.message : 'Unknown' });
      throw {
        code: 'FETCH_ERROR',
        message: `Failed to fetch URL: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
        status: 400,
      };
    }

    const contentType = response.headers.get('content-type') || 'text/plain';
    const content = await response.text();

    log("URL content fetched", { content_length: content.length, content_type: contentType });

    // Create document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        title: validatedUrl.hostname + validatedUrl.pathname,
        source_type: 'url',
        source_url: url,
        content: content.slice(0, MAX_CONTENT_SIZE),
        status: 'processing',
        metadata: {
          content_type: contentType,
          system_id,
          ingested_at: new Date().toISOString(),
        }
      })
      .select()
      .single();

    if (docError) {
      log("Document creation failed", { error: docError.message });
      throw {
        code: 'DATABASE_ERROR',
        message: 'Failed to create document record',
        status: 500,
      };
    }

    // Create knowledge source link (non-blocking)
    void supabase
      .from('knowledge_sources')
      .insert({
        user_id: userId,
        name: validatedUrl.hostname,
        description: `URL: ${url}`,
        tags: ['url', contentType],
      });

    log("URL indexed", { document_id: document.id });

    return {
      success: true,
      document_id: document.id,
      status: 'processing',
      content_type: contentType,
      message: 'URL content fetched and queued for processing',
    };
  }
}));
