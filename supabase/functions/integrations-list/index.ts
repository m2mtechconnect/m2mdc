/**
 * /v1/integrations-list
 * 
 * PURPOSE: List all integrations with stats
 * AUTH: user (requires valid JWT token, executive role)
 * 
 * REQUEST: None (GET endpoint)
 * 
 * RESPONSE:
 * - integrations: Array of integration objects
 * - stats: Aggregated statistics
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { checkRole } from "../_shared/auth.ts";
import { ErrorCodes } from "../_shared/types.ts";

serve(createHandler({
  name: "integrations-list",
  authLevel: "user",
  handler: async (input, context) => {
    const { supabase, userId, log } = context;

    log("Checking user role");

    // Check if user has executive role
    const hasRole = await checkRole(supabase, userId!, 'executive');
    if (!hasRole) {
      log("Access denied - executive role required");
      throw {
        code: ErrorCodes.FORBIDDEN,
        message: 'Executive role required',
        status: 403,
      };
    }

    log("Fetching integrations");

    // Get all integrations
    const { data: integrations, error } = await supabase
      .from('integrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      log("Query error", { error: error.message });
      throw {
        code: 'DATABASE_ERROR',
        message: error.message,
        status: 500,
      };
    }

    // Calculate stats
    const stats = {
      total: integrations?.length || 0,
      connected: integrations?.filter((i: any) => i.state === 'connected').length || 0,
      errors: integrations?.filter((i: any) => i.state === 'error').length || 0,
      authExpired: integrations?.filter((i: any) => i.state === 'auth-expired').length || 0,
    };

    log("Integrations fetched", stats);

    return { integrations, stats };
  }
}));
