/**
 * /v1/rag-items
 * 
 * PURPOSE: List RAG items for a system with pagination
 * AUTH: user (requires valid JWT token)
 * 
 * QUERY PARAMS:
 * - system_id: string (required)
 * - page: number (optional, default: 1)
 * - limit: number (optional, default: 50)
 * 
 * RESPONSE:
 * - items: Array of RAG items
 * - total: Total count
 * - page: Current page
 * - limit: Items per page
 * - pages: Total pages
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

const QuerySchema = z.object({
  system_id: z.string().uuid("Invalid system ID"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

serve(createHandler({
  name: "rag-items",
  authLevel: "user",
  handler: async (_, context) => {
    const { req, supabase, userId, log } = context;

    // Parse query parameters
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams);
    
    // Validate query params
    const parsed = QuerySchema.safeParse(queryParams);
    if (!parsed.success) {
      throw {
        code: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        status: 400,
        details: parsed.error.format(),
      };
    }

    const { system_id, page, limit } = parsed.data;

    log("Fetching RAG items", { system_id, page, limit });

    const offset = (page - 1) * limit;

    // Get total count
    const { count, error: countError } = await supabase
      .from('rag_items')
      .select('*', { count: 'exact', head: true })
      .eq('system_id', system_id)
      .eq('user_id', userId);

    if (countError) {
      log("Count query failed", { error: countError.message });
      throw {
        code: 'DATABASE_ERROR',
        message: 'Failed to count RAG items',
        status: 500,
      };
    }

    // Get items
    const { data: items, error: itemsError } = await supabase
      .from('rag_items')
      .select('*')
      .eq('system_id', system_id)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (itemsError) {
      log("Items query failed", { error: itemsError.message });
      throw {
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch RAG items',
        status: 500,
      };
    }

    log("RAG items retrieved", { count: items?.length || 0 });

    return {
      items: items || [],
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit),
    };
  }
}));
