/**
 * /v1/builders-deploy
 *
 * Validates and activates a configured builder record. This endpoint does not
 * claim cloud runtime provisioning and does not create a deployment record.
 * Twin/process-twin configurations must be durably bound to a facility visible
 * through the authenticated caller's RLS context before activation is allowed.
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

    let boundTwinId: string | null = null;
    if (effectiveType === '3d_twin' || effectiveType === 'process_twin') {
      boundTwinId = typeof config.twin_id === 'string' ? config.twin_id : null;
      if (!boundTwinId) {
        errors.push('Facility binding is required');
      } else {
        const { data: facility, error: facilityError } = await supabase
          .from('data_centre_twins')
          .select('id')
          .eq('id', boundTwinId)
          .maybeSingle();
        if (facilityError || !facility) errors.push('Bound facility is not available');
      }
    }

    log("Activation validation", {
      isDCTwin,
      effectiveType,
      twinId: boundTwinId,
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
      configuration_activated_at: nowIso,
      runtime_provisioned: false,
      model_config: config.model_config || {
        model: config.intelligence?.modelId || 'google/gemini-2.5-flash',
        provider: config.intelligence?.modelProvider || 'google',
      },
    };

    const { data: activatedAgent, error: activationError } = await supabase
      .from('agents')
      .update({
        status: 'active',
        config: updatedConfig,
      })
      .eq('id', builderId)
      .eq('owner_id', userId)
      .select()
      .single();

    if (activationError) {
      log("Configuration activation failed", { error: activationError.message });
      throw { code: 'DATABASE_ERROR', message: activationError.message, status: 500 };
    }

    log("Builder configuration activated", { builderId, twinId: boundTwinId });

    return {
      deployment_id: builderId,
      status: 'success',
      agent_url: boundTwinId ? `/blueprint/${boundTwinId}` : `/app/agents/${builderId}/manage`,
      agent: activatedAgent,
      runtime_provisioned: false,
    };
  }
}));