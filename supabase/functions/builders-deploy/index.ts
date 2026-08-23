/**
 * /v1/builders-deploy
 *
 * Canonical activation boundary for a saved AURA system. The browser cannot
 * grant deployment authority. The transaction RPC independently verifies the
 * authenticated caller, unique approved profile, active global deployment role
 * grant, ownership and durable deployment record before activation commits.
 */
import { createHandler, z } from '../_shared/handler.ts';

const schema = z.object({
  builderId: z.string().uuid(),
});

type Input = z.infer<typeof schema>;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

createHandler<Input>({
  authLevel: 'user',
  schema,
  rateLimit: { maxRequests: 10, windowMs: 60_000 },
  async handler({ input, context, correlationId }) {
    const { builderId } = input;

    const { data: builder, error: fetchError } = await context.supabase
      .from('agents')
      .select('id, name, status, owner_id, config')
      .eq('id', builderId)
      .eq('owner_id', context.userId!)
      .maybeSingle();

    if (fetchError) {
      throw { code: 'DB_ERROR', message: 'Failed to load saved system', status: 500 };
    }
    if (!builder) {
      throw { code: 'NOT_FOUND', message: 'System not found or not accessible', status: 404 };
    }
    if (builder.status === 'active') {
      throw { code: 'ALREADY_ACTIVE', message: 'System is already active', status: 409 };
    }

    const config = asRecord(builder.config);
    const overview = asRecord(config.overview);
    const intelligence = asRecord(config.intelligence);
    const modelConfig = asRecord(config.model_config);
    const workflow = asRecord(config.workflow);
    const deployment = asRecord(config.deployment);

    const hasGoal = hasText(config.goal) || hasText(overview.twinSummary) || hasText(overview.description);
    const hasIndustry = hasText(config.industry) || hasText(overview.industry) ||
      (Array.isArray(overview.industries) && overview.industries.some(hasText));
    const hasDepartment = hasText(config.department) || Object.keys(overview).length > 0;
    const hasType = hasText(config.type) || Object.keys(overview).length > 0;
    const hasModel = hasText(modelConfig.model) || hasText(intelligence.modelId);
    const workflowActions = Array.isArray(workflow.actions) ? workflow.actions : [];
    const dcWorkflows = Array.isArray(config.workflows) ? config.workflows : [];
    const hasWorkflow = workflowActions.length > 0 || dcWorkflows.length > 0;

    const missing = [
      !hasGoal && 'objective',
      !hasIndustry && 'industry',
      !hasDepartment && 'department',
      !hasType && 'build type',
      !hasModel && 'intelligence configuration',
      !hasWorkflow && 'workflow',
    ].filter((value): value is string => Boolean(value));

    if (missing.length > 0) {
      throw {
        code: 'VALIDATION_ERROR',
        message: `Saved configuration is incomplete: ${missing.join(', ')}`,
        status: 422,
      };
    }

    const model = String(modelConfig.model ?? intelligence.modelId ?? '');
    const grounding = Boolean(modelConfig.rag ?? intelligence.groundingEnabled ?? false);
    const region = String(
      deployment.targetDeploymentRegion ??
      config.targetDeploymentRegion ??
      'northamerica-northeast1',
    );

    // Database transaction is the authorization authority. It fails closed for
    // missing/duplicate/unapproved profiles, expired or scoped role grants and
    // non-owned systems. No service-role client is constructed here.
    const { data: deploymentId, error: activationError } = await context.supabase.rpc(
      'activate_builder_deployment',
      {
        p_builder_id: builderId,
        p_model: model,
        p_grounding: grounding,
        p_region: region,
      },
    );

    if (activationError) {
      console.warn('[builders-deploy] activation rejected', {
        correlationId,
        code: activationError.code,
      });
      if (activationError.code === '42501') {
        throw {
          code: 'FORBIDDEN',
          message: 'Deployment execution is not authorized for this caller or system',
          status: 403,
        };
      }
      throw {
        code: 'DEPLOYMENT_FAILED',
        message: 'Server-authorized activation could not be recorded',
        status: 500,
      };
    }

    const { data: deployed, error: verifyError } = await context.supabase
      .from('agents')
      .select('id, name, status, deployed_at')
      .eq('id', builderId)
      .eq('owner_id', context.userId!)
      .single();

    if (verifyError || !deployed || deployed.status !== 'active') {
      throw {
        code: 'DEPLOYMENT_EVIDENCE_MISSING',
        message: 'Activation committed but the caller could not verify the persisted result',
        status: 500,
      };
    }

    return {
      builder: deployed,
      deployment_id: deploymentId,
      runtime_health: null,
      message: 'System activation recorded. Runtime health is not yet verified.',
    };
  },
});
