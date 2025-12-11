/**
 * Co-Pilot Context Types
 * 
 * Defines the context-aware payload for Co-Pilot in Blueprint Designer and Simulation modes.
 * Single source of truth for what context Co-Pilot receives.
 */

import type { 
  DCAgentConfig, 
  DCKPIConfig, 
  DCWorkflowConfig, 
  DCScenarioConfig,
  DCTwinOverview,
  DCFinancialModel,
} from './dcTwinBuilder';

// ============================================================================
// MODE DEFINITIONS
// ============================================================================

export type CoPilotContextMode = 'blueprint-designer' | 'simulation';

// ============================================================================
// DOMAIN SUMMARY (shared between modes)
// ============================================================================

export interface TwinDomainSummary {
  domain: string;
  label: string;
  agentCount: number;
  kpiCount: number;
  healthStatus: 'healthy' | 'warning' | 'critical' | 'unknown';
  healthScore: number;
}

export interface TwinAgent {
  id: string;
  name: string;
  domain: string;
  enabled: boolean;
  description: string;
}

export interface TwinKPI {
  id: string;
  name: string;
  domain: string;
  enabled: boolean;
  unit: string;
  currentValue?: number;
  targetValue?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
}

export interface TwinWorkflow {
  id: string;
  name: string;
  triggerType: string;
  enabled: boolean;
  agentIds: string[];
}

export interface TwinScenario {
  id: string;
  name: string;
  severity: string;
  category: string;
  enabled: boolean;
  durationMinutes: number;
}

// ============================================================================
// BLUEPRINT DESIGNER CONTEXT (Design-time)
// ============================================================================

export interface BlueprintValidationIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
  suggestion?: string;
}

export interface BlueprintValidationReport {
  isValid: boolean;
  readinessScore: number;
  issues: BlueprintValidationIssue[];
  missingAgents: string[];
  missingKPIs: string[];
  warnings: string[];
}

export interface ChangeLogEntry {
  id: string;
  timestamp: string;
  entityType: 'agent' | 'kpi' | 'workflow' | 'scenario' | 'overview' | 'deployment';
  entityId: string;
  action: 'created' | 'updated' | 'deleted' | 'enabled' | 'disabled';
  field?: string;
  oldValue?: any;
  newValue?: any;
  userId?: string;
}

// ============================================================================
// SIMULATION CONTEXT (Run-time)
// ============================================================================

export interface KPITimeSeriesPoint {
  timestamp: string;
  value: number;
}

export interface KPIOverlaySeries {
  kpiId: string;
  kpiName: string;
  unit: string;
  data: KPITimeSeriesPoint[];
  trend: 'up' | 'down' | 'stable';
  anomalyDetected: boolean;
}

export interface SimulationRunSummary {
  runId: string;
  scenarioId: string;
  scenarioName: string;
  startedAt: string;
  duration: number;
  speed: number;
  status: 'running' | 'paused' | 'completed' | 'failed';
}

export interface SimulationComparison {
  runAId: string;
  runAName: string;
  runBId: string;
  runBName: string;
  kpiDeltas: Array<{
    kpiId: string;
    kpiName: string;
    runAValue: number;
    runBValue: number;
    delta: number;
    percentChange: number;
  }>;
}

export interface LiveRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  type: 'warning' | 'suggestion' | 'insight';
  title: string;
  description: string;
  suggestedAction?: string;
  affectedKPIs: string[];
  affectedAgents: string[];
  timestamp: string;
}

export interface BlueprintChangeSuggestion {
  id: string;
  type: 'add_agent' | 'modify_kpi' | 'add_workflow' | 'adjust_threshold' | 'enable_scenario';
  title: string;
  description: string;
  reasoning: string;
  impact: string;
  entityId?: string;
  proposedChanges?: Record<string, any>;
}

// ============================================================================
// MAIN CONTEXT PAYLOAD
// ============================================================================

export interface CoPilotContextPayload {
  twinId: string;
  mode: CoPilotContextMode;

  // Shared structural context (always present)
  overview: DCTwinOverview;
  domains: TwinDomainSummary[];
  agents: TwinAgent[];
  kpis: TwinKPI[];
  workflows: TwinWorkflow[];
  scenarios: TwinScenario[];
  financial: DCFinancialModel;

  // Design-time only (blueprint-designer mode)
  validationReport?: BlueprintValidationReport;
  changeLog?: ChangeLogEntry[];
  readinessScore?: number;

  // Simulation-only (simulation mode)
  activeScenarioId?: string;
  simulationRun?: SimulationRunSummary;
  kpiTimeSeries?: KPIOverlaySeries[];
  comparisonRuns?: SimulationComparison[];
  liveRecommendations?: LiveRecommendation[];
  
  // Snapshot metadata (simulation mode)
  snapshotVersion?: string;
  snapshotCapturedAt?: string;
}

// ============================================================================
// CO-PILOT RESPONSE TYPES
// ============================================================================

export interface CoPilotQuickAction {
  id: string;
  label: string;
  icon?: string;
  prompt: string;
}

export interface CoPilotBlueprintResponse {
  explanation: string;
  proposedChanges?: BlueprintChangeSuggestion[];
  quickActions?: CoPilotQuickAction[];
}

export interface CoPilotSimulationResponse {
  explanation: string;
  blueprintSuggestions?: BlueprintChangeSuggestion[];
  nextScenarios?: string[];
  quickActions?: CoPilotQuickAction[];
}
