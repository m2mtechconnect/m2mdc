/**
 * /v1/mcp-verify
 * 
 * PURPOSE: Verify user's MCP server credentials and connection
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - server_id: string (required)
 * 
 * RESPONSE:
 * - verified: boolean
 * - server_id: Server ID (if verified)
 * - server_name: Server name (if verified)
 * - tools_count: Number of tools (if verified)
 * - error: Error message (if not verified)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

const InputSchema = z.object({
  server_id: z.string().uuid("Invalid server ID"),
});

serve(createHandler({
  name: "mcp-verify",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { server_id } = input;
    const { supabase, userId, log } = context;

    log("Verifying MCP server connection", { server_id });

    // Get server details
    const { data: server, error: serverError } = await supabase
      .from('mcp_servers_catalog')
      .select('*')
      .eq('id', server_id)
      .single();

    if (serverError || !server) {
      throw {
        code: 'NOT_FOUND',
        message: 'Server not found',
        status: 404,
      };
    }

    // Get user credentials for this server
    const { data: creds, error: credsError } = await supabase
      .from('mcp_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('server_id', server_id)
      .single();

    if (credsError || !creds) {
      return {
        verified: false,
        error: 'No credentials found. Please connect first.',
      };
    }

    // Check if server has endpoint
    const endpoint = server.endpoint || server.raw?.endpoint;
    if (!endpoint) {
      return {
        verified: false,
        error: 'Server has no endpoint configured',
      };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authentication
    if (creds.auth_type === 'api_key' && creds.api_key) {
      headers['Authorization'] = `Bearer ${creds.api_key}`;
    } else if (creds.auth_type === 'oauth2' && creds.access_token) {
      headers['Authorization'] = `Bearer ${creds.access_token}`;
    }

    // Try to list tools or ping health
    const verifyUrl = `${endpoint}/tools`;
    
    try {
      const response = await fetch(verifyUrl, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      if (!response.ok) {
        return {
          verified: false,
          error: `Verification failed: ${response.status} ${response.statusText}`,
          status_code: response.status,
        };
      }

      const data = await response.json();
      const toolsCount = data.tools?.length || 0;

      log("MCP server verified", { server_id, tools_count: toolsCount });

      return {
        verified: true,
        server_id,
        server_name: server.name,
        tools_count: toolsCount,
      };

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          verified: false,
          error: 'Verification timeout (10s)',
        };
      }

      throw {
        code: 'VERIFICATION_ERROR',
        message: error instanceof Error ? error.message : 'Verification failed',
        status: 500,
      };
    }
  }
}));
