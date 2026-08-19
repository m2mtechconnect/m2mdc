/**
 * /v1/ai-systems
 * 
 * PURPOSE: List AI systems/agents with filtering and sorting
 * AUTH: admin (uses service role for demo data)
 * 
 * REQUEST (POST body):
 * - department: string (optional)
 * - search: string (optional)
 * - sortBy: string (optional, default: 'created_at')
 * - sortOrder: 'asc' | 'desc' (optional, default: 'desc')
 * 
 * RESPONSE:
 * - Array of system objects with computed metrics
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

// Input validation schema
const InputSchema = z.object({
  department: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

serve(createHandler({
  name: "ai-systems",
  authLevel: "admin",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { department, search, sortBy = 'created_at', sortOrder = 'desc' } = input;
    const { supabase, log, organizationId } = context;
    if (!organizationId) {
      throw { code: 'TENANT_CONTEXT_REQUIRED', message: 'Organization context is required', status: 403 };
    }

    log("Fetching AI systems", { department, search, sortBy });

    let query = supabase
      .from('agents')
      .select(`
        id,
        name,
        description,
        status,
        version,
        success_rate,
        total_runs,
        deployed_at,
        updated_at,
        config
      `)
      .eq('org_id', organizationId);

    // Apply filters
    if (department) {
      query = query.eq('config->>department', department);
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Apply sorting
    const sortColumn = sortBy === 'roi' ? 'success_rate' : 
                       sortBy === 'lastActivity' ? 'updated_at' : 
                       sortBy;
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

    const { data: agents, error } = await query;

    if (error) {
      log("Query error", { error: error.message });
      throw {
        code: 'DATABASE_ERROR',
        message: error.message,
        status: 500,
      };
    }

    // Transform to expected format
    const systems = agents?.map((agent: any) => {
      const config = agent.config as any || {};
      const roi = Math.round((agent.success_rate || 0) * 3.5);
      
      return {
        id: agent.id,
        name: agent.name,
        department: config.department || 'General',
        status: agent.status.charAt(0).toUpperCase() + agent.status.slice(1),
        grounding: config.useGrounding || false,
        roi,
        lastActivity: agent.deployed_at || agent.updated_at,
        totalRuns: agent.total_runs || 0,
        successRate: agent.success_rate || 0,
        version: agent.version,
        description: agent.description
      };
    }) || [];

    log("AI systems fetched", { count: systems.length });

    return systems;
  }
}));
