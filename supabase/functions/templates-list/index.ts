/**
 * /v1/templates-list
 * 
 * PURPOSE: List all agent templates
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST: None (GET endpoint)
 * 
 * RESPONSE:
 * - templates: Array of template objects
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHandler } from "../_shared/handler.ts";

serve(createHandler({
  name: "templates-list",
  authLevel: "user",
  handler: async (input, context) => {
    const { supabase, log } = context;

    log("Fetching templates");

    // Get all templates
    const { data: templates, error } = await supabase
      .from('agent_templates')
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

    log("Templates fetched", { count: templates?.length || 0 });

    return { templates };
  }
}));
