/**
 * /v1/mcp-sync
 * 
 * PURPOSE: Sync MCP servers catalog from Arcade API
 * AUTH: user with executive role
 * 
 * QUERY PARAMS:
 * - mode: "delta" | "full" (default: delta)
 * 
 * RESPONSE:
 * - success: boolean
 * - syncRunId: Sync run ID
 * - added: Number of servers added
 * - updated: Number of servers updated
 * - removed: Number of servers removed (full mode only)
 * - mode: Sync mode used
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

const ARCADE_API_BASE = Deno.env.get('ARCADE_API_BASE') || 'https://api.arcade.dev';
const ARCADE_API_KEY = Deno.env.get('ARCADE_API_KEY');
const PAGE_SIZE = 200;

if (!ARCADE_API_KEY) {
  console.warn('[mcp-sync] ARCADE_API_KEY not configured - sync will be skipped');
}

interface ArcadeServer {
  id: string;
  name: string;
  provider?: { name: string } | string;
  vendor?: string;
  category: string;
  description: string;
  icon?: { url: string };
  logo?: string;
  verified?: boolean;
  auth?: { method: string };
  endpoint?: string;
  baseUrl?: string;
  metrics?: {
    tools?: number;
    resources?: number;
    prompts?: number;
  };
  tools?: any[];
  status?: string;
  updatedAt?: string;
}

serve(createHandler({
  name: "mcp-sync",
  authLevel: "user",
  handler: async (_, context) => {
    const { req, supabase, userId, log } = context;

    // Check for executive role
    const { data: hasRole } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: 'executive'
    });

    if (!hasRole) {
      throw {
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
        status: 403,
      };
    }

    const url = new URL(req.url);
    const mode = url.searchParams.get('mode') || 'delta';

    log("Starting MCP sync", { mode, initiated_by: userId });

    // Create sync run record
    const { data: syncRun, error: syncError } = await supabase
      .from('mcp_sync_runs')
      .insert({
        status: 'running',
        metadata: { mode, initiated_by: userId }
      })
      .select()
      .single();

    if (syncError) {
      log("Failed to create sync run", { error: syncError.message });
      throw {
        code: 'DATABASE_ERROR',
        message: 'Failed to create sync run',
        status: 500,
      };
    }

    let added = 0;
    let updated = 0;
    let removed = 0;
    let page = 1;
    let hasMore = true;
    const seenIds = new Set<string>();

    // Fetch from Arcade API
    while (hasMore) {
      log("Fetching Arcade page", { page });
      
      const arcadeUrl = `${ARCADE_API_BASE}/v1/servers?limit=${PAGE_SIZE}&page=${page}`;
      const response = await fetch(arcadeUrl, {
        headers: {
          'Authorization': `Bearer ${ARCADE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Arcade API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const servers: ArcadeServer[] = data.servers || data.items || [];

      log("Processing servers", { page, count: servers.length });

      for (const server of servers) {
        seenIds.add(server.id);

        const mapped = {
          id: server.id,
          name: server.name,
          provider: typeof server.provider === 'object' ? server.provider?.name : (server.provider || server.vendor || 'Unknown'),
          category: normalizeCategory(server.category),
          description: stripHtml(server.description)?.slice(0, 1200) || '',
          logo_url: server.icon?.url || server.logo || null,
          verified: !!server.verified,
          auth_type: server.auth?.method || 'none',
          endpoint: server.endpoint || server.baseUrl || '',
          tools_count: server.metrics?.tools ?? (server.tools?.length ?? 0),
          resources_count: server.metrics?.resources ?? 0,
          prompts_count: server.metrics?.prompts ?? 0,
          optimized: false,
          status: server.status || 'active',
          last_remote_update: server.updatedAt ? new Date(server.updatedAt) : null,
          updated_at: new Date(),
          raw: server,
        };

        // Upsert
        const { error: upsertError } = await supabase
          .from('mcp_servers_catalog')
          .upsert(mapped, { onConflict: 'id' });

        if (upsertError) {
          log("Upsert error", { server_id: server.id, error: upsertError.message });
          continue;
        }

        // Check if it was an insert or update
        const { data: existing } = await supabase
          .from('mcp_servers_catalog')
          .select('created_at')
          .eq('id', server.id)
          .single();

        if (existing) {
          const wasJustCreated = new Date(existing.created_at).getTime() > (Date.now() - 5000);
          if (wasJustCreated) {
            added++;
          } else {
            updated++;
          }
        }
      }

      hasMore = servers.length === PAGE_SIZE;
      page++;

      // Rate limiting
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // If full sync, mark missing servers as deprecated
    if (mode === 'full') {
      const { data: allServers } = await supabase
        .from('mcp_servers_catalog')
        .select('id')
        .eq('status', 'active');

      if (allServers) {
        for (const server of allServers) {
          if (!seenIds.has(server.id)) {
            await supabase
              .from('mcp_servers_catalog')
              .update({ status: 'deprecated', updated_at: new Date() })
              .eq('id', server.id);
            removed++;
          }
        }
      }
    }

    // Update sync run
    await supabase
      .from('mcp_sync_runs')
      .update({
        status: 'success',
        finished_at: new Date(),
        added,
        updated,
        removed,
      })
      .eq('id', syncRun.id);

    log("MCP sync completed", { added, updated, removed });

    return {
      success: true,
      syncRunId: syncRun.id,
      added,
      updated,
      removed,
      mode,
    };
  }
}));

function normalizeCategory(category: string): string {
  if (!category) return 'other';
  const lower = category.toLowerCase();
  
  const mapping: Record<string, string> = {
    'productivity': 'productivity',
    'docs': 'productivity',
    'communication': 'communication',
    'social': 'communication',
    'dev': 'developer',
    'developer': 'developer',
    'payment': 'finance',
    'finance': 'finance',
    'crm': 'sales',
    'sales': 'sales',
    'database': 'data',
    'data': 'data',
    'support': 'support',
    'analytics': 'analytics',
  };

  for (const [key, value] of Object.entries(mapping)) {
    if (lower.includes(key)) return value;
  }

  return category.toLowerCase();
}

function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
