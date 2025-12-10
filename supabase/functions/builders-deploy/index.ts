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

    // Support both standard builder and DC Twin builder data structures
    // DC Twin stores data in 'overview' object, standard builder at top level
    const isDCTwin = !!config.overview;
    
    // Extract fields with DC Twin fallback
    const effectiveGoal = config.goal || config.overview?.twinSummary || config.overview?.description;
    const effectiveIndustry = config.industry || config.overview?.industry || config.overview?.industries?.[0];
    const effectiveDepartment = config.department || (isDCTwin ? 'IT Operations' : null);
    const effectiveType = config.type || (isDCTwin ? '3d_twin' : 'agent');

    // Validate required fields (template is optional for now)
    const errors: string[] = [];
    if (!effectiveGoal) errors.push('Goal is required');
    if (!effectiveIndustry) errors.push('Industry is required');
    if (!effectiveDepartment) errors.push('Department is required');
    if (!effectiveType) errors.push('Type is required');
    
    // Enhanced workflow validation - support both standard and DC Twin structures
    // DC Twin uses 'workflows' array, standard builder uses 'workflow.actions'
    const hasStandardWorkflow = config.workflow?.actions?.length > 0;
    const hasDCWorkflows = Array.isArray(config.workflows) && config.workflows.length > 0;
    
    if (!hasStandardWorkflow && !hasDCWorkflows) {
      errors.push('Workflow configuration is required');
    }
    
    // Log workflow state for debugging
    log("Workflow validation", { 
      isDCTwin,
      hasStandardWorkflow,
      hasDCWorkflows,
      standardActions: config.workflow?.actions?.length || 0,
      dcWorkflows: config.workflows?.length || 0,
    });
    
    // Model config validation - DC Twin stores in 'intelligence' object
    const hasModelConfig = config.model_config?.model || config.intelligence?.modelId;
    if (!hasModelConfig) errors.push('Model configuration is required');

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

    // Update agent to deployed status with normalized fields
    const nowIso = new Date().toISOString();
    const updatedConfig = {
      ...config,
      // Normalize fields for consistency
      goal: effectiveGoal,
      industry: effectiveIndustry,
      department: effectiveDepartment,
      type: effectiveType,
      deployed_at: nowIso,
      // Ensure model_config exists for DC Twin
      model_config: config.model_config || {
        model: config.intelligence?.modelId || 'google/gemini-2.5-flash',
        provider: config.intelligence?.modelProvider || 'google',
      },
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
        region: isDCTwin ? (config.deployment?.targetDeploymentRegion || 'ca-central-1') : 'us-east-1',
        model: updatedConfig.model_config.model,
        grounding: !!config.model_config?.rag || !!config.intelligence?.ragEnabled
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
