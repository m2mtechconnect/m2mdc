/**
 * Data Centre Simulation Engine - Type Definitions
 * Core types for simulation state, events, and KPIs
 */

import type { DomainType, AlertSeverity } from '@/types/dataCenterTwin';

// ============================================================================
// SIMULATION STATE
// ============================================================================

export type SimulationStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

export interface SimulationState {
  status: SimulationStatus;
  currentTime: number; // seconds elapsed since simulation start
  timeScale: 1 | 2 | 5 | 10;
  activeScenarioId: string | null;
  events: SimulationEvent[];
  kpiSnapshots: KPISnapshot[];
  baselineKpis: Record<string, number>;
  currentKpis: Record<string, number>;
  rackMetrics?: RackMetrics[];
  errorMessage?: string;
}

// ============================================================================
// SIMULATION TICK (for streaming UI updates)
// ============================================================================

export interface SimulationTick {
  simTimeSec: number;
  progressPct: number;
  kpiDeltas: SimulationKpiDelta[];
  rackMetrics?: RackMetrics[];
  events?: SimulationEvent[];
}

export interface SimulationKpiDelta {
  id: string;
  label: string;
  unit?: string;
  before: number;
  after: number;
  trend: 'up' | 'down' | 'stable';
  isGood: boolean;
}

export type AlertLevel = 'normal' | 'warning' | 'critical';

export interface RackMetrics {
  rackId: string;
  tempC: number;
  powerKw: number;
  gpuUtilPct: number;
  alertLevel: 'normal' | 'warning' | 'critical';
}

// ============================================================================
// SIMULATION RESULT SUMMARY
// ============================================================================

export interface SimulationResultSummary {
  durationSec: number;
  scenarioId: string;
  scenarioName: string;
  kpiDeltas: SimulationKpiDelta[];
  events: SimulationEvent[];
  rcaMarkdown: string;
  recommendationsMarkdown: string;
  actualVsExpected: {
    metric: string;
    expected: string;
    actual: string;
    withinRange: boolean;
  }[];
}

// ============================================================================
// SIMULATION EVENTS
// ============================================================================

export type SimulationEventType = 'ALERT' | 'INFO' | 'RECOVERY' | 'TRIGGER' | 'MITIGATION' | 'START' | 'END';

export interface SimulationEvent {
  id: string;
  timestamp: number; // simulation time in seconds
  type: SimulationEventType;
  domain: DomainType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedRacks?: string[];
  affectedZones?: string[];
  affectedClusters?: string[];
  kpiSnapshot?: Record<string, number>;
}

// ============================================================================
// KPI SNAPSHOT
// ============================================================================

export interface KPISnapshot {
  timestamp: number; // simulation time in seconds
  pue: number;
  gpuUtilization: number;
  thermalStabilityScore: number;
  powerReliabilityScore: number;
  sovereignComplianceScore: number;
  emissionsVsTarget: number;
  coolingEfficiencyIndex: number;
  networkIntegrityScore: number;
  environmentalSafetyScore: number;
  avgUpsRuntime: number;
  [key: string]: number;
}

// ============================================================================
// SCENARIO TIMELINE
// ============================================================================

export interface ScenarioTimelineStep {
  at: number; // seconds from start
  type: SimulationEventType;
  kpiDeltas: Partial<Record<string, number>>;
  eventTitle: string;
  eventDescription: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  domain: DomainType;
  affectedRacks?: string[];
  affectedZones?: string[];
  affectedClusters?: string[];
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  durationSeconds: number;
  domainsInvolved: DomainType[];
  severity: AlertSeverity;
  category: DomainType;
  timeline: ScenarioTimelineStep[];
  tags?: string[];
  isCustom?: boolean;
  expectedImpacts?: {
    metric: string;
    expectedRange: string;
  }[];
}

// ============================================================================
// CUSTOM SCENARIO BUILDER
// ============================================================================

export interface CustomScenarioConfig {
  name: string;
  description: string;
  durationSeconds: number;
  affectedDomains: DomainType[];
  initialKpiOffsets: Partial<Record<string, number>>;
  timelineSteps: {
    atPercent: number; // 0-100
    kpiDeltas: Partial<Record<string, number>>;
    eventTitle: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }[];
}

// ============================================================================
// SIMULATION ENGINE EVENTS (for subscribers)
// ============================================================================

export type SimulationEngineEventType = 
  | 'state-change'
  | 'event-emitted'
  | 'kpi-update'
  | 'scenario-start'
  | 'scenario-complete'
  | 'tick'
  | 'rack-update'
  | 'error';

export interface SimulationEngineEvent {
  type: SimulationEngineEventType;
  payload: any;
  timestamp: number;
}

export type SimulationListener = (event: SimulationEngineEvent) => void;
