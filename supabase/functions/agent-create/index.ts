/**
 * /v1/agent-create
 * 
 * PURPOSE: Create a new AI agent
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - name: string (required)
 * - description: string (optional)
 * - template_id: string (optional)
 * - config: object (optional)
 * 
 * RESPONSE:
 * - agent: Created agent object
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

// Input validation schema
const InputSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(1000).optional(),
  template_id: z.string().uuid().optional(),
  config: z.record(z.unknown()).optional().default({}),
});

serve(createHandler({
  name: "agent-create",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { name, description, template_id, config } = input;
    const { supabase, userId, log } = context;

    log("Creating agent", { name, template_id });

    // Create agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .insert({
        name,
        description,
        template_id,
        config,
        owner_id: userId,
        status: 'draft',
        version: 'v0',
      })
      .select()
      .single();

    if (agentError) {
      log("Agent creation failed", { error: agentError.message });
      throw {
        code: 'DATABASE_ERROR',
        message: agentError.message,
        status: 500,
      };
    }

    log("Agent created successfully", { agentId: agent.id });

    return { agent };
  }
}));
