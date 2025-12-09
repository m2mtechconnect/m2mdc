/**
 * /v1/agents-list
 * 
 * PURPOSE: List user's AI agents with filtering, search, and pagination
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST (GET params or POST body):
 * - search: string (optional)
 * - category: string (optional template_id filter)
 * - visibility: string (optional)
 * - status: string (optional)
 * - page: number (default: 1)
 * - pageSize: number (default: 20)
 * 
 * RESPONSE:
 * - items: Array of agent objects
 * - total: Total count
 * - page: Current page
 * - pageSize: Items per page
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

// Input validation schema
const InputSchema = z.object({
  search: z.string().optional().default(''),
  category: z.string().optional(),
  visibility: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

serve(createHandler({
  name: "agents-list",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { search = '', category, status, page = 1, pageSize = 20 } = input;
    const { supabase, log } = context;

    // Build query with RLS-safe filters
    let query = supabase
      .from('agents')
      .select('id, name, description, status, template_id, model_id, created_at, updated_at, total_runs, success_rate, deployed_at, config', { count: 'exact' });

    // Search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%, description.ilike.%${search}%`);
    }

    // Category/template filter
    if (category) {
      query = query.eq('template_id', category);
    }

    // Status filter
    if (status) {
      query = query.eq('status', status);
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // Order by updated_at descending
    query = query.order('updated_at', { ascending: false });

    const { data, count, error } = await query;

    if (error) {
      log('Query error', { error: error.message });
      throw {
        code: 'DATABASE_ERROR',
        message: error.message,
        status: 500
      };
    }

    return {
      items: data || [],
      total: count || 0,
      page,
      pageSize
    };
  }
}));
