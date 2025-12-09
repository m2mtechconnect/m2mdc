/**
 * /v1/analytics-overview
 * 
 * PURPOSE: Get analytics overview with KPIs and trends
 * AUTH: admin (uses service role for cross-user analytics)
 * 
 * REQUEST (query params):
 * - from: string (ISO date, default: 90 days ago)
 * - to: string (ISO date, default: now)
 * - systems: string (comma-separated system IDs)
 * - departments: string (comma-separated departments)
 * 
 * RESPONSE:
 * - kpis: Key performance indicators
 * - sparkline: 12-week ROI trend
 * - filters: Applied filters
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

// Input validation schema (from query params)
const InputSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  systems: z.string().optional(),
  departments: z.string().optional(),
});

serve(createHandler({
  name: "analytics-overview",
  authLevel: "admin",
  handler: async (input, context) => {
    const { supabase, log } = context;

    // Parse filters with defaults
    const from = input.from || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const to = input.to || new Date().toISOString();
    const systems = input.systems?.split(',').filter(Boolean) || [];
    const departments = input.departments?.split(',').filter(Boolean) || [];

    log("Analytics overview request", { from, to, systemCount: systems.length, deptCount: departments.length });

    // Get filtered agents
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
    if (agentsError) {
      log("Agents query error", { error: agentsError.message });
      throw {
        code: 'DATABASE_ERROR',
        message: agentsError.message,
        status: 500,
      };
    }

    const agentIds = agents?.map((a: any) => a.id) || [];
    const safeAgentIds = agentIds.length > 0 ? agentIds : ['00000000-0000-0000-0000-000000000000'];

    log("Calculating KPIs", { agentCount: agentIds.length });

    // Calculate ROI metrics
    const { data: roiData } = await supabase
      .from('roi_snapshots')
      .select('roi_pct, annual_savings, time_saved_week, error_savings_year, created_at')
      .in('system_id', safeAgentIds)
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at', { ascending: true });

    const totalROI = (roiData && roiData.length > 0) 
      ? roiData.reduce((sum: number, r: any) => sum + Number(r.roi_pct), 0) / roiData.length 
      : 0;
    const totalSavings = (roiData && roiData.length > 0) 
      ? roiData.reduce((sum: number, r: any) => sum + Number(r.annual_savings), 0) 
      : 0;
    const totalTimeSaved = (roiData && roiData.length > 0) 
      ? roiData.reduce((sum: number, r: any) => sum + Number(r.time_saved_week), 0) 
      : 0;

    // Calculate ROI growth (first vs last)
    const roiGrowth = roiData && roiData.length > 1
      ? ((Number(roiData[roiData.length - 1].roi_pct) - Number(roiData[0].roi_pct)) / Number(roiData[0].roi_pct)) * 100
      : 0;

    // Get total runs
    const { count: totalRuns } = await supabase
      .from('agent_runs')
      .select('*', { count: 'exact', head: true })
      .in('agent_id', safeAgentIds)
      .gte('created_at', from)
      .lte('created_at', to);

    // Calculate success rate
    const { data: runs } = await supabase
      .from('agent_runs')
      .select('status')
      .in('agent_id', safeAgentIds)
      .gte('created_at', from)
      .lte('created_at', to);

    const successRate = runs && runs.length > 0
      ? (runs.filter((r: any) => r.status === 'completed' || r.status === 'success').length / runs.length) * 100
      : 0;

    // Get active users
    const { data: conversations } = await supabase
      .from('agent_conversations')
      .select('user_id')
      .in('agent_id', safeAgentIds)
      .gte('created_at', from)
      .lte('created_at', to);

    const activeUsers = new Set(conversations?.map((c: any) => c.user_id) || []).size;

    // Generate 12-week sparkline
    log("Generating ROI sparkline");
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const sparkline = [];
    
    for (let i = 0; i < 12; i++) {
      const weekStart = new Date(new Date(from).getTime() + i * weekMs);
      const weekEnd = new Date(weekStart.getTime() + weekMs);
      
      const { data: weekData } = await supabase
        .from('roi_snapshots')
        .select('roi_pct')
        .in('system_id', safeAgentIds)
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString());

      const avgROI = (weekData && weekData.length > 0) 
        ? weekData.reduce((sum: number, r: any) => sum + Number(r.roi_pct), 0) / weekData.length 
        : 0;
      sparkline.push({ week: i + 1, roi: avgROI });
    }

    log("Analytics calculated", { totalROI, totalRuns, activeUsers });

    return {
      kpis: {
        roi_growth: roiGrowth,
        total_roi: totalROI,
        compliance_accuracy: successRate,
        active_users: activeUsers,
        time_saved: totalTimeSaved,
        total_savings: totalSavings,
        total_runs: totalRuns || 0,
      },
      sparkline,
      filters: { from, to, systems, departments },
    };
  }
}));
