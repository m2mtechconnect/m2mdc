/**
 * /v1/mcp-test-tool
 * 
 * PURPOSE: Test MCP tool execution
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - system_id: string (required)
 * - server_name: string (required)
 * - tool_name: string (required)
 * - args: object (optional)
 * 
 * RESPONSE:
 * - success: boolean
 * - result: Tool execution result
 * - latency: Execution time in ms
 * - tool: Tool name
 * - server: Server name
 * - executed_at: Execution timestamp
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

const InputSchema = z.object({
  system_id: z.string().uuid("Invalid system ID"),
  server_name: z.string().min(1, "Server name required"),
  tool_name: z.string().min(1, "Tool name required"),
  args: z.record(z.any()).optional(),
});

serve(createHandler({
  name: "mcp-test-tool",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { system_id, server_name, tool_name, args } = input;
    const { supabase, log } = context;

    log("Testing MCP tool", { server_name, tool_name });

    // Fetch intelligence settings
    const { data: settings, error: settingsError } = await supabase
      .from('intelligence_settings')
      .select('mcp_servers, tool_allowlist')
      .eq('system_id', system_id)
      .maybeSingle();

    if (settingsError) {
      log("Failed to fetch settings", { error: settingsError.message });
      throw {
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch intelligence settings',
        status: 500,
      };
    }

    if (!settings) {
      throw {
        code: 'NOT_FOUND',
        message: 'Intelligence settings not found',
        status: 404,
      };
    }

    // Find the server
    const server = settings.mcp_servers?.find((s: any) => s.name === server_name);
    if (!server) {
      throw {
        code: 'NOT_FOUND',
        message: `MCP server '${server_name}' not found`,
        status: 404,
      };
    }

    // Check if tool is in allowlist
    const toolIdentifier = `${server_name}:${tool_name}`;
    if (!settings.tool_allowlist?.includes(toolIdentifier)) {
      throw {
        code: 'FORBIDDEN',
        message: `Tool '${tool_name}' is not enabled in allowlist`,
        status: 403,
      };
    }

    // Validate tool exists in capabilities
    const tool = server.capabilities?.tools?.find((t: any) => t.name === tool_name);
    if (!tool) {
      throw {
        code: 'NOT_FOUND',
        message: `Tool '${tool_name}' not found in server capabilities`,
        status: 404,
      };
    }

    const startTime = Date.now();

    // Get auth token if needed
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (server.auth_meta?.type === 'bearer') {
      const { data: tokenData } = await supabase
        .from('mcp_tokens')
        .select('token')
        .eq('system_id', system_id)
        .eq('server_name', server_name)
        .single();

      if (tokenData?.token) {
        const token = new TextDecoder().decode(tokenData.token);
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // Call the MCP tool endpoint
    try {
      const response = await fetch(`${server.endpoint}/tools/${tool_name}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(args || {}),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Tool execution failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const latency = Date.now() - startTime;

      log("Tool executed successfully", { tool_name, latency });

      return {
        success: true,
        result,
        latency,
        tool: tool_name,
        server: server_name,
        executed_at: new Date().toISOString(),
      };

    } catch (toolError) {
      const latency = Date.now() - startTime;
      log("Tool execution failed", { error: toolError instanceof Error ? toolError.message : 'Unknown', latency });
      
      return {
        success: false,
        error: toolError instanceof Error ? toolError.message : 'Tool execution failed',
        latency,
      };
    }
  }
}));
