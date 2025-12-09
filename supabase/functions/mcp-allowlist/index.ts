/**
 * /v1/mcp-allowlist
 * 
 * PURPOSE: Manage MCP tool allowlist for systems
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - system_id: string (required)
 * - tool_name: string (required)
 * - enabled: boolean (required)
 * 
 * RESPONSE:
 * - success: boolean
 * - tool_allowlist: Array of enabled tools
 * - message: Success message
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

const InputSchema = z.object({
  system_id: z.string().uuid("Invalid system ID"),
  tool_name: z.string().min(1, "Tool name required"),
  enabled: z.boolean(),
});

serve(createHandler({
  name: "mcp-allowlist",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { system_id, tool_name, enabled } = input;
    const { supabase, log } = context;

    log("Managing tool allowlist", { tool_name, enabled });

    // Get current allowlist
    const { data: settings, error: fetchError } = await supabase
      .from('intelligence_settings')
      .select('tool_allowlist')
      .eq('system_id', system_id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      log("Failed to fetch settings", { error: fetchError.message });
      throw {
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch intelligence settings',
        status: 500,
      };
    }

    let currentAllowlist = settings?.tool_allowlist || [];

    // Update allowlist based on enabled flag
    if (enabled) {
      if (!currentAllowlist.includes(tool_name)) {
        currentAllowlist = [...currentAllowlist, tool_name];
      }
    } else {
      currentAllowlist = currentAllowlist.filter((t: string) => t !== tool_name);
    }

    // Upsert intelligence_settings
    if (!settings) {
      const { error: insertError } = await supabase
        .from('intelligence_settings')
        .insert({
          system_id,
          tool_allowlist: currentAllowlist,
          mcp_servers: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        log("Insert failed", { error: insertError.message });
        throw {
          code: 'DATABASE_ERROR',
          message: 'Failed to create intelligence settings',
          status: 500,
        };
      }
    } else {
      const { error: updateError } = await supabase
        .from('intelligence_settings')
        .update({
          tool_allowlist: currentAllowlist,
          updated_at: new Date().toISOString()
        })
        .eq('system_id', system_id);

      if (updateError) {
        log("Update failed", { error: updateError.message });
        throw {
          code: 'DATABASE_ERROR',
          message: 'Failed to update intelligence settings',
          status: 500,
        };
      }
    }

    log("Tool allowlist updated", { total_tools: currentAllowlist.length });

    return {
      success: true,
      tool_allowlist: currentAllowlist,
      message: `${tool_name} ${enabled ? 'enabled' : 'disabled'}`,
    };
  }
}));
