/**
 * Data Centre Simulation Engine - Type Definitions
 * Core types for simulation state, events, and KPIs
 * ENTERPRISE-GRADE: Matches Nvidia Omniverse, AWS CloudWatch, Siemens Digital Twins
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

export type SimulationEventType = 'ALERT' | 'INFO' | 'RECOVERY' | 'TRIGGER' | 'MITIGATION' | 'START' | 'END' | 'ANOMALY' | 'THRESHOLD_BREACH';

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
  affectedKpis?: string[]; // KPIs related to this event
  causalChain?: string[]; // Chain of events/KPIs that caused this
}

// ============================================================================
// ENHANCED KPI SNAPSHOT (Enterprise-Grade)
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
// KPI THRESHOLD & SEVERITY BANDS (Enterprise Feature)
// ============================================================================

export interface KPIThresholdBand {
  min: number;
  max: number;
  severity: 'safe' | 'warning' | 'critical';
  color: string;
  label: string;
}

export interface KPIThresholdConfig {
  kpiId: string;
  bands: KPIThresholdBand[];
  target: number;
  warningThreshold: number;
  criticalThreshold: number;
  lowerIsBetter: boolean;
}

// ============================================================================
// ANOMALY DETECTION (Enterprise Feature)
// ============================================================================

export interface KPIAnomaly {
  id: string;
  kpiId: string;
  timestamp: number;
  type: 'spike' | 'dip' | 'trend_change' | 'outlier';
  value: number;
  expectedValue: number;
  deviation: number; // percentage deviation
  severity: 'low' | 'medium' | 'high';
  description: string;
  possibleCauses?: string[];
}

// ============================================================================
// PREDICTIVE FORECAST (Enterprise Feature)
// ============================================================================

export interface KPIForecast {
  kpiId: string;
  currentValue: number;
  predictions: {
    timestamp: number;
    value: number;
    confidence: number; // 0-100
    upperBound: number;
    lowerBound: number;
  }[];
  trend: 'improving' | 'degrading' | 'stable';
  trendConfidence: number;
}

// ============================================================================
// CAUSAL LINKS (Enterprise Feature)
// ============================================================================

export interface KPICausalLink {
  sourceKpi: string;
  targetKpi: string;
  correlationStrength: number; // 0-1
  lagSeconds: number; // time delay in effect
  direction: 'positive' | 'negative' | 'bidirectional';
  description: string;
}

export interface KPICorrelationMatrix {
  kpis: string[];
  correlations: number[][]; // Matrix of correlation values
  topDrivers: {
    kpi: string;
    drivenBy: { kpi: string; strength: number }[];
  }[];
}

// ============================================================================
// SCENARIO IMPACT SCORES (Enterprise Feature)
// ============================================================================

export interface ScenarioImpactScore {
  scenarioId: string;
  kpiId: string;
  impactScore: number; // -100 to +100
  impactCategory: 'severe_negative' | 'negative' | 'neutral' | 'positive' | 'severe_positive';
  explanation: string;
}

// ============================================================================
// WHAT-IF CONTROLS (Enterprise Feature)
// ============================================================================

export interface WhatIfParameter {
  id: string;
  name: string;
  description: string;
  currentValue: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  affectedKpis: string[];
  impactFunction: 'linear' | 'exponential' | 'logarithmic' | 'step';
}

export interface WhatIfScenario {
  id: string;
  name: string;
  parameters: Record<string, number>;
  predictedKpis: Record<string, number>;
  comparison: {
    kpiId: string;
    baseline: number;
    predicted: number;
    delta: number;
    isImprovement: boolean;
  }[];
}

// ============================================================================
// ENHANCED KPI CONFIGURATION (Enterprise Feature)
// ============================================================================

export interface EnhancedKPIConfig {
  id: string;
  name: string;
  description: string;
  unit: string;
  domain: DomainType;
  
  // Thresholds
  thresholds: KPIThresholdConfig;
  
  // Targets
  target: number;
  warningLevel: number;
  criticalLevel: number;
  lowerIsBetter: boolean;
  
  // Forecast config
  forecastEnabled: boolean;
  forecastHorizonMinutes: number;
  
  // Anomaly detection
  anomalyDetectionEnabled: boolean;
  anomalySensitivity: 'low' | 'medium' | 'high';
  
  // Causal links
  causalLinks: string[]; // IDs of linked KPIs
  
  // Display
  color: string;
  icon?: string;
  format?: (value: number) => string;
  
  // Why this matters
  businessImpact: string;
  whyItMatters: string;
}

// ============================================================================
// SIMULATION RUN METRICS (Enterprise Feature)
// ============================================================================

export interface SimulationRunMetrics {
  runId: string;
  scenarioId: string;
  scenarioName: string;
  startTime: Date;
  endTime?: Date;
  durationSeconds: number;
  
  // KPI tracking
  kpiSnapshots: KPISnapshot[];
  kpiDeltas: SimulationKpiDelta[];
  anomalies: KPIAnomaly[];
  forecasts: KPIForecast[];
  
  // Events
  events: SimulationEvent[];
  thresholdBreaches: SimulationEvent[];
  
  // Impact scores
  impactScores: ScenarioImpactScore[];
  overallImpactScore: number;
  
  // Comparison data
  comparisonBaseline?: SimulationRunMetrics;
}

// ============================================================================
// LIVE INSIGHT SCHEMA (Enterprise Feature)
// ============================================================================

export interface LiveInsight {
  id: string;
  type: 'recommendation' | 'warning' | 'prediction' | 'correlation' | 'anomaly';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  timestamp: number;
  
  // Context
  relatedKpis: string[];
  relatedEvents: string[];
  affectedDomains: DomainType[];
  
  // Confidence
  confidence: number; // 0-100
  
  // Actions
  suggestedActions: {
    id: string;
    label: string;
    description: string;
    impact: string;
  }[];
  
  // Time-based
  validFrom: number;
  validUntil?: number;
  predictedTime?: number;
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
  | 'error'
  | 'anomaly-detected'
  | 'threshold-breach'
  | 'forecast-update'
  | 'insight-generated';

export interface SimulationEngineEvent {
  type: SimulationEngineEventType;
  payload: any;
  timestamp: number;
}

export type SimulationListener = (event: SimulationEngineEvent) => void;
