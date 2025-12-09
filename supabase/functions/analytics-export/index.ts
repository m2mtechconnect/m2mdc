/**
 * /v1/analytics-export
 * 
 * PURPOSE: Export analytics data to CSV or structured JSON
 * AUTH: admin (requires service role)
 * 
 * REQUEST:
 * - from: string (required, ISO date)
 * - to: string (required, ISO date)
 * - systems: array (optional, agent IDs to filter)
 * - departments: array (optional, departments to filter)
 * - format: string (optional: csv, json; default: csv)
 * 
 * RESPONSE:
 * - CSV file download or structured JSON data
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

// Input validation schema
const InputSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  systems: z.array(z.string().uuid()).optional().default([]),
  departments: z.array(z.string()).optional().default([]),
  format: z.enum(['csv', 'json']).optional().default('csv'),
});

serve(createHandler({
  name: "analytics-export",
  authLevel: "admin",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { from, to, format } = input;
    const systems = input.systems || [];
    const departments = input.departments || [];
    const { supabase, log } = context;

    log("Exporting analytics", { from, to, format, systemCount: systems.length });

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

    const { data: agents } = await agentsQuery;
    const agentIds = agents?.map((a: any) => a.id) || [];

    // Get comprehensive data
    const { data: roiData } = await supabase
      .from('roi_snapshots')
      .select('*')
      .in('system_id', agentIds.length > 0 ? agentIds : ['00000000-0000-0000-0000-000000000000'])
      .gte('created_at', from)
      .lte('created_at', to);

    const { data: runsData } = await supabase
      .from('agent_runs')
      .select('*')
      .in('agent_id', agentIds.length > 0 ? agentIds : ['00000000-0000-0000-0000-000000000000'])
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = 'System,Department,Date,ROI %,Total Runs,Success Rate,Avg Response (ms),Annual Savings\n';
      const csvRows = await Promise.all(
        (agents || []).map(async (agent: any) => {
          const agentRoi = roiData?.find((r: any) => r.system_id === agent.id);
          const agentRuns = runsData?.filter((r: any) => r.agent_id === agent.id) || [];
          const successRate = agentRuns.length > 0
            ? (agentRuns.filter((r: any) => r.status === 'completed').length / agentRuns.length) * 100
            : 0;
          const avgDuration = agentRuns.length > 0
            ? agentRuns.reduce((sum: number, r: any) => sum + (r.duration_ms || 0), 0) / agentRuns.length
            : 0;

          return `${agent.name},"${agent.config?.department || 'General'}",${new Date().toISOString()},${agentRoi?.roi_pct || 0},${agentRuns.length},${successRate.toFixed(1)}%,${avgDuration.toFixed(0)},${agentRoi?.annual_savings || 0}`;
        })
      );

      const csv = csvHeaders + csvRows.join('\n');

      log("CSV export generated", { rows: csvRows.length });

      return {
        exportData: csv,
        contentType: 'text/csv',
        fileName: `analytics-export-${new Date().toISOString().split('T')[0]}.csv`,
      };
    }

    // JSON format
    log("JSON export generated", { agentCount: agents?.length || 0 });

    return {
      agents,
      roiData,
      runsData,
      filters: { from, to, systems, departments },
    };
  }
}));
