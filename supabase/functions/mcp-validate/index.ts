/**
 * /v1/mcp-validate
 * 
 * PURPOSE: Validate MCP server endpoint and capabilities
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - endpoint: string (required)
 * - transport: string (required)
 * - auth: object (optional, with token)
 * 
 * RESPONSE:
 * - success: boolean
 * - capabilities: Server capabilities (tools, resources, prompts)
 * - latency: Response time in ms
 * - verified_at: Verification timestamp
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

const InputSchema = z.object({
  endpoint: z.string().url("Invalid endpoint URL"),
  transport: z.string().min(1, "Transport required"),
  auth: z.object({
    token: z.string().optional(),
  }).optional(),
});

serve(createHandler({
  name: "mcp-validate",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { endpoint, auth } = input;
    const { log } = context;

    log("Validating MCP server", { endpoint });

    const startTime = Date.now();

    // Probe MCP server capabilities
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (auth?.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    }

    try {
      const response = await fetch(`${endpoint}/capabilities`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const capabilities = await response.json();
      const latency = Date.now() - startTime;

      log("MCP server validated", { latency, tools: capabilities.tools?.length || 0 });

      return {
        success: true,
        capabilities: {
          tools: capabilities.tools || [],
          resources: capabilities.resources || [],
          prompts: capabilities.prompts || [],
        },
        latency,
        verified_at: new Date().toISOString(),
      };

    } catch (fetchError) {
      const latency = Date.now() - startTime;
      log("Validation failed", { error: fetchError instanceof Error ? fetchError.message : 'Unknown', latency });
      
      return {
        success: false,
        error: fetchError instanceof Error ? fetchError.message : 'Failed to validate MCP server',
        latency,
      };
    }
  }
}));
