/**
 * /v1/builders-update
 * 
 * PURPOSE: Update builder draft (patch specific fields)
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - builderId: string (required, UUID)
 * - updates: object (fields to update in config)
 * 
 * RESPONSE:
 * - builder: Updated builder object
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

const InputSchema = z.object({
  builderId: z.string().uuid(),
  updates: z.record(z.unknown()),
});

serve(createHandler({
  name: "builders-update",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { builderId, updates } = input;
    const { supabase, userId, log } = context;

    log("Updating builder draft", { builderId, updates });

    // First fetch current builder
    const { data: currentBuilder, error: fetchError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', builderId)
      .eq('owner_id', userId)
      .single();

    if (fetchError) {
      log("Builder fetch failed", { error: fetchError.message });
      throw {
        code: 'NOT_FOUND',
        message: 'Builder not found',
        status: 404,
      };
    }

    // Deep merge updates into config to prevent data loss on nested updates
    const currentConfig = currentBuilder.config as Record<string, any> || {};
    const updatedConfig = {
      ...currentConfig,
      ...updates,
      // Deep merge for nested objects like workflow and model_config
      workflow: updates.workflow 
        ? { ...(currentConfig.workflow || {}), ...updates.workflow }
        : currentConfig.workflow,
      model_config: updates.model_config
        ? { ...(currentConfig.model_config || {}), ...updates.model_config }
        : currentConfig.model_config,
      updated_at: new Date().toISOString()
    };

    log("Config merge result", { 
      hadWorkflow: !!currentConfig.workflow,
      hasWorkflowNow: !!updatedConfig.workflow,
      workflowActions: updatedConfig.workflow?.actions?.length || 0
    });

    // Update name if goal changed
    let nameUpdate = {};
    if (updates.goal && updates.goal !== currentBuilder.config?.goal) {
      nameUpdate = { name: updates.goal as string };
    }

    // Update builder
    const { data: builder, error: updateError } = await supabase
      .from('agents')
      .update({
        ...nameUpdate,
        config: updatedConfig
      })
      .eq('id', builderId)
      .eq('owner_id', userId)
      .select()
      .single();

    if (updateError) {
      log("Builder update failed", { error: updateError.message });
      throw {
        code: 'DATABASE_ERROR',
        message: updateError.message,
        status: 500,
      };
    }

    log("Builder updated", { builderId });

    return {
      builder
    };
  }
}));
