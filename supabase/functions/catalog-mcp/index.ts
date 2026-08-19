/**
 * /v1/catalog-mcp
 * 
 * PURPOSE: Browse MCP servers catalog with filtering and pagination
 * Also handles sync trigger and last-sync status
 * AUTH: public for GET (catalog), user for POST (sync)
 * 
 * GET QUERY PARAMS:
 * - q: string (search query)
 * - provider: string (filter by provider)
 * - category: string (filter by category)
 * - verified: "true" (filter verified only)
 * - optimized: "true" (filter optimized only)
 * - sort: "name" | "provider" | "tools" (default: name)
 * - page: number (default: 1)
 * - pageSize: number (default: 12)
 * 
 * POST /sync:
 * - mode: "delta" | "full" (default: delta)
 * 
 * GET /last-sync:
 * Returns last sync run status
 * 
 * RESPONSE (catalog):
 * - items: Array of MCP servers
 * - total: Total count
 * - page: Current page
 * - pageSize: Items per page
 * - totalPages: Total pages
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";


serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  const correlationId = crypto.randomUUID();
  const log = (msg: string, extra: Record<string, unknown> = {}) => {
    console.log(`[catalog-mcp:${correlationId}]`, msg, extra);
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    
    // Handle POST /sync endpoint
    if (req.method === 'POST' && url.pathname.endsWith('/sync')) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { mode = 'delta' } = await req.json().catch(() => ({}));

      log("Triggering MCP sync", { mode });

      // Call mcp-sync function
      const syncResponse = await fetch(`${supabaseUrl}/functions/v1/mcp-sync?mode=${mode}`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
        },
      });

      const syncData = await syncResponse.json();

      return new Response(JSON.stringify(syncData), {
        status: syncResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle GET /last-sync endpoint
    if (req.method === 'GET' && url.pathname.endsWith('/last-sync')) {
      const { data: lastSync } = await supabase
        .from('mcp_sync_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      return new Response(JSON.stringify({ lastSync }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle catalog listing (GET)
    const q = url.searchParams.get('q') || '';
    const provider = url.searchParams.get('provider');
    const category = url.searchParams.get('category');
    const verified = url.searchParams.get('verified');
    const optimized = url.searchParams.get('optimized');
    const sort = url.searchParams.get('sort') || 'name';
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '12');

    log("Fetching MCP catalog", { page, pageSize, q, provider, category });

    let query = supabase
      .from('vw_mcp_servers')
      .select('id, name, provider, category, auth_type, verified, tools_count, resources_count, prompts_count, optimized, logo_url, description, endpoint', { count: 'exact' });

    // Search
    if (q) {
      query = query.ilike('name', `%${q}%`);
    }

    // Filters
    if (provider) {
      query = query.eq('provider', provider);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (verified === 'true') {
      query = query.eq('verified', true);
    }
    if (optimized === 'true') {
      query = query.eq('optimized', true);
    }

    // Sort
    if (sort === 'name') {
      query = query.order('name', { ascending: true });
    } else if (sort === 'provider') {
      query = query.order('provider', { ascending: true });
    } else if (sort === 'tools') {
      query = query.order('tools_count', { ascending: false });
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      log("Query failed", { error: error.message });
      throw error;
    }

    log("Catalog fetched", { items: data?.length || 0, total: count });

    return new Response(
      JSON.stringify({
        items: data || [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[catalog-mcp] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
