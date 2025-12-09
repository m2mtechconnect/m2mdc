/**
 * /v1/mcp-delete
 * 
 * PURPOSE: Remove MCP server from system
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - system_id: string (required)
 * - server_name: string (required)
 * 
 * RESPONSE:
 * - success: boolean
 * - server_name: Deleted server name
 * - deleted_at: Deletion timestamp
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

const InputSchema = z.object({
  system_id: z.string().uuid("Invalid system ID"),
  server_name: z.string().min(1, "Server name required"),
});

serve(createHandler({
  name: "mcp-delete",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { system_id, server_name } = input;
    const { supabase, log } = context;

    log("Deleting MCP server", { system_id, server_name });

    // Fetch current settings
    const { data: settings, error: fetchError } = await supabase
      .from('intelligence_settings')
      .select('mcp_servers, tool_allowlist')
      .eq('system_id', system_id)
      .maybeSingle();

    if (fetchError) {
      log("Failed to fetch settings", { error: fetchError.message });
      throw {
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch intelligence settings',
        status: 500,
      };
    }

    if (!settings) {
      throw {
        code: 'NOT_FOUND',
        message: 'No intelligence settings found for this system',
        status: 404,
      };
    }

    // Remove server from mcp_servers array
    const updatedServers = (settings.mcp_servers || []).filter(
      (s: any) => s.name !== server_name
    );

    // Remove tools from allowlist
    const updatedAllowlist = (settings.tool_allowlist || []).filter(
      (t: string) => !t.startsWith(`${server_name}:`)
    );

    // Update intelligence_settings
    const { error: updateError } = await supabase
      .from('intelligence_settings')
      .update({
        mcp_servers: updatedServers,
        tool_allowlist: updatedAllowlist,
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

    // Delete encrypted token (non-blocking)
    void supabase
      .from('mcp_tokens')
      .delete()
      .eq('system_id', system_id)
      .eq('server_name', server_name);

    log("MCP server deleted", { server_name });

    return {
      success: true,
      server_name,
      deleted_at: new Date().toISOString(),
    };
  }
}));
