/**
 * /v1/agents-deploy
 * 
 * PURPOSE: Deploy or update agent
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - agentId: string (optional, UUID for update)
 * - name: string (required for new)
 * - description: string (optional)
 * - config: object (required)
 * - templateId: string (optional, UUID)
 * 
 * RESPONSE:
 * - Agent object
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

// Input validation schema
const InputSchema = z.object({
  agentId: z.string().uuid().optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  config: z.record(z.unknown()),
  templateId: z.string().uuid().optional(),
});

serve(createHandler({
  name: "agents-deploy",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { agentId, name, description, config, templateId } = input;
    const { supabase, userId, log } = context;

    if (agentId) {
      // Update existing agent
      log("Updating agent", { agentId });

      const { data, error } = await supabase
        .from('agents')
        .update({
          status: 'active',
          deployed_at: new Date().toISOString(),
          config
        })
        .eq('id', agentId)
        .eq('owner_id', userId)
        .select()
        .single();

      if (error) {
        log("Agent update failed", { error: error.message });
        throw {
          code: 'DATABASE_ERROR',
          message: error.message,
          status: 500,
        };
      }

      log("Agent updated", { agentId });
      return data;
    } else {
      // Create new agent
      if (!name) {
        throw {
          code: 'VALIDATION_ERROR',
          message: 'Name is required for new agents',
          status: 400,
        };
      }

      log("Creating new agent", { name });

      const { data, error } = await supabase
        .from('agents')
        .insert({
          name,
          description,
          config,
          template_id: templateId,
          owner_id: userId,
          status: 'active',
          deployed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        log("Agent creation failed", { error: error.message });
        throw {
          code: 'DATABASE_ERROR',
          message: error.message,
          status: 500,
        };
      }

      log("Agent created", { agentId: data.id });
      return data;
    }
  }
}));
