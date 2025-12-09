/**
 * /v1/zapier-apps-list
 * 
 * PURPOSE: List available Zapier apps with connection status
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST (GET params):
 * - search: string (optional, search in name/description)
 * - category: string (optional, filter by category)
 * - status: string (optional, filter by status)
 * - premium: boolean (optional, filter premium apps)
 * - pricing_tier: string (optional, filter by pricing tier)
 * - page: number (optional, default: 1)
 * - pageSize: number (optional, default: 20)
 * 
 * RESPONSE:
 * - apps: Array of Zapier app objects with connection status
 * - pagination: Pagination metadata
 * - filters: Available filter options
 * - stats: Statistics (total apps, connected apps)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

// Input validation schema
const InputSchema = z.object({
  search: z.string().optional().default(''),
  category: z.string().optional(),
  status: z.string().optional(),
  premium: z.string().optional(),
  pricing_tier: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

serve(createHandler({
  name: "zapier-apps-list",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { search = '', category, status, premium, pricing_tier, page = 1, pageSize = 20 } = input;
    const { supabase, userId, log } = context;

    log("Fetching Zapier apps", { search, category, page });

    // Build query
    let query = supabase
      .from('zapier_apps')
      .select('*', { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (category) {
      query = query.contains('category', [category]);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (premium !== undefined && premium !== null) {
      query = query.eq('premium', premium === 'true');
    }

    if (pricing_tier) {
      query = query.eq('pricing_tier', pricing_tier);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // Order by connections count (most popular first)
    query = query.order('connections_count', { ascending: false });

    const { data: apps, error: appsError, count } = await query;

    if (appsError) {
      log("Query error", { error: appsError.message });
      throw {
        code: 'DATABASE_ERROR',
        message: appsError.message,
        status: 500,
      };
    }

    // Get user's connected apps
    const { data: connectedApps, error: connectedError } = await supabase
      .from('integrations_tokens')
      .select('app_id, status, last_sync_at')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (connectedError) {
      log("Error fetching connected apps", { error: connectedError.message });
    }

    // Enrich apps with connection status
    const connectedAppIds = new Set(connectedApps?.map((a: any) => a.app_id) || []);
    const enrichedApps = apps?.map((app: any) => ({
      ...app,
      is_connected: connectedAppIds.has(app.id),
      connection_info: connectedApps?.find((c: any) => c.app_id === app.id)
    }));

    // Get all unique categories for filtering
    const { data: allApps } = await supabase
      .from('zapier_apps')
      .select('category');

    const allCategories = new Set<string>();
    allApps?.forEach((app: any) => {
      app.category?.forEach((cat: string) => allCategories.add(cat));
    });

    log("Zapier apps fetched", { count: apps?.length || 0, total: count });

    return {
      apps: enrichedApps,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      },
      filters: {
        categories: Array.from(allCategories).sort()
      },
      stats: {
        total_apps: count || 0,
        connected_apps: connectedApps?.length || 0
      }
    };
  }
}));
