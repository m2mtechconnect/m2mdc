/**
 * Type-safe UX String Helpers
 * 
 * These helpers must be used throughout the Studio to access UX content.
 * Never hardcode strings in components.
 */

import {
  GLOBAL,
  OVERVIEW,
  BLUEPRINT,
  DOMAINS,
  AGENTS,
  KPIS,
  WORKFLOWS,
  SCENARIOS,
  SIMULATION,
  SCANNER,
  BUILDER,
  COPILOT,
  EMPTY_STATES,
  INDUSTRIES,
  type DomainKey,
  type AgentKey,
  type KPIKey,
  type WorkflowKey,
  type ScenarioKey,
  type IndustryKey,
} from './UX_STRINGS';

/**
 * Generate a canonical twin name for a company
 */
export function generateTwinName(companyName: string): string {
  if (!companyName || companyName.trim() === '') {
    return GLOBAL.TWIN_SUFFIX;
  }
  return `${companyName.trim()} ${GLOBAL.TWIN_SUFFIX}`;
}

/**
 * Get description for an industry
 */
export function getTwinDescription(industry: IndustryKey | string): string {
  const key = industry as IndustryKey;
  if (INDUSTRIES[key]) {
    return INDUSTRIES[key].TWIN_INTRO;
  }
  return INDUSTRIES.other.TWIN_INTRO;
}

/**
 * Get industry display name
 */
export function getIndustryName(industry: IndustryKey | string): string {
  const key = industry as IndustryKey;
  if (INDUSTRIES[key]) {
    return INDUSTRIES[key].NAME;
  }
  return INDUSTRIES.other.NAME;
}

/**
 * Get domain description
 */
export function getDomainDescription(domain: DomainKey | string): string {
  const key = domain as DomainKey;
  if (DOMAINS[key]) {
    return DOMAINS[key].DESCRIPTION;
  }
  return 'Monitors and optimizes domain-specific operations.';
}

/**
 * Get domain display name
 */
export function getDomainName(domain: DomainKey | string): string {
  const key = domain as DomainKey;
  if (DOMAINS[key]) {
    return DOMAINS[key].NAME;
  }
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}

/**
 * Get agent summary
 */
export function getAgentSummary(agentId: AgentKey | string): string {
  const key = agentId as AgentKey;
  if (AGENTS.ITEMS[key]) {
    return AGENTS.ITEMS[key].SUMMARY;
  }
  // Try to match partial IDs
  const matchingKey = Object.keys(AGENTS.ITEMS).find(k => 
    agentId.includes(k) || k.includes(agentId)
  ) as AgentKey | undefined;
  
  if (matchingKey) {
    return AGENTS.ITEMS[matchingKey].SUMMARY;
  }
  
  return 'Automated agent for domain-specific monitoring and optimization.';
}

/**
 * Get agent display name
 */
export function getAgentName(agentId: AgentKey | string): string {
  const key = agentId as AgentKey;
  if (AGENTS.ITEMS[key]) {
    return AGENTS.ITEMS[key].NAME;
  }
  // Try to match partial IDs
  const matchingKey = Object.keys(AGENTS.ITEMS).find(k => 
    agentId.includes(k) || k.includes(agentId)
  ) as AgentKey | undefined;
  
  if (matchingKey) {
    return AGENTS.ITEMS[matchingKey].NAME;
  }
  
  return agentId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Get KPI description
 */
export function getKPIDescription(kpiId: KPIKey | string): string {
  const key = kpiId as KPIKey;
  if (KPIS.ITEMS[key]) {
    return KPIS.ITEMS[key].DESCRIPTION;
  }
  // Try to match partial IDs
  const matchingKey = Object.keys(KPIS.ITEMS).find(k => 
    kpiId.includes(k) || k.includes(kpiId)
  ) as KPIKey | undefined;
  
  if (matchingKey) {
    return KPIS.ITEMS[matchingKey].DESCRIPTION;
  }
  
  return 'Measures operational performance for this metric.';
}

/**
 * Get KPI display name
 */
export function getKPIName(kpiId: KPIKey | string): string {
  const key = kpiId as KPIKey;
  if (KPIS.ITEMS[key]) {
    return KPIS.ITEMS[key].NAME;
  }
  // Try to match partial IDs
  const matchingKey = Object.keys(KPIS.ITEMS).find(k => 
    kpiId.includes(k) || k.includes(kpiId)
  ) as KPIKey | undefined;
  
  if (matchingKey) {
    return KPIS.ITEMS[matchingKey].NAME;
  }
  
  return kpiId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Get workflow description
 */
export function getWorkflowDescription(workflowId: WorkflowKey | string): string {
  const key = workflowId as WorkflowKey;
  if (WORKFLOWS.ITEMS[key]) {
    return WORKFLOWS.ITEMS[key].DESCRIPTION;
  }
  // Try to match partial IDs
  const matchingKey = Object.keys(WORKFLOWS.ITEMS).find(k => 
    workflowId.includes(k) || k.includes(workflowId)
  ) as WorkflowKey | undefined;
  
  if (matchingKey) {
    return WORKFLOWS.ITEMS[matchingKey].DESCRIPTION;
  }
  
  return 'Automated workflow for event-driven operational response.';
}

/**
 * Get workflow details
 */
export function getWorkflowDetails(workflowId: WorkflowKey | string) {
  const key = workflowId as WorkflowKey;
  if (WORKFLOWS.ITEMS[key]) {
    return WORKFLOWS.ITEMS[key];
  }
  return null;
}

/**
 * Get scenario description
 */
export function getScenarioDescription(scenarioId: ScenarioKey | string): string {
  const key = scenarioId as ScenarioKey;
  if (SCENARIOS.ITEMS[key]) {
    return SCENARIOS.ITEMS[key].DESCRIPTION;
  }
  // Try to match partial IDs
  const matchingKey = Object.keys(SCENARIOS.ITEMS).find(k => 
    scenarioId.includes(k) || k.includes(scenarioId)
  ) as ScenarioKey | undefined;
  
  if (matchingKey) {
    return SCENARIOS.ITEMS[matchingKey].DESCRIPTION;
  }
  
  return 'Stress-test scenario for operational resilience modeling.';
}

/**
 * Get scenario details
 */
export function getScenarioDetails(scenarioId: ScenarioKey | string) {
  const key = scenarioId as ScenarioKey;
  if (SCENARIOS.ITEMS[key]) {
    return SCENARIOS.ITEMS[key];
  }
  return null;
}

/**
 * Generate scanner recommendation intro
 */
export function getScannerRecommendationIntro(companyName: string): string {
  return SCANNER.RECOMMENDATION_INTRO(companyName);
}

/**
 * Get builder step info
 */
export function getBuilderStepInfo(step: 1 | 2 | 3 | 4 | 5) {
  const stepKey = `STEP_${step}` as keyof typeof BUILDER.STEPS;
  return BUILDER.STEPS[stepKey];
}

/**
 * Get copilot persona
 */
export function getCopilotPersona(mode: 'designer' | 'analyst') {
  return mode === 'designer' ? COPILOT.PERSONAS.DESIGNER : COPILOT.PERSONAS.ANALYST;
}

/**
 * Get empty state message
 */
export function getEmptyState(type: keyof typeof EMPTY_STATES): string {
  return EMPTY_STATES[type];
}
