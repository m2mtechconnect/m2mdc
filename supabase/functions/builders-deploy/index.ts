/**
 * /v1/builders-deploy
 * 
 * PURPOSE: Deploy builder as live agent/twin
 * AUTH: user (requires valid JWT token)
 * 
 * REQUEST:
 * - builderId: string (required, UUID)
 * 
 * RESPONSE:
 * - deployment_id: string
 * - status: "success" | "error"
 * - agent_url: string (if success)
 * - message: string (if error)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createHandler } from "../_shared/handler.ts";

const InputSchema = z.object({
  builderId: z.string().uuid(),
});

serve(createHandler({
  name: "builders-deploy",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { builderId } = input;
    const { supabase, userId, log } = context;

    log("Deploying builder", { builderId });

    // Fetch builder
    const { data: builder, error: fetchError } = await supabase
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

    const config = builder.config as Record<string, any>;

    // Derive effective type with a safe default
    const effectiveType = config.type || 'agent';

    // Validate required fields (template is optional for now)
    const errors: string[] = [];
    if (!config.goal) errors.push('Goal is required');
    if (!config.industry) errors.push('Industry is required');
    if (!config.department) errors.push('Department is required');
    if (!effectiveType) errors.push('Type is required');
    
    // Enhanced workflow validation
    if (!config.workflow) {
      errors.push('Workflow configuration is required');
    } else if (!Array.isArray(config.workflow.actions)) {
      errors.push('Workflow actions must be an array');
    } else if (config.workflow.actions.length === 0) {
      errors.push('Workflow must have at least one action');
    }
    
    // Log workflow state for debugging
    log("Workflow validation", { 
      hasWorkflow: !!config.workflow,
      actionsType: typeof config.workflow?.actions,
      actionsIsArray: Array.isArray(config.workflow?.actions),
      actionsLength: config.workflow?.actions?.length || 0,
      actions: config.workflow?.actions
    });
    
    if (!config.model_config?.model) errors.push('Model configuration is required');

    // Log when we have to fall back the type so we can tighten this later
    if (!config.type && effectiveType) {
      log('Type missing in config, defaulting before deploy', { previousType: config.type, effectiveType });
    }

    if (errors.length > 0) {
      log("Deployment validation failed", { errors });
      throw {
        code: 'VALIDATION_ERROR',
        message: errors.join(', '),
        status: 400,
      };
    }

    // Update agent to deployed status
    const nowIso = new Date().toISOString();
    const updatedConfig = {
      ...config,
      type: effectiveType,
      deployed_at: nowIso,
    };

    const { data: deployedAgent, error: deployError } = await supabase
      .from('agents')
      .update({
        status: 'active',
        deployed_at: nowIso,
        config: updatedConfig,
      })
      .eq('id', builderId)
      .select()
      .single();

    if (deployError) {
      log("Deployment failed", { error: deployError.message });
      throw {
        code: 'DATABASE_ERROR',
        message: deployError.message,
        status: 500,
      };
    }

    // Create deployment record
    const { error: deploymentError } = await supabase
      .from('deployments')
      .insert({
        system_id: builderId,
        version: 'v1',
        status: 'active',
        deployed_by: userId,
        region: 'us-east-1',
        model: config.model_config.model,
        grounding: !!config.model_config.rag
      });

    if (deploymentError) {
      log("Deployment record creation failed", { error: deploymentError.message });
    }

    log("Builder deployed successfully", { builderId });

    return {
      deployment_id: builderId,
      status: 'success',
      agent_url: `/agents/${builderId}`,
      agent: deployedAgent
    };
  }
}));
