/**
 * Analytics tracking for unified intake flows
 * Tracks user journey from intake method to builder to deployment
 */
import { trackEvent } from '@/lib/telemetry';
import { AgentBlueprint } from '@/types/agentBlueprint';

/**
 * Track when user starts an intake flow
 */
export function trackIntakeStart(source: AgentBlueprint['source'], metadata?: Record<string, any>) {
  trackEvent('agent_intake.started', {
    source,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
}

/**
 * Track when user completes an intake flow and blueprint is created
 */
export function trackIntakeComplete(blueprint: AgentBlueprint) {
  trackEvent('agent_intake.completed', {
    source: blueprint.source,
    has_name: !!blueprint.name,
    has_description: !!blueprint.description,
    has_industry: !!blueprint.industry,
    has_department: !!blueprint.department,
    has_goals: (blueprint.goals?.length || 0) > 0,
    has_model: !!blueprint.model?.modelName,
    has_system_prompt: !!blueprint.behavior?.systemPrompt,
    has_integrations: (blueprint.tools?.recommendedIntegrations?.length || 0) > 0,
    has_workflow: (blueprint.workflow?.actions?.length || 0) > 0,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track when builder is opened with a blueprint
 */
export function trackBuilderOpened(blueprint: AgentBlueprint, startStep: number) {
  trackEvent('agent_intake.builder_opened', {
    source: blueprint.source,
    start_step: startStep,
    blueprint_completeness: calculateCompletenessScore(blueprint),
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track when user abandons an intake flow
 */
export function trackIntakeAbandoned(source: AgentBlueprint['source'], step?: string) {
  trackEvent('agent_intake.abandoned', {
    source,
    step,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track conversion from intake to deployed agent
 */
export function trackIntakeToDeployment(blueprint: AgentBlueprint, agentId: string) {
  trackEvent('agent_intake.deployment_success', {
    source: blueprint.source,
    agent_id: agentId,
    time_to_deploy: calculateTimeToDeployment(blueprint),
    timestamp: new Date().toISOString(),
  });
}

/**
 * Calculate blueprint completeness score (0-100)
 */
function calculateCompletenessScore(blueprint: AgentBlueprint): number {
  let score = 0;
  const fields = [
    blueprint.name,
    blueprint.description,
    blueprint.industry,
    blueprint.department,
    blueprint.type,
    blueprint.goals?.length > 0,
    blueprint.model?.modelName,
    blueprint.behavior?.systemPrompt,
    blueprint.tools?.recommendedIntegrations?.length > 0,
    blueprint.workflow?.actions?.length > 0,
  ];
  
  fields.forEach(field => {
    if (field) score += 10;
  });
  
  return score;
}

/**
 * Calculate time from blueprint creation to deployment
 */
function calculateTimeToDeployment(blueprint: AgentBlueprint): number | undefined {
  if (!blueprint.createdAt) return undefined;
  
  const created = new Date(blueprint.createdAt);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / 1000); // seconds
}

/**
 * Track intake flow step progression
 */
export function trackIntakeStep(source: AgentBlueprint['source'], step: string, metadata?: Record<string, any>) {
  trackEvent('agent_intake.step_progress', {
    source,
    step,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
}
