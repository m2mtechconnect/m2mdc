/**
 * /v1/runs-recent
 * 
 * PURPOSE: Get recent agent runs for the authenticated user
 * AUTH: public (returns empty array if not authenticated)
 * 
 * REQUEST: None
 * 
 * RESPONSE:
 * - Array of recent agent run objects with agent details
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHandler } from "../_shared/handler.ts";

serve(createHandler({
  name: "runs-recent",
  authLevel: "public",
  handler: async (input, context) => {
    const { supabase, userId, log } = context;

    // If no user, return empty array
    if (!userId) {
      log("No authenticated user, returning empty array");
      return [];
    }

    log("Fetching recent runs", { userId });

    const { data: runs, error } = await supabase
      .from('agent_runs')
      .select(`
        *,
        agents!inner(name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      log("Query error", { error: error.message });
      throw {
        code: 'DATABASE_ERROR',
        message: error.message,
        status: 500,
      };
    }

    log("Recent runs fetched", { count: runs?.length || 0 });

    return runs || [];
  }
}));