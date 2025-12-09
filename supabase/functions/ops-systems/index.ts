/**
 * /v1/ops-systems
 * 
 * PURPOSE: Get list of systems with health metrics and alerts
 * AUTH: admin (uses service role)
 * 
 * REQUEST (GET params):
 * - env: string (optional, default: 'all', environment filter)
 * - status: string (optional, default: 'all', status filter)
 * - page: number (optional, default: 1)
 * - pageSize: number (optional, default: 10)
 * - sort: string (optional, default: 'name', sort column)
 * 
 * RESPONSE:
 * - systems: Array of system objects with health and badges
 * - total: Total count
 * - page: Current page
 * - pageSize: Items per page
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

// Input validation schema
const InputSchema = z.object({
  env: z.string().optional().default('all'),
  status: z.string().optional().default('all'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  sort: z.string().optional().default('name'),
});

serve(createHandler({
  name: "ops-systems",
  authLevel: "admin",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { env = 'all', status = 'all', page = 1, pageSize = 10, sort = 'name' } = input;
    const { supabase, log } = context;

    log("Fetching ops systems", { env, status, page, pageSize, sort });

    // Build query
    let query = supabase
      .from('agents')
      .select('id, name, status, environment_id, last_heartbeat, environments(name)', { count: 'exact' });

    // Filter by environment
    if (env !== 'all') {
      const { data: envData } = await supabase
        .from('environments')
        .select('id')
        .eq('name', env)
        .maybeSingle();
      if (envData) {
        query = query.eq('environment_id', envData.id);
      }
    }

    // Filter by status
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: systems, error, count } = await query;
    if (error) {
      log("Query error", { error: error.message });
      throw {
        code: 'DATABASE_ERROR',
        message: error.message,
        status: 500,
      };
    }

    // Get latest health for each system
    const systemIds = systems?.map((s: any) => s.id) || [];
    const { data: healthData } = await supabase
      .from('system_health')
      .select('system_id, uptime_pct, errors_24h, latency_ms, throughput_rpm')
      .in('system_id', systemIds)
      .order('observed_at', { ascending: false });

    // Group health by system_id
    const healthMap = new Map();
    healthData?.forEach((h: any) => {
      if (!healthMap.has(h.system_id)) {
        healthMap.set(h.system_id, h);
      }
    });

    // Check for alerts (missed heartbeat, elevated latency, errors)
    const now = new Date();
    
    // Calculate p95 latency for alert threshold
    const allLatencies = healthData?.map((h: any) => h.latency_ms || 0).filter((l: number) => l > 0) || [];
    allLatencies.sort((a: number, b: number) => a - b);
    const p95Index = Math.floor(allLatencies.length * 0.95);
    const p95Latency = allLatencies[p95Index] || 0;

    // Build response
    const systemsTable = (systems || []).map((s: any) => {
      const health = healthMap.get(s.id);
      const badges = [];

      // Missed heartbeat check
      if (s.last_heartbeat) {
        const lastBeat = new Date(s.last_heartbeat);
        const minutesSince = (now.getTime() - lastBeat.getTime()) / (1000 * 60);
        if (minutesSince > 2) {
          badges.push('missed heartbeat');
        }
      }

      // Elevated latency check
      if (health?.latency_ms && health.latency_ms > p95Latency) {
        badges.push('elevated latency');
      }

      // Errors check
      if (health?.errors_24h && health.errors_24h > 0) {
        badges.push('errors');
      }

      return {
        id: s.id,
        name: s.name,
        status: s.status,
        environment: (s.environments as any)?.name || 'unknown',
        uptime: health?.uptime_pct ? `${health.uptime_pct.toFixed(1)}%` : '--',
        errors: health?.errors_24h || 0,
        latency: health?.latency_ms ? `${(health.latency_ms / 1000).toFixed(1)}s` : '--',
        throughput: health?.throughput_rpm ? `${health.throughput_rpm}/min` : '--',
        badges,
      };
    });

    log("Ops systems fetched", { count: systemsTable.length });

    return {
      systems: systemsTable,
      total: count || 0,
      page,
      pageSize,
    };
  }
}));
