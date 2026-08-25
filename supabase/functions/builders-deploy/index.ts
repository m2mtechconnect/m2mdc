/**
 * /v1/builders-deploy
 *
 * Validates and activates a configured builder record. This endpoint does not
 * claim cloud runtime provisioning. Twin/process-twin configurations must be
 * durably bound to a facility visible through the authenticated caller's RLS
 * context before activation is allowed.
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

    log("Activating builder configuration", { builderId });

    const { data: builder, error: fetchError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', builderId)
      .eq('owner_id', userId)
      .single();

    if (fetchError) {
      log("Builder fetch failed", { error: fetchError.message });
      throw { code: 'NOT_FOUND', message: 'Builder not found', status: 404 };
    }

    const config = builder.config as Record<string, any>;
    const isDCTwin = !!config.overview;
    const effectiveGoal = config.goal || config.overview?.twinSummary || config.overview?.description;
    const effectiveIndustry = config.industry || config.overview?.industry || config.overview?.industries?.[0];
    const effectiveDepartment = config.department || (isDCTwin ? 'IT Operations' : null);
    const effectiveType = config.type || (isDCTwin ? '3d_twin' : 'agent');

    const errors: string[] = [];
    if (!effectiveGoal) errors.push('Goal is required');
    if (!effectiveIndustry) errors.push('Industry is required');
    if (!effectiveDepartment) errors.push('Department is required');
    if (!effectiveType) errors.push('Type is required');

    const hasStandardWorkflow = config.workflow?.actions?.length > 0;
    const hasDCWorkflows = Array.isArray(config.workflows) && config.workflows.length > 0;
    if (!hasStandardWorkflow && !hasDCWorkflows) errors.push('Workflow configuration is required');

    const hasModelConfig = config.model_config?.model || config.intelligence?.modelId;
    if (!hasModelConfig) errors.push('Model configuration is required');

    // Facility identity is a hard prerequisite for DC/process-twin activation.
    // The caller-bound client provides the authorization boundary.
    if (effectiveType === '3d_twin' || effectiveType === 'process_twin') {
      const twinId = typeof config.twin_id === 'string' ? config.twin_id : null;
      if (!twinId) {
        errors.push('Facility binding is required');
      } else {
        const { data: facility, error: facilityError } = await supabase
          .from('data_centre_twins')
          .select('id')
          .eq('id', twinId)
          .maybeSingle();
        if (facilityError || !facility) errors.push('Bound facility is not available');
      }
    }

    log("Activation validation", {
      isDCTwin,
      effectiveType,
      twinId: config.twin_id ?? null,
      hasStandardWorkflow,
      hasDCWorkflows,
      standardActions: config.workflow?.actions?.length || 0,
      dcWorkflows: config.workflows?.length || 0,
    });

    if (errors.length > 0) {
      log("Activation validation failed", { errors });
      throw { code: 'VALIDATION_ERROR', message: errors.join(', '), status: 400 };
    }

    const nowIso = new Date().toISOString();
    const updatedConfig = {
      ...config,
      goal: effectiveGoal,
      industry: effectiveIndustry,
      department: effectiveDepartment,
      type: effectiveType,
      deployed_at: nowIso,
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
      .eq('owner_id', userId)
      .select()
      .single();

    if (deployError) {
      log("Configuration activation failed", { error: deployError.message });
      throw { code: 'DATABASE_ERROR', message: deployError.message, status: 500 };
    }

    // This row records configuration activation only. Runtime provisioning and
    // runtime health are separate Phase 6 contracts and must remain unclaimed.
    const { error: deploymentError } = await supabase
      .from('deployments')
      .insert({
        system_id: builderId,
        version: 'v1',
        status: 'configured',
        deployed_by: userId,
        region: isDCTwin ? (config.deployment?.targetDeploymentRegion || 'ca-central-1') : 'unassigned',
        model: updatedConfig.model_config.model,
        grounding: !!config.model_config?.rag || !!config.intelligence?.ragEnabled,
        runtime_url: null,
        health: null,
      });

    if (deploymentError) {
      log("Configuration activation record creation failed", { error: deploymentError.message });
      throw { code: 'DATABASE_ERROR', message: 'Activation evidence could not be recorded', status: 500 };
    }

    log("Builder configuration activated", { builderId, twinId: config.twin_id ?? null });

    return {
      deployment_id: builderId,
      status: 'success',
      agent_url: `/app/agents/${builderId}/manage`,
      agent: deployedAgent,
      runtime_provisioned: false,
    };
  }
}));