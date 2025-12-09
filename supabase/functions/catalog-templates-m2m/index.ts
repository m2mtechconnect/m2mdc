/**
 * /v1/catalog-templates-m2m
 * 
 * PURPOSE: List machine-to-machine agent templates
 * AUTH: public (no auth required)
 * 
 * REQUEST (GET params):
 * - q: string (optional, search query)
 * - industry: string (optional, industry filter)
 * - tag: string (optional, tag filter)
 * - sort: string (optional: downloads, rating, name; default: downloads)
 * - page: number (optional, default: 1)
 * - pageSize: number (optional, default: 12)
 * 
 * RESPONSE:
 * - items: Array of template objects
 * - total: Total count
 * - page: Current page
 * - pageSize: Items per page
 * - totalPages: Total pages
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

// Input validation schema
const InputSchema = z.object({
  q: z.string().optional().default(''),
  industry: z.string().optional(),
  tag: z.string().optional(),
  sort: z.enum(['downloads', 'rating', 'name']).optional().default('downloads'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(12),
});

serve(createHandler({
  name: "catalog-templates-m2m",
  authLevel: "public",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { q, industry, tag, sort, page, pageSize } = input;
    const { supabase, log } = context;

    log("Fetching M2M templates", { q, industry, tag, sort, page });

    let query = supabase
      .from('vw_templates_m2m')
      .select('id, name, description, industry, tags, roi_pct, rating, downloads, certified, hero_icon, thumbnail_url, sample_prompts, kpi_definitions', { count: 'exact' });

    // Search
    if (q) {
      query = query.ilike('name', `%${q}%`);
    }

    // Filters
    if (industry) {
      query = query.eq('industry', industry);
    }
    if (tag) {
      query = query.contains('tags', [tag]);
    }

    // Sort
    if (sort === 'rating') {
      query = query.order('rating', { ascending: false });
    } else if (sort === 'downloads') {
      query = query.order('downloads', { ascending: false });
    } else if (sort === 'name') {
      query = query.order('name', { ascending: true });
    }

    // Pagination
    const currentPage = page || 1;
    const currentPageSize = pageSize || 12;
    const from = (currentPage - 1) * currentPageSize;
    const to = from + currentPageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      log("Query error", { error: error.message });
      throw {
        code: 'DATABASE_ERROR',
        message: error.message,
        status: 500,
      };
    }

    log("Templates fetched", { count: count || 0 });

    return {
      items: data || [],
      total: count || 0,
      page: currentPage,
      pageSize: currentPageSize,
      totalPages: Math.ceil((count || 0) / currentPageSize),
    };
  }
}));
