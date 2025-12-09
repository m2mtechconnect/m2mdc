/**
 * /v1/analytics-systems
 * 
 * PURPOSE: Get system performance analytics
 * AUTH: admin (requires service role)
 * 
 * REQUEST (GET params):
 * - from: string (optional, ISO date, default: 90 days ago)
 * - to: string (optional, ISO date, default: now)
 * - systems: string (optional, comma-separated agent IDs)
 * - departments: string (optional, comma-separated departments)
 * 
 * RESPONSE:
 * - systems: Array of system performance data
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

// Input validation schema
const InputSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  systems: z.string().optional(),
  departments: z.string().optional(),
});

serve(createHandler({
  name: "analytics-systems",
  authLevel: "admin",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { supabase, log } = context;

    // Parse dates with defaults
    const from = input.from || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const to = input.to || new Date().toISOString();
    const systems = input.systems?.split(',').filter(Boolean) || [];
    const departments = input.departments?.split(',').filter(Boolean) || [];

    log("Fetching system analytics", { from, to, systemCount: systems.length, departmentCount: departments.length });

    // Get agents
    let agentsQuery = supabase.from('agents').select('id, name, config');
    
    if (systems.length > 0) {
      agentsQuery = agentsQuery.in('id', systems);
    }
    
    if (departments.length > 0) {
      agentsQuery = agentsQuery.or(
        departments.map((dept: string) => `config->department.eq.${dept}`).join(',')
      );
    }

    const { data: agents, error: agentsError } = await agentsQuery;
    if (agentsError) throw agentsError;

    // Build system performance data
    const systemPerformance = await Promise.all(
      (agents || []).map(async (agent: any) => {
        // Get ROI
        const { data: roiData } = await supabase
          .from('roi_snapshots')
          .select('roi_pct')
          .eq('system_id', agent.id)
          .gte('created_at', from)
          .lte('created_at', to)
          .order('created_at', { ascending: false })
          .limit(1);

        const roi = roiData?.[0]?.roi_pct || 0;

        // Get total runs
        const { count: totalRuns } = await supabase
          .from('agent_runs')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', agent.id)
          .gte('created_at', from)
          .lte('created_at', to);

        // Get avg response time
        const { data: runData } = await supabase
          .from('agent_runs')
          .select('duration_ms')
          .eq('agent_id', agent.id)
          .gte('created_at', from)
          .lte('created_at', to)
          .not('duration_ms', 'is', null);

        const avgResponseMs = runData && runData.length > 0
          ? runData.reduce((sum: number, r: any) => sum + (r.duration_ms || 0), 0) / runData.length
          : 0;
        const avgResponseSec = (avgResponseMs / 1000).toFixed(1);

        // Get accuracy (using success rate as proxy)
        const { data: allRuns } = await supabase
          .from('agent_runs')
          .select('status')
          .eq('agent_id', agent.id)
          .gte('created_at', from)
          .lte('created_at', to);

        const accuracy = allRuns && allRuns.length > 0
          ? (allRuns.filter((r: any) => r.status === 'completed' || r.status === 'success').length / allRuns.length) * 100
          : 0;

        return {
          id: agent.id,
          name: agent.name,
          department: agent.config?.department || 'General',
          roi: `${Math.round(roi)}%`,
          total_runs: totalRuns || 0,
          avg_response_time: `${avgResponseSec}s`,
          accuracy: `${Math.round(accuracy)}%`,
        };
      })
    );

    log("System analytics fetched", { systemCount: systemPerformance.length });

    return { systems: systemPerformance };
  }
}));
