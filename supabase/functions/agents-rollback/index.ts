/**
 * /v1/agents-rollback
 * 
 * PURPOSE: Rollback/archive agent
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - agentId: string (required, UUID)
 * 
 * RESPONSE:
 * - success: boolean
 * - message: string
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

// Input validation schema
const InputSchema = z.object({
  agentId: z.string().uuid("Invalid agent ID"),
});

serve(createHandler({
  name: "agents-rollback",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { agentId } = input;
    const { supabase, userId, log } = context;

    log("Rolling back agent", { agentId });

    // Archive current version
    const { error: archiveError } = await supabase
      .from('agents')
      .update({ status: 'archived' })
      .eq('id', agentId)
      .eq('owner_id', userId);

    if (archiveError) {
      log("Rollback failed", { error: archiveError.message });
      throw {
        code: 'DATABASE_ERROR',
        message: archiveError.message,
        status: 500,
      };
    }

    log("Agent rolled back successfully", { agentId });

    return { 
      success: true,
      message: 'Agent rolled back successfully'
    };
  }
}));
