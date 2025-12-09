/**
 * /v1/ops-overview
 * 
 * PURPOSE: Get operations overview metrics for system monitoring
 * AUTH: admin (uses service role)
 * 
 * REQUEST (GET params):
 * - env: string (optional, default: 'all', environment filter)
 * 
 * RESPONSE:
 * - uptime_pct: Average uptime percentage
 * - active_systems: Count of active systems
 * - errors_24h: Total errors in last 24 hours
 * - avg_latency_ms: Average latency in milliseconds
 * - total_rpm: Total requests per minute
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

// Input validation schema
const InputSchema = z.object({
  env: z.string().optional().default('all'),
});

serve(createHandler({
  name: "ops-overview",
  authLevel: "admin",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { env } = input;
    const { supabase, log } = context;

    log("Fetching ops overview", { env });

    // Build environment filter
    let envFilter = null;
    if (env !== 'all') {
      const { data: envData } = await supabase
        .from('environments')
        .select('id')
        .eq('name', env)
        .maybeSingle();
      envFilter = envData?.id;
    }

    // Get active systems count (heartbeat within last 2 minutes)
    let systemsQuery = supabase
      .from('agents')
      .select('id, last_heartbeat, status', { count: 'exact', head: false })
      .in('status', ['active', 'deployed', 'running']);
    
    if (envFilter) {
      systemsQuery = systemsQuery.eq('environment_id', envFilter);
    }

    const { data: systems } = await systemsQuery;
    const now = new Date();
    const activeSystems = systems?.filter((s: any) => {
      if (!s.last_heartbeat) return false;
      const lastBeat = new Date(s.last_heartbeat);
      const minutesSince = (now.getTime() - lastBeat.getTime()) / (1000 * 60);
      return minutesSince <= 2;
    }).length || 0;

    // Get latest health metrics for all systems
    const systemIds = systems?.map((s: any) => s.id) || [];
    
    if (systemIds.length === 0) {
      log("No systems found");
      return {
        uptime_pct: 0,
        active_systems: 0,
        errors_24h: 0,
        avg_latency_ms: 0,
        total_rpm: 0,
      };
    }

    // Get latest health snapshot per system
    const { data: healthData } = await supabase
      .from('system_health')
      .select('system_id, uptime_pct, errors_24h, latency_ms, throughput_rpm')
      .in('system_id', systemIds)
      .order('observed_at', { ascending: false });

    // Group by system_id and take the latest
    const latestHealthMap = new Map();
    healthData?.forEach((h: any) => {
      if (!latestHealthMap.has(h.system_id)) {
        latestHealthMap.set(h.system_id, h);
      }
    });

    const latestHealth = Array.from(latestHealthMap.values());

    // Calculate aggregates
    const uptime_pct = latestHealth.length > 0
      ? latestHealth.reduce((sum: number, h: any) => sum + (h.uptime_pct || 0), 0) / latestHealth.length
      : 0;
    
    const errors_24h = latestHealth.reduce((sum: number, h: any) => sum + (h.errors_24h || 0), 0);
    
    const avg_latency_ms = latestHealth.length > 0
      ? latestHealth.reduce((sum: number, h: any) => sum + (h.latency_ms || 0), 0) / latestHealth.length
      : 0;
    
    const total_rpm = latestHealth.reduce((sum: number, h: any) => sum + (h.throughput_rpm || 0), 0);

    log("Ops overview fetched", { activeSystems, errors_24h });

    return {
      uptime_pct: Math.round(uptime_pct * 10) / 10,
      active_systems: activeSystems,
      errors_24h,
      avg_latency_ms: Math.round(avg_latency_ms),
      total_rpm,
    };
  }
}));
