/**
 * /v1/mcp-connect
 * 
 * PURPOSE: Store MCP server credentials for user
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - server_id: string (required)
 * - auth_type: string (required)
 * - api_key: string (optional)
 * - access_token: string (optional)
 * - refresh_token: string (optional)
 * - expires_in: number (optional)
 * 
 * RESPONSE:
 * - success: boolean
 * - server_id: Server ID
 * - server_name: Server name
 * - auth_type: Auth type
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

const InputSchema = z.object({
  server_id: z.string().uuid("Invalid server ID"),
  auth_type: z.string().min(1, "Auth type required"),
  api_key: z.string().optional(),
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  expires_in: z.number().int().positive().optional(),
});

serve(createHandler({
  name: "mcp-connect",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { server_id, auth_type, api_key, access_token, refresh_token, expires_in } = input;
    const { supabase, userId, log } = context;

    log("Connecting to MCP server", { server_id, auth_type });

    // Validate server exists
    const { data: server, error: serverError } = await supabase
      .from('mcp_servers_catalog')
      .select('*')
      .eq('id', server_id)
      .single();

    if (serverError || !server) {
      log("Server not found", { server_id });
      throw {
        code: 'NOT_FOUND',
        message: 'Server not found',
        status: 404,
      };
    }

    const tokenExpiresAt = expires_in 
      ? new Date(Date.now() + expires_in * 1000) 
      : null;

    // Store credentials (encrypted at rest by Supabase)
    const { error: credError } = await supabase
      .from('mcp_credentials')
      .upsert({
        user_id: userId,
        server_id,
        auth_type,
        access_token: access_token || null,
        refresh_token: refresh_token || null,
        token_expires_at: tokenExpiresAt,
        api_key: api_key || null,
        metadata: { connected_at: new Date() },
        updated_at: new Date(),
      }, {
        onConflict: 'user_id,server_id',
      });

    if (credError) {
      log("Credential storage failed", { error: credError.message });
      throw {
        code: 'DATABASE_ERROR',
        message: 'Failed to store credentials',
        status: 500,
      };
    }

    log("MCP server connected", { server_id, server_name: server.name });

    return {
      success: true,
      server_id,
      server_name: server.name,
      auth_type,
    };
  }
}));
