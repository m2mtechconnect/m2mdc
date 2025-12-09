/**
 * /v1/ops-heartbeat
 * 
 * PURPOSE: Record system heartbeat for monitoring
 * AUTH: admin (uses service role)
 * 
 * REQUEST:
 * - system_id: string (required, UUID)
 * 
 * RESPONSE:
 * - success: boolean
 * - message: string
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";
import { ErrorCodes } from "../_shared/types.ts";

// Input validation schema
const InputSchema = z.object({
  system_id: z.string().uuid("Invalid system ID"),
});

serve(createHandler({
  name: "ops-heartbeat",
  authLevel: "admin",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { system_id } = input;
    const { supabase, log } = context;

    log("Recording heartbeat", { system_id });

    // Validate system exists
    const { data: system, error: systemError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', system_id)
      .single();

    if (systemError || !system) {
      log("System not found", { system_id });
      throw {
        code: ErrorCodes.NOT_FOUND,
        message: 'System not found',
        status: 404,
      };
    }

    const now = new Date().toISOString();

    // Insert heartbeat
    const { error: heartbeatError } = await supabase
      .from('heartbeats')
      .insert({
        system_id,
        beat_at: now,
      });

    if (heartbeatError) {
      log("Heartbeat insert failed", { error: heartbeatError.message });
      throw {
        code: 'DATABASE_ERROR',
        message: heartbeatError.message,
        status: 500,
      };
    }

    // Update system last_heartbeat and set status to active
    const { error: updateError } = await supabase
      .from('agents')
      .update({
        last_heartbeat: now,
        status: 'active',
      })
      .eq('id', system_id);

    if (updateError) {
      log("System update failed", { error: updateError.message });
      throw {
        code: 'DATABASE_ERROR',
        message: updateError.message,
        status: 500,
      };
    }

    log("Heartbeat recorded successfully", { system_id });

    return { 
      success: true, 
      message: 'Heartbeat recorded' 
    };
  }
}));
