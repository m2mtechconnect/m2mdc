/**
 * Data Centre System Blueprint - Single Source of Truth
 * Complete schema for DC twin configuration, agents, KPIs, workflows, roles, scenarios
 */

import type { DomainType, AlertSeverity, Jurisdiction } from './dataCenterTwin';

// ============================================================================
// DOMAIN SECTION
// ============================================================================

export interface DomainSection {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  agentIds: string[];
  dataSourceIds: string[];
  kpiIds: string[];
  workflowIds: string[];
}

// ============================================================================
// AGENT BLUEPRINT
// ============================================================================

export type AgentType = 'monitoring' | 'control' | 'analytics' | 'incident';

export interface AgentBlueprint {
  id: string;
  name: string;
  domain: DomainType;
  description: string;
  type: AgentType;
  inputs: string[];
  outputs: string[];
  toolsUsed: string[];
  status: 'active' | 'inactive' | 'learning';
  workflowIds: string[];
}

// ============================================================================
// DATA SOURCE BLUEPRINT
// ============================================================================

export type DataSourceType = 'sensor' | 'api' | 'database' | 'stream' | 'file';
export type DataSourceProtocol = 'SNMP' | 'Modbus' | 'BACnet' | 'REST' | 'gRPC' | 'MQTT' | 'Prometheus' | 'OPC-UA';

export interface DataSourceBlueprint {
  id: string;
  name: string;
  sourceType: DataSourceType;
  protocol: DataSourceProtocol;
  domain: DomainType;
  updateFrequency: string;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  endpoint?: string;
}

// ============================================================================
// INTEGRATION BLUEPRINT
// ============================================================================

export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending';
export type AuthMethod = 'api_key' | 'oauth2' | 'basic' | 'certificate' | 'none';

export interface IntegrationBlueprint {
  id: string;
  name: string;
  type: string;
  status: IntegrationStatus;
  authMethod: AuthMethod;
  domainsUsedBy: DomainType[];
  description: string;
  lastSync?: string;
}

// ============================================================================
// KPI BLUEPRINT
// ============================================================================

export interface KpiBlueprint {
  id: string;
  name: string;
  domain: DomainType;
  unit: string;
  description: string;
  formula: string;
  inputs: string[];
  targetRange: {
    min?: number;
    max?: number;
    ideal: number;
  };
  direction: 'higher' | 'lower';
  ownerRole: string;
  warningThreshold: number;
  criticalThreshold: number;
}

// ============================================================================
// WORKFLOW BLUEPRINT
// ============================================================================

export interface WorkflowBlueprint {
  id: string;
  name: string;
  triggerCondition: string;
  domain: DomainType;
  agentId: string;
  actions: string[];
  rootCauseFields: string[];
  recommendedMitigation: string[];
  autoRun: boolean;
  severity: AlertSeverity;
  enabled: boolean;
}

// ============================================================================
// HUMAN ROLE BLUEPRINT
// ============================================================================

export interface HumanRoleBlueprint {
  id: string;
  name: string;
  description: string;
  responsibilities: string[];
  primaryDashboards: string[];
  workflowsOwned: string[];
  kpisOwned: string[];
  domains: DomainType[];
}

// ============================================================================
// SIMULATION SCENARIO BLUEPRINT
// ============================================================================

export interface KpiImpact {
  kpiId: string;
  kpiName: string;
  direction: 'increase' | 'decrease';
  magnitude: number;
}

export interface SimulationScenarioBlueprint {
  id: string;
  name: string;
  description: string;
  domainImpact: DomainType[];
  severity: AlertSeverity;
  durationMinutes: number;
  kpiImpacts: KpiImpact[];
  defaultMitigationWorkflowId: string;
  triggers: string[];
  category: string;
}

// ============================================================================
// MAIN BLUEPRINT TYPE
// ============================================================================

export interface DataCentreBlueprint {
  id: string;
  twinId: string;
  name: string;
  location: string;
  capacityKw: number;
  racks: number;
  tier: string;
  jurisdiction: Jurisdiction;

  domains: {
    thermal: DomainSection;
    power: DomainSection;
    cooling: DomainSection;
    network: DomainSection;
    facility: DomainSection;
    workload: DomainSection;
    sovereignty: DomainSection;
    financial: DomainSection;
  };

  agents: AgentBlueprint[];
  dataSources: DataSourceBlueprint[];
  integrations: IntegrationBlueprint[];
  kpis: KpiBlueprint[];
  workflows: WorkflowBlueprint[];
  humanRoles: HumanRoleBlueprint[];
  simulationScenarios: SimulationScenarioBlueprint[];

  createdAt: string;
  updatedAt: string;
  version: number;
}

// ============================================================================
// BLUEPRINT SUMMARY (for quick stats)
// ============================================================================

export interface BlueprintSummary {
  totalDomains: number;
  enabledDomains: number;
  totalAgents: number;
  totalDataSources: number;
  totalIntegrations: number;
  connectedIntegrations: number;
  totalKpis: number;
  totalWorkflows: number;
  enabledWorkflows: number;
  totalRoles: number;
  totalScenarios: number;
}

export function calculateBlueprintSummary(blueprint: DataCentreBlueprint): BlueprintSummary {
  const domains = Object.values(blueprint.domains);
  return {
    totalDomains: domains.length,
    enabledDomains: domains.filter(d => d.enabled).length,
    totalAgents: blueprint.agents.length,
    totalDataSources: blueprint.dataSources.length,
    totalIntegrations: blueprint.integrations.length,
    connectedIntegrations: blueprint.integrations.filter(i => i.status === 'connected').length,
    totalKpis: blueprint.kpis.length,
    totalWorkflows: blueprint.workflows.length,
    enabledWorkflows: blueprint.workflows.filter(w => w.enabled).length,
    totalRoles: blueprint.humanRoles.length,
    totalScenarios: blueprint.simulationScenarios.length,
  };
}
