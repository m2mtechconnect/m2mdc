/**
 * Universal Twin Blueprint Base Schema
 * Master template structure used across all industries
 */

export interface TwinBlueprintBaseSchema {
  // Metadata
  metadata: TwinMetadata;
  
  // Core Structure
  domains: TwinDomain[];
  agents: TwinAgent[];
  dataSources: TwinDataSource[];
  kpis: TwinKPI[];
  workflows: TwinWorkflow[];
  roles: TwinRole[];
  scenarios: TwinScenario[];
  
  // Simulation Models
  simulationModels: SimulationModel[];
  
  // Industry Extension Point
  industryExtensions?: Record<string, unknown>;
}

export interface TwinMetadata {
  id: string;
  name: string;
  description: string;
  industry: string;
  subIndustry?: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  
  // Location
  region: string;
  city?: string;
  country: string;
  timezone: string;
  
  // Capacity & Classification
  capacityTier: 'small' | 'medium' | 'large' | 'hyperscale';
  capacityValue?: number;
  capacityUnit?: string;
  tier?: string;
  
  // Compliance & Sovereignty
  sovereigntyLevel?: 'local' | 'regional' | 'national' | 'international';
  complianceFrameworks?: string[];
  
  // Sustainability
  sustainabilityTargets?: {
    renewablePercent?: number;
    carbonReductionPercent?: number;
    efficiencyTarget?: number;
  };
}

export interface TwinDomain {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  
  // Health status
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  healthScore: number; // 0-100
  
  // Related entities
  agentIds: string[];
  kpiIds: string[];
  workflowIds: string[];
}

export interface TwinAgent {
  id: string;
  slug: string;
  name: string;
  description: string;
  domain: string;
  type: 'monitoring' | 'control' | 'optimizer' | 'scheduler' | 'responder';
  
  // Status
  status: 'active' | 'inactive' | 'error';
  healthScore: number;
  lastHeartbeat?: Date;
  
  // Configuration
  inputs: TwinAgentIO[];
  outputs: TwinAgentIO[];
  tools: string[];
  kpiBindings: string[];
  safetyRules?: string[];
  
  // Runtime
  schedule?: string;
  maxStepsPerRun?: number;
  modelProfile?: string;
  
  // ML-specific
  mlConfig?: {
    modelType: string;
    trainingDataPreview?: string;
    lastRetrainedAt?: Date;
    reasoningPreview?: string;
  };
  
  // Metrics
  metrics?: {
    latencyMs?: number;
    refreshRateMs?: number;
    dataFreshnessMs?: number;
    successRate?: number;
    totalRuns?: number;
  };
}

export interface TwinAgentIO {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
}

export interface TwinDataSource {
  id: string;
  name: string;
  type: string;
  category: string;
  domain: string;
  
  // Connection
  protocol?: string;
  endpoint?: string;
  connected: boolean;
  
  // Data info
  refreshRate?: string;
  dataFormat?: string;
  
  // Metrics
  lastSyncAt?: Date;
  recordCount?: number;
}

export interface TwinKPI {
  id: string;
  name: string;
  description: string;
  domain: string;
  category: string;
  
  // Value
  value: number;
  unit: string;
  direction: 'higher_is_better' | 'lower_is_better';
  
  // Thresholds
  target: number;
  warningThreshold: number;
  criticalThreshold: number;
  
  // Trend
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  
  // Explanation
  why?: string;
  impacts?: string[];
  relatedWorkflows?: string[];
  
  // Forecasting
  forecast?: {
    day: number;
    value: number;
    confidence: number;
  }[];
  
  autoRecommendations?: string[];
}

export interface TwinWorkflow {
  id: string;
  name: string;
  description: string;
  domain: string;
  
  // Trigger
  triggerType: 'threshold' | 'schedule' | 'event' | 'manual';
  triggerCondition?: string;
  
  // Steps
  steps: TwinWorkflowStep[];
  
  // Impact
  impactedKpis: string[];
  expectedImpact?: {
    kpi: string;
    expectedChange: number;
    confidence: number;
  }[];
  
  // Version Control
  version: string;
  versions?: {
    version: string;
    timestamp: Date;
    author: string;
    changes: string[];
  }[];
  
  // Status
  enabled: boolean;
  lastExecutedAt?: Date;
  executionCount?: number;
}

export interface TwinWorkflowStep {
  id: string;
  order: number;
  action: string;
  target: string;
  condition?: string;
  duration?: string;
}

export interface TwinRole {
  id: string;
  name: string;
  description: string;
  
  // Responsibilities
  responsibilities: string[];
  domains: string[];
  workflows: string[];
  
  // Access
  accessLevel: 'read' | 'write' | 'admin';
  
  // Contact
  contactEmail?: string;
  escalationPath?: string[];
}

export interface TwinScenario {
  id: string;
  name: string;
  description: string;
  category: string;
  
  // Complexity
  complexity: 'low' | 'medium' | 'high' | 'catastrophic';
  complexityScore: number; // 1-10
  
  // Impact
  kpisAffected: string[];
  kpiDeltas: {
    kpi: string;
    delta: number;
  }[];
  
  // Timing
  estimatedDuration: number; // seconds
  
  // Timeline
  timeline?: {
    timestamp: number;
    event: string;
    severity: string;
  }[];
  
  // Chaining
  canChainWith?: string[];
  prerequisites?: string[];
}

export interface SimulationModel {
  id: string;
  name: string;
  type: 'thermal' | 'power' | 'workload' | 'carbon' | 'financial';
  
  // Parameters
  parameters: Record<string, number>;
  
  // Outputs
  outputs: string[];
  
  // Accuracy
  accuracy?: number;
  lastValidatedAt?: Date;
}

// Industry-specific extensions
export interface DataCentreBlueprintExtension {
  facilityType: 'colocation' | 'enterprise' | 'hyperscale' | 'edge';
  coolingType: 'air' | 'liquid' | 'hybrid' | 'immersion';
  powerTopology: 'n' | 'n+1' | '2n' | '2n+1';
  gpuFleet?: string;
  rackCount?: number;
  serverCount?: number;
  
  // DC-specific KPIs
  pueTarget?: number;
  wueTarget?: number;
  cueTarget?: number;
}

export interface HealthcareBlueprintExtension {
  facilityType: 'hospital' | 'clinic' | 'research' | 'pharmacy';
  complianceFrameworks: ('HIPAA' | 'PIPEDA' | 'GDPR')[];
  patientCapacity?: number;
  criticalSystems?: string[];
}

export interface RetailBlueprintExtension {
  storeCount: number;
  warehouseCount?: number;
  coldChainEnabled: boolean;
  edgeComputeNodes?: number;
  supplyChainRegions?: string[];
}

// Factory function to create industry-specific blueprints
export function createBlueprintFromIndustry(
  industry: string,
  baseConfig: Partial<TwinBlueprintBaseSchema>
): TwinBlueprintBaseSchema {
  const base: TwinBlueprintBaseSchema = {
    metadata: {
      id: crypto.randomUUID(),
      name: baseConfig.metadata?.name || 'Untitled Twin',
      description: baseConfig.metadata?.description || '',
      industry,
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      region: baseConfig.metadata?.region || 'unknown',
      country: baseConfig.metadata?.country || 'unknown',
      timezone: baseConfig.metadata?.timezone || 'UTC',
      capacityTier: baseConfig.metadata?.capacityTier || 'medium',
    },
    domains: baseConfig.domains || [],
    agents: baseConfig.agents || [],
    dataSources: baseConfig.dataSources || [],
    kpis: baseConfig.kpis || [],
    workflows: baseConfig.workflows || [],
    roles: baseConfig.roles || [],
    scenarios: baseConfig.scenarios || [],
    simulationModels: baseConfig.simulationModels || [],
    industryExtensions: baseConfig.industryExtensions,
  };
  
  return base;
}

// Validate blueprint completeness
export function validateBlueprint(blueprint: TwinBlueprintBaseSchema): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!blueprint.metadata.name) errors.push('Missing twin name');
  if (!blueprint.metadata.industry) errors.push('Missing industry');
  if (!blueprint.metadata.region) errors.push('Missing region');
  
  // Minimum entities
  if (blueprint.domains.length === 0) warnings.push('No domains defined');
  if (blueprint.agents.length === 0) warnings.push('No agents defined');
  if (blueprint.kpis.length === 0) warnings.push('No KPIs defined');
  if (blueprint.scenarios.length === 0) warnings.push('No scenarios defined');
  
  // Consistency checks
  blueprint.agents.forEach(agent => {
    if (!blueprint.domains.find(d => d.id === agent.domain)) {
      warnings.push(`Agent ${agent.name} references unknown domain ${agent.domain}`);
    }
  });
  
  blueprint.kpis.forEach(kpi => {
    if (!blueprint.domains.find(d => d.id === kpi.domain)) {
      warnings.push(`KPI ${kpi.name} references unknown domain ${kpi.domain}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
