/**
 * /v1/langgraph-upsert-memory
 * 
 * PURPOSE: Store or update agent memory state
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - agent_id: string (required) - Agent identifier
 * - state: object (required) - Agent state to store
 * 
 * RESPONSE:
 * - success: boolean
 * - data: object - Created/updated memory record
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";

const InputSchema = z.object({
  agent_id: z.string().min(1, "Agent ID is required"),
  state: z.record(z.unknown()),
});

serve(createHandler({
  name: "langgraph-upsert-memory",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { agent_id, state } = input;
    const { supabase, userId, log } = context;

    log("Upserting agent memory", { agent_id });

    const { data, error } = await supabase
      .from('agent_memory')
      .upsert({
        agent_id,
        user_id: userId,
        state,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'agent_id,user_id'
      })
      .select()
      .single();

    if (error) {
      throw {
        code: ErrorCodes.INTERNAL_ERROR,
        message: `Failed to upsert memory: ${error.message}`,
        status: 500,
      };
    }

    log("Memory upserted successfully", { agent_id });

    return {
      success: true,
      data,
    };
  }
}));
