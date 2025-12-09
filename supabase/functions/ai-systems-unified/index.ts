/**
 * /v1/ai-systems-unified
 * 
 * PURPOSE: Unified endpoint for listing real deployed AI systems/agents (NOT templates)
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - tab: 'all' | 'systems' | 'agents' | 'favorites' | 'archived'
 * - search: string (optional)
 * - department: string (optional)
 * - type: string[] (optional)
 * - status: string[] (optional)
 * - roiMin: number (default: 0)
 * - roiMax: number (default: 500)
 * - sortBy: string (default: 'updated_at')
 * - sortOrder: 'asc' | 'desc' (default: 'desc')
 * - page: number (default: 1)
 * - pageSize: number (default: 15)
 * 
 * RESPONSE:
 * - items: Array of unified system/agent objects
 * - stats: Aggregated statistics
 * - pagination: Pagination metadata
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

// Input validation schema
const InputSchema = z.object({
  tab: z.enum(['all', 'systems', 'agents', 'favorites', 'archived']).default('all'),
  search: z.string().default(''),
  department: z.string().default(''),
  type: z.array(z.string()).default([]),
  status: z.array(z.string()).default([]),
  roiMin: z.number().default(0),
  roiMax: z.number().default(500),
  sortBy: z.string().default('updated_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(15),
});

serve(createHandler({
  name: "ai-systems-unified",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const {
      tab = 'all', search = '', department = '', type = [], status = [],
      roiMin = 0, roiMax = 500, sortBy = 'updated_at', sortOrder = 'desc',
      page = 1, pageSize = 15
    } = input;
    const { supabase, userId, log } = context;

    log('Fetching unified systems/agents', { tab, search, department, page });

    // Fetch from agents table (real deployed agents)
    let agentsQuery = supabase
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
      .eq('owner_id', userId);

    // Fetch from digital_twins table (real deployed twins)
    let twinsQuery = supabase
      .from('digital_twins')
      .select(`
        id,
        name,
        description,
        status,
        created_at,
        updated_at,
        config
      `)
      .eq('user_id', userId);

    // Apply tab-based status filtering
    if (tab === 'all') {
      // Show all active systems (twins + agents)
      agentsQuery = agentsQuery.in('status', ['active', 'deployed']);
      twinsQuery = twinsQuery.in('status', ['active', 'deployed']);
      log('All tab - filtering for active/deployed status');
    } else if (tab === 'systems') {
      // Twins only: show active/deployed twins
      agentsQuery = agentsQuery.limit(0); // Don't fetch agents
      twinsQuery = twinsQuery.in('status', ['active', 'deployed']);
      log('Systems tab - showing twins only');
    } else if (tab === 'agents') {
      // Agents only: show active/deployed agents
      twinsQuery = twinsQuery.limit(0); // Don't fetch twins
      agentsQuery = agentsQuery.in('status', ['active', 'deployed', 'draft']);
      log('Agents tab - showing agents only');
    } else if (tab === 'favorites') {
      // Starred items (not yet implemented, show all for now)
      agentsQuery = agentsQuery.in('status', ['active', 'deployed']);
      twinsQuery = twinsQuery.in('status', ['active', 'deployed']);
      log('Favorites tab - showing all active systems');
    } else if (tab === 'archived') {
      // Archived only
      agentsQuery = agentsQuery.eq('status', 'archived');
      twinsQuery = twinsQuery.eq('status', 'archived');
      log('Archived tab - showing archived systems');
    }

    // Apply search filter
    if (search) {
      agentsQuery = agentsQuery.ilike('name', `%${search}%`);
      twinsQuery = twinsQuery.ilike('name', `%${search}%`);
    }

    // Apply department filter
    if (department) {
      agentsQuery = agentsQuery.eq('config->>department', department);
      twinsQuery = twinsQuery.eq('config->>department', department);
    }

    // Apply status filter (if provided in addition to tab)
    if (status.length > 0) {
      const statuses = status.map((s: string) => s.toLowerCase());
      agentsQuery = agentsQuery.in('status', statuses);
      twinsQuery = twinsQuery.in('status', statuses);
    }

    // Execute both queries
    const [agentsResult, twinsResult] = await Promise.all([
      agentsQuery,
      twinsQuery
    ]);

    if (agentsResult.error) {
      log('Agents query error', { error: agentsResult.error.message });
      throw {
        code: 'DATABASE_ERROR',
        message: agentsResult.error.message,
        status: 500
      };
    }

    if (twinsResult.error) {
      log('Twins query error', { error: twinsResult.error.message });
      throw {
        code: 'DATABASE_ERROR',
        message: twinsResult.error.message,
        status: 500
      };
    }

    const agents = agentsResult.data || [];
    const twins = twinsResult.data || [];

    log('Query results', { 
      agentsCount: agents.length,
      twinsCount: twins.length,
      totalCount: agents.length + twins.length
    });

    // Transform agents to unified format
    const agentItems = agents.map((agent: any) => {
      const config = agent.config as any || {};
      const roi = Math.round((agent.success_rate || 0) * 3.5);
      
      return {
        id: agent.id,
        name: agent.name,
        description: agent.description || 'No description available',
        department: config.department || 'General',
        category: config.category || 'AI Agent',
        status: agent.status.charAt(0).toUpperCase() + agent.status.slice(1),
        grounding: config.useGrounding || false,
        roi,
        lastActivity: agent.deployed_at || agent.updated_at,
        totalRuns: agent.total_runs || 0,
        successRate: agent.success_rate || 0,
        version: agent.version || 'v1',
        type: 'agent',
      };
    });

    // Transform twins to unified format
    const twinItems = twins.map((twin: any) => {
      const config = twin.config as any || {};
      // Estimate ROI for twins based on their configuration
      const roi = config.estimatedRoi || 150;
      
      return {
        id: twin.id,
        name: twin.name,
        description: twin.description || 'No description available',
        department: config.department || 'General',
        category: config.category || 'Digital Twin',
        status: twin.status.charAt(0).toUpperCase() + twin.status.slice(1),
        grounding: false,
        roi,
        lastActivity: twin.updated_at,
        totalRuns: 0,
        successRate: 100,
        version: 'v1',
        type: 'twin',
      };
    });

    // Combine both arrays
    let items = [...agentItems, ...twinItems];

    // Filter by ROI after transformation
    const filteredItems = items.filter((item: any) =>
      item.roi >= roiMin && item.roi <= roiMax
    );

    // Sort the combined results
    const sortColumn = sortBy === 'roi' ? 'roi' : 
                       sortBy === 'lastActivity' ? 'lastActivity' : 
                       sortBy === 'name' ? 'name' :
                       'lastActivity';
    
    filteredItems.sort((a: any, b: any) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      if (sortColumn === 'lastActivity') {
        const aTime = new Date(aVal).getTime();
        const bTime = new Date(bVal).getTime();
        return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
      }
      
      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    // Apply pagination
    const totalCount = filteredItems.length;
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    const paginatedItems = filteredItems.slice(from, to);

    // Calculate stats from all items (not just paginated)
    const stats = {
      total: items.length,
      active: items.filter((i: any) => i.status === 'Active' || i.status === 'Deployed').length,
      draft: items.filter((i: any) => i.status === 'Draft').length,
      archived: items.filter((i: any) => i.status === 'Archived').length,
      avgRoi: items.length > 0 
        ? Math.round(items.reduce((sum: number, i: any) => sum + i.roi, 0) / items.length)
        : 0,
    };

    return {
      items: paginatedItems,
      stats,
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      }
    };
  }
}));
