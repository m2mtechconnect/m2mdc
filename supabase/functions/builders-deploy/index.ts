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
import { evaluateBuilderActivationReadiness } from "../_shared/builderActivationReadiness.ts";

const InputSchema = z.object({
  builderId: z.string().uuid(),
});

serve(createHandler({
  name: "builders-deploy",
  authLevel: "user",
  inputSchema: InputSchema,
  handler: async (input, context) => {
    const { builderId } = input;
    const { supabase, log } = context;

    log("Activating builder configuration", { builderId });

    const { data: builder, error: fetchError } = await supabase
      .from('agents')
      .select('id, twin_id, connector_ids, config')
      .eq('id', builderId)
      .single();

    if (fetchError) {
      log("Builder fetch failed", { error: fetchError.message });
      throw { code: 'NOT_FOUND', message: 'Builder not found', status: 404 };
    }

    const config = (builder.config || {}) as Record<string, any>;
    const isDCTwin = !!config.overview;
    const effectiveGoal = config.goal || config.overview?.twinSummary || config.overview?.description;
    const effectiveIndustry = config.industry || config.overview?.industry || config.overview?.industries?.[0];
    const effectiveDepartment = config.department || (isDCTwin ? 'IT Operations' : null);
    const effectiveType = config.type || (isDCTwin ? '3d_twin' : 'agent');

    const hasStandardWorkflow = config.workflow?.actions?.length > 0;
    const hasDCWorkflows = Array.isArray(config.workflows) && config.workflows.length > 0;

    let boundTwinId: string | null = null;
    let facilityAvailable = effectiveType !== '3d_twin' && effectiveType !== 'process_twin';
    if (effectiveType === '3d_twin' || effectiveType === 'process_twin') {
      boundTwinId = typeof config.twin_id === 'string'
        ? config.twin_id
        : typeof builder.twin_id === 'string'
          ? builder.twin_id
          : null;
      if (boundTwinId) {
        const { data: facility, error: facilityError } = await supabase
          .from('data_centre_twins')
          .select('id, metadata')
          .eq('id', boundTwinId)
          .maybeSingle();

        if (!facilityError && facility) {
          const metadata = facility.metadata as Record<string, unknown> | null;
          facilityAvailable = metadata?.provisioned !== 'default_starter_twin';
        }
      }
    }

    const [versionResult, workflowResult, intelligenceResult, simulationResult] = await Promise.all([
      supabase.from('agent_versions').select('id', { count: 'exact', head: true }).eq('agent_id', builderId),
      supabase.from('workflows').select('id', { count: 'exact', head: true }).eq('system_id', builderId),
      supabase.from('intelligence_settings').select('id, model_id').eq('system_id', builderId).maybeSingle(),
      boundTwinId
        ? supabase
            .from('simulation_runs')
            .select('id', { count: 'exact', head: true })
            .eq('twin_id', boundTwinId)
            .eq('lifecycle_status', 'succeeded')
            .eq('verification_level', 'server-validated')
        : supabase
            .from('agent_runs')
            .select('id', { count: 'exact', head: true })
            .eq('agent_id', builderId)
            .in('status', ['success', 'completed']),
    ]);

    const evidenceErrors = [
      versionResult.error?.message,
      workflowResult.error?.message,
      intelligenceResult.error?.message,
      simulationResult.error?.message,
    ].filter(Boolean);

    const readinessConfig = {
      ...config,
      goal: effectiveGoal,
      industry: effectiveIndustry,
      department: effectiveDepartment,
      type: effectiveType,
      twin_id: boundTwinId,
      connector_ids: builder.connector_ids,
    };
    const readiness = evaluateBuilderActivationReadiness(readinessConfig, {
      verifiedSimulationCount: simulationResult.count ?? 0,
      versionCount: versionResult.count ?? 0,
      workflowCount: workflowResult.count ?? 0,
      intelligenceConfigured: Boolean(intelligenceResult.data?.model_id),
      facilityAvailable,
      evidenceError: evidenceErrors.length > 0 ? 'Persisted readiness evidence could not be verified.' : null,
    });

    log("Activation validation", {
      isDCTwin,
      effectiveType,
      twinId: boundTwinId,
      hasStandardWorkflow,
      hasDCWorkflows,
      standardActions: config.workflow?.actions?.length || 0,
      dcWorkflows: config.workflows?.length || 0,
      readinessScore: readiness.score,
      blockerIds: readiness.blockers.map((item) => item.id),
    });

    if (!readiness.isReady) {
      const messages = readiness.blockers.map((item) => item.message);
      log("Activation validation failed", { errors: messages });
      throw { code: 'VALIDATION_ERROR', message: messages.join(' '), status: 400 };
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
      model_config: config.model_config || (
        config.intelligence?.modelId
          // Legacy drafts keep their stored identifiers readable until edited.
          ? { model: config.intelligence.modelId, provider: config.intelligence?.modelProvider }
          // New drafts persist only the provider-neutral response profile.
          : { response_profile: 'balanced' }
      ),
    };

    const { data: activatedAgent, error: activationError } = await supabase
      .from('agents')
      .update({
        status: 'active',
        config: updatedConfig,
        deployed_at: nowIso,
      })
      .eq('id', builderId)
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
