/**
 * /v1/mcp-register
 * 
 * PURPOSE: Register MCP server for system from Arcade catalog
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - system_id: string (required)
 * - server: object (required, Arcade server data)
 * 
 * RESPONSE:
 * - success: boolean
 * - message: Success message
 * - server: Registered server object
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

const ArcadeServerSchema = z.object({
  arcade_server_id: z.string(),
  name: z.string(),
  logo: z.string().optional(),
  designation: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  short_description: z.string(),
  auth_method: z.string(),
  endpoint: z.string().optional(),
  capabilities_count: z.number().optional(),
});

const InputSchema = z.object({
  system_id: z.string().uuid("Invalid system ID"),
  server: ArcadeServerSchema,
});

serve(createHandler({
  name: "mcp-register",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { system_id, server } = input;
    const { supabase, log } = context;

    log("Registering MCP server", { server_name: server.name, system_id });

    // Create server record from Arcade data
    const serverRecord = {
      ...server,
      registered_at: new Date().toISOString(),
      status: 'registered',
      capabilities: {
        tools: [],
        resources: [],
        prompts: []
      }
    };

    // Get or create intelligence_settings
    const { data: existing, error: fetchError } = await supabase
      .from('intelligence_settings')
      .select('mcp_servers')
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

    let currentServers = [];
    if (existing?.mcp_servers) {
      currentServers = Array.isArray(existing.mcp_servers) ? existing.mcp_servers : [];
    }

    // Check if server already exists
    const serverExists = currentServers.some(
      (s: any) => s.arcade_server_id === server.arcade_server_id
    );

    if (serverExists) {
      log("Server already registered");
      return {
        success: true,
        message: 'Server already registered',
        server: serverRecord,
      };
    }

    // Add new server
    currentServers.push(serverRecord);

    // Upsert intelligence_settings
    const { error: upsertError } = await supabase
      .from('intelligence_settings')
      .upsert({
        system_id,
        mcp_servers: currentServers,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'system_id'
      });

    if (upsertError) {
      log("Upsert failed", { error: upsertError.message });
      throw {
        code: 'DATABASE_ERROR',
        message: 'Failed to register server',
        status: 500,
      };
    }

    log("MCP server registered", { server_name: server.name });

    return {
      success: true,
      message: `${server.name} registered successfully`,
      server: serverRecord,
    };
  }
}));
