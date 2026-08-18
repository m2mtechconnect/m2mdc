/**
 * Enhanced Sovereign Data Center Simulation Engine
 * Enterprise-grade simulation with expanded scenarios, KPI groups, and AI recommendations
 */

import type { 
  SovereignKpis, 
  SimulationType, 
  SovereignDCFacility,
} from '@/types/sovereignDataCenterTwin';

// ============================================================================
// EXPANDED SCENARIO DEFINITIONS
// ============================================================================

export type EnhancedSimulationType = 
  | SimulationType 
  | 'grid_instability' 
  | 'tenant_expansion' 
  | 'renewable_drop' 
  | 'optimization_run'
  | 'cooling_stress'
  | 'compliance_audit';

export interface EnhancedScenario {
  id: EnhancedSimulationType;
  name: string;
  description: string;
  category: 'capacity' | 'energy' | 'emissions' | 'compliance' | 'financial' | 'incident' | 'optimization';
  duration_seconds: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  kpi_impacts: Partial<Record<string, { delta: number; trend: 'up' | 'down' | 'stable' }>>;
  event_timeline: SimulationEventTemplate[];
}

export interface SimulationEventTemplate {
  tick_offset: number; // percentage of total duration (0-100)
  type: 'detect' | 'decision' | 'action' | 'resolved' | 'alert' | 'info' | 'warning';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

// ============================================================================
// EXPANDED KPI GROUPS
// ============================================================================

export interface KPIGroup {
  id: string;
  name: string;
  kpis: EnhancedKPI[];
}

export interface EnhancedKPI {
  key: string;
  label: string;
  unit: string;
  baseline: number;
  target: number;
  direction: 'higher' | 'lower';
  thresholds: { green: number; yellow: number; red: number };
  category: 'capacity' | 'energy' | 'emissions' | 'compliance' | 'financial' | 'composite';
}

export const SOVEREIGN_DC_KPI_GROUPS: KPIGroup[] = [
  {
    id: 'capacity',
    name: 'Capacity & Performance',
    kpis: [
      { key: 'gpuUtilization', label: 'GPU Utilization', unit: '%', baseline: 78, target: 85, direction: 'higher', thresholds: { green: 80, yellow: 60, red: 40 }, category: 'capacity' },
      { key: 'activeWorkloads', label: 'Active Workloads', unit: '', baseline: 142, target: 150, direction: 'higher', thresholds: { green: 140, yellow: 100, red: 50 }, category: 'capacity' },
      { key: 'queueDepth', label: 'Job Queue Depth', unit: 'jobs', baseline: 28, target: 20, direction: 'lower', thresholds: { green: 30, yellow: 50, red: 100 }, category: 'capacity' },
      { key: 'memoryUtilization', label: 'GPU Memory Util', unit: '%', baseline: 72, target: 80, direction: 'higher', thresholds: { green: 70, yellow: 50, red: 30 }, category: 'capacity' },
      { key: 'networkThroughput', label: 'Network Throughput', unit: 'Gbps', baseline: 340, target: 400, direction: 'higher', thresholds: { green: 300, yellow: 200, red: 100 }, category: 'capacity' },
    ]
  },
  {
    id: 'energy',
    name: 'Energy & Efficiency',
    kpis: [
      { key: 'effectiveAiPue', label: 'Effective AI PUE', unit: '', baseline: 1.28, target: 1.15, direction: 'lower', thresholds: { green: 1.25, yellow: 1.4, red: 1.6 }, category: 'energy' },
      { key: 'dcie', label: 'DCIE', unit: '%', baseline: 78, target: 85, direction: 'higher', thresholds: { green: 80, yellow: 70, red: 60 }, category: 'energy' },
      { key: 'coolingEfficiency', label: 'Cooling Efficiency', unit: '%', baseline: 92, target: 95, direction: 'higher', thresholds: { green: 90, yellow: 80, red: 70 }, category: 'energy' },
      { key: 'powerDraw', label: 'Total Power Draw', unit: 'MW', baseline: 12.4, target: 12.0, direction: 'lower', thresholds: { green: 12.5, yellow: 14, red: 16 }, category: 'energy' },
      { key: 'renewableMix', label: 'Renewable Mix', unit: '%', baseline: 85, target: 95, direction: 'higher', thresholds: { green: 80, yellow: 60, red: 40 }, category: 'energy' },
      { key: 'upsCapacity', label: 'UPS Capacity', unit: '%', baseline: 45, target: 50, direction: 'lower', thresholds: { green: 60, yellow: 75, red: 90 }, category: 'energy' },
      { key: 'upsRuntimeRemaining', label: 'UPS Runtime', unit: 'min', baseline: 45, target: 60, direction: 'higher', thresholds: { green: 30, yellow: 15, red: 5 }, category: 'energy' },
      { key: 'redundancyLevel', label: 'Redundancy Level', unit: 'N+', baseline: 1, target: 2, direction: 'higher', thresholds: { green: 2, yellow: 1, red: 0 }, category: 'energy' },
    ]
  },
  {
    id: 'emissions',
    name: 'Emissions',
    kpis: [
      { key: 'gco2PerGpuHour', label: 'Carbon Intensity', unit: 'g CO₂/GPU-hr', baseline: 32, target: 25, direction: 'lower', thresholds: { green: 50, yellow: 100, red: 200 }, category: 'emissions' },
      { key: 'dailyEmissions', label: 'Daily Emissions', unit: 'tonnes CO₂', baseline: 8.2, target: 6.0, direction: 'lower', thresholds: { green: 10, yellow: 20, red: 40 }, category: 'emissions' },
      { key: 'carbonCredits', label: 'Carbon Credits Used', unit: 'credits', baseline: 120, target: 100, direction: 'lower', thresholds: { green: 150, yellow: 300, red: 500 }, category: 'emissions' },
      { key: 'scope2Emissions', label: 'Scope 2 Emissions', unit: 'tonnes', baseline: 6.5, target: 5.0, direction: 'lower', thresholds: { green: 8, yellow: 15, red: 25 }, category: 'emissions' },
    ]
  },
  {
    id: 'compliance',
    name: 'Sovereignty & Compliance',
    kpis: [
      { key: 'sovereignComputeRatioPct', label: 'Sovereign Compute Ratio', unit: '%', baseline: 97.2, target: 98, direction: 'higher', thresholds: { green: 95, yellow: 85, red: 75 }, category: 'compliance' },
      { key: 'sovereignRiskScore', label: 'Sovereignty Risk Score', unit: 'pts', baseline: 12, target: 10, direction: 'lower', thresholds: { green: 15, yellow: 30, red: 50 }, category: 'compliance' },
      { key: 'dataFlowViolations', label: 'Data Flow Violations', unit: '', baseline: 0, target: 0, direction: 'lower', thresholds: { green: 0, yellow: 1, red: 3 }, category: 'compliance' },
      { key: 'auditReadiness', label: 'Audit Readiness', unit: '%', baseline: 94, target: 98, direction: 'higher', thresholds: { green: 90, yellow: 75, red: 50 }, category: 'compliance' },
      { key: 'policyCompliance', label: 'Policy Compliance', unit: '%', baseline: 98, target: 100, direction: 'higher', thresholds: { green: 95, yellow: 85, red: 70 }, category: 'compliance' },
    ]
  },
  {
    id: 'financial',
    name: 'Financial',
    kpis: [
      { key: 'economicEfficiencyScore', label: 'Economic Efficiency', unit: 'pts', baseline: 82, target: 90, direction: 'higher', thresholds: { green: 80, yellow: 60, red: 40 }, category: 'financial' },
      { key: 'costPerGpuHour', label: 'Cost per GPU-Hour', unit: '$/hr', baseline: 0.48, target: 0.45, direction: 'lower', thresholds: { green: 0.50, yellow: 0.65, red: 0.80 }, category: 'financial' },
      { key: 'carbonCostExposure', label: 'Carbon Cost Exposure', unit: '$/day', baseline: 2850, target: 2000, direction: 'lower', thresholds: { green: 3000, yellow: 5000, red: 8000 }, category: 'financial' },
      { key: 'revenuePerMW', label: 'Revenue per MW', unit: '$/MW', baseline: 12500, target: 15000, direction: 'higher', thresholds: { green: 12000, yellow: 8000, red: 5000 }, category: 'financial' },
    ]
  },
  {
    id: 'composite',
    name: 'Composite Scores',
    kpis: [
      { key: 'overallEfficiencyScore', label: 'Efficiency Score', unit: 'pts', baseline: 84, target: 90, direction: 'higher', thresholds: { green: 80, yellow: 60, red: 40 }, category: 'composite' },
      { key: 'sovereigntyScore', label: 'Sovereignty Score', unit: 'pts', baseline: 92, target: 95, direction: 'higher', thresholds: { green: 90, yellow: 75, red: 50 }, category: 'composite' },
      { key: 'resilienceScore', label: 'Resilience Score', unit: 'pts', baseline: 88, target: 92, direction: 'higher', thresholds: { green: 85, yellow: 70, red: 50 }, category: 'composite' },
      { key: 'sustainabilityScore', label: 'Sustainability Score', unit: 'pts', baseline: 86, target: 90, direction: 'higher', thresholds: { green: 80, yellow: 60, red: 40 }, category: 'composite' },
    ]
  }
];

// ============================================================================
// EXPANDED SCENARIOS
// ============================================================================

export const ENHANCED_SCENARIOS: EnhancedScenario[] = [
  {
    id: 'gpu_overload',
    name: 'GPU Overload',
    description: 'Simulate H100 cluster hitting 95% utilization during peak LLM training',
    category: 'capacity',
    duration_seconds: 45,
    severity: 'high',
    kpi_impacts: {
      gpuUtilization: { delta: 17, trend: 'up' },
      effectiveAiPue: { delta: 0.08, trend: 'up' },
      gco2PerGpuHour: { delta: 12, trend: 'up' },
      coolingEfficiency: { delta: -8, trend: 'down' },
      queueDepth: { delta: 35, trend: 'up' },
      powerDraw: { delta: 2.1, trend: 'up' },
    },
    event_timeline: [
      { tick_offset: 0, type: 'info', message: 'Simulation initialized - GPU Overload scenario', severity: 'low' },
      { tick_offset: 8, type: 'detect', message: 'GPU utilization spike detected in H100 cluster A', severity: 'medium' },
      { tick_offset: 15, type: 'alert', message: 'WARNING: Cluster A approaching thermal threshold', severity: 'high' },
      { tick_offset: 22, type: 'decision', message: 'Evaluating workload redistribution options', severity: 'medium' },
      { tick_offset: 30, type: 'action', message: 'Activating secondary cooling loops', severity: 'medium' },
      { tick_offset: 40, type: 'action', message: 'Initiating workload migration to Cluster B', severity: 'medium' },
      { tick_offset: 55, type: 'info', message: 'Queue depth stabilizing after redistribution', severity: 'low' },
      { tick_offset: 70, type: 'detect', message: 'PUE elevated due to increased cooling demand', severity: 'medium' },
      { tick_offset: 85, type: 'resolved', message: 'Thermal equilibrium restored - utilization normalized', severity: 'low' },
      { tick_offset: 100, type: 'resolved', message: 'Simulation completed - GPU Overload scenario', severity: 'low' },
    ]
  },
  {
    id: 'cooling_failure',
    name: 'Cooling Stress',
    description: 'Model liquid cooling degradation in HPC zone B',
    category: 'incident',
    duration_seconds: 50,
    severity: 'critical',
    kpi_impacts: {
      effectiveAiPue: { delta: 0.25, trend: 'up' },
      coolingEfficiency: { delta: -22, trend: 'down' },
      gpuUtilization: { delta: -15, trend: 'down' },
      resilienceScore: { delta: -12, trend: 'down' },
      powerDraw: { delta: 1.8, trend: 'up' },
    },
    event_timeline: [
      { tick_offset: 0, type: 'info', message: 'Simulation initialized - Cooling Stress scenario', severity: 'low' },
      { tick_offset: 5, type: 'alert', message: 'ALERT: Temperature anomaly in Zone B liquid cooling loop', severity: 'high' },
      { tick_offset: 12, type: 'detect', message: 'Coolant flow rate dropping - 78% of nominal', severity: 'high' },
      { tick_offset: 18, type: 'warning', message: 'CRITICAL: GPU temps rising above safe threshold', severity: 'critical' },
      { tick_offset: 25, type: 'action', message: 'Emergency protocol activated - throttling Zone B workloads', severity: 'critical' },
      { tick_offset: 32, type: 'action', message: 'Backup air cooling engaged for affected racks', severity: 'high' },
      { tick_offset: 40, type: 'decision', message: 'Evaluating workload migration to Zone A', severity: 'medium' },
      { tick_offset: 50, type: 'action', message: 'Critical workloads migrated to unaffected zones', severity: 'medium' },
      { tick_offset: 65, type: 'info', message: 'Maintenance team dispatched - ETA 45 minutes', severity: 'medium' },
      { tick_offset: 80, type: 'detect', message: 'Zone B temperatures stabilizing with reduced load', severity: 'medium' },
      { tick_offset: 95, type: 'resolved', message: 'Incident contained - recovery procedures initiated', severity: 'low' },
      { tick_offset: 100, type: 'resolved', message: 'Simulation completed - Cooling Stress scenario', severity: 'low' },
    ]
  },
  {
    id: 'carbon_price_shock',
    name: 'Carbon Price Shock',
    description: 'Project financial impact of carbon price spike to $200/tonne',
    category: 'financial',
    duration_seconds: 35,
    severity: 'medium',
    kpi_impacts: {
      carbonCostExposure: { delta: 4200, trend: 'up' },
      economicEfficiencyScore: { delta: -15, trend: 'down' },
      costPerGpuHour: { delta: 0.12, trend: 'up' },
      sustainabilityScore: { delta: -8, trend: 'down' },
    },
    event_timeline: [
      { tick_offset: 0, type: 'info', message: 'Simulation initialized - Carbon Price Shock scenario', severity: 'low' },
      { tick_offset: 10, type: 'alert', message: 'Carbon price increase detected: $65 → $200/tonne', severity: 'high' },
      { tick_offset: 20, type: 'decision', message: 'Analyzing financial impact across facilities', severity: 'medium' },
      { tick_offset: 35, type: 'detect', message: 'AB facility (gas-heavy) facing 25% OPEX increase', severity: 'high' },
      { tick_offset: 50, type: 'info', message: 'QC facility (hydro) impact limited to 3% increase', severity: 'low' },
      { tick_offset: 65, type: 'decision', message: 'Evaluating workload migration to green facility', severity: 'medium' },
      { tick_offset: 80, type: 'action', message: 'Updating carbon cost projections and forecasts', severity: 'medium' },
      { tick_offset: 92, type: 'info', message: 'Recommendation: Accelerate renewable transition', severity: 'medium' },
      { tick_offset: 100, type: 'resolved', message: 'Simulation completed - Carbon Price Shock scenario', severity: 'low' },
    ]
  },
  {
    id: 'sovereignty_violation',
    name: 'Sovereignty Violation',
    description: 'Data flow detected to non-Canadian jurisdiction',
    category: 'compliance',
    duration_seconds: 40,
    severity: 'critical',
    kpi_impacts: {
      sovereignComputeRatioPct: { delta: -5, trend: 'down' },
      sovereignRiskScore: { delta: 28, trend: 'up' },
      dataFlowViolations: { delta: 1, trend: 'up' },
      auditReadiness: { delta: -15, trend: 'down' },
      policyCompliance: { delta: -8, trend: 'down' },
      sovereigntyScore: { delta: -18, trend: 'down' },
    },
    event_timeline: [
      { tick_offset: 0, type: 'info', message: 'Simulation initialized - Sovereignty Violation scenario', severity: 'low' },
      { tick_offset: 8, type: 'alert', message: 'CRITICAL: Cross-border data flow detected (CA → US-VA)', severity: 'critical' },
      { tick_offset: 15, type: 'detect', message: 'Violation source: Tenant workload 7492 replication', severity: 'critical' },
      { tick_offset: 22, type: 'action', message: 'Emergency block placed on affected data flows', severity: 'critical' },
      { tick_offset: 30, type: 'decision', message: 'Compliance team notified - incident ticket created', severity: 'high' },
      { tick_offset: 40, type: 'action', message: 'Quarantine procedures initiated for affected data', severity: 'high' },
      { tick_offset: 55, type: 'info', message: 'Root cause analysis: Misconfigured replication policy', severity: 'medium' },
      { tick_offset: 70, type: 'action', message: 'Policy corrected - replication restricted to CA regions', severity: 'medium' },
      { tick_offset: 85, type: 'info', message: 'Incident documented for regulatory reporting', severity: 'medium' },
      { tick_offset: 95, type: 'resolved', message: 'Compliance remediation completed', severity: 'low' },
      { tick_offset: 100, type: 'resolved', message: 'Simulation completed - Sovereignty Violation scenario', severity: 'low' },
    ]
  },
  {
    id: 'power_grid_outage',
    name: 'Grid Instability',
    description: 'Simulate grid fluctuation requiring UPS/generator activation',
    category: 'incident',
    duration_seconds: 55,
    severity: 'high',
    kpi_impacts: {
      effectiveAiPue: { delta: 0.18, trend: 'up' },
      upsCapacity: { delta: 35, trend: 'up' },
      resilienceScore: { delta: -8, trend: 'down' },
      powerDraw: { delta: -2.5, trend: 'down' },
      economicEfficiencyScore: { delta: -12, trend: 'down' },
    },
    event_timeline: [
      { tick_offset: 0, type: 'info', message: 'Simulation initialized - Grid Instability scenario', severity: 'low' },
      { tick_offset: 5, type: 'alert', message: 'Grid voltage fluctuation detected: 8% drop', severity: 'high' },
      { tick_offset: 12, type: 'action', message: 'UPS systems engaged - seamless transfer initiated', severity: 'high' },
      { tick_offset: 18, type: 'detect', message: 'Grid supply interrupted - running on battery backup', severity: 'critical' },
      { tick_offset: 25, type: 'action', message: 'Diesel generators starting - 30 second warm-up', severity: 'high' },
      { tick_offset: 35, type: 'info', message: 'Generators online - load transfer in progress', severity: 'medium' },
      { tick_offset: 45, type: 'action', message: 'Non-critical workloads paused to conserve capacity', severity: 'medium' },
      { tick_offset: 55, type: 'detect', message: 'Grid power restored - monitoring stability', severity: 'medium' },
      { tick_offset: 70, type: 'decision', message: 'Evaluating transfer back to grid power', severity: 'low' },
      { tick_offset: 85, type: 'action', message: 'Initiating controlled transfer to grid', severity: 'low' },
      { tick_offset: 95, type: 'resolved', message: 'Normal operations resumed - incident logged', severity: 'low' },
      { tick_offset: 100, type: 'resolved', message: 'Simulation completed - Grid Instability scenario', severity: 'low' },
    ]
  },
  {
    id: 'new_tenant_onboarding',
    name: 'Tenant Expansion',
    description: 'Onboard major Canadian bank requiring 50MW sovereign capacity',
    category: 'capacity',
    duration_seconds: 40,
    severity: 'low',
    kpi_impacts: {
      gpuUtilization: { delta: 12, trend: 'up' },
      sovereignComputeRatioPct: { delta: 2, trend: 'up' },
      economicEfficiencyScore: { delta: 5, trend: 'up' },
      revenuePerMW: { delta: 1800, trend: 'up' },
      activeWorkloads: { delta: 28, trend: 'up' },
    },
    event_timeline: [
      { tick_offset: 0, type: 'info', message: 'Simulation initialized - Tenant Expansion scenario', severity: 'low' },
      { tick_offset: 10, type: 'info', message: 'New sovereign tenant request: Major Canadian Bank', severity: 'low' },
      { tick_offset: 20, type: 'decision', message: 'Capacity assessment: 50MW requirement confirmed', severity: 'low' },
      { tick_offset: 30, type: 'detect', message: 'Sovereignty verification: Tier 1 compliance required', severity: 'low' },
      { tick_offset: 45, type: 'action', message: 'Allocating dedicated GPU clusters for tenant', severity: 'low' },
      { tick_offset: 60, type: 'info', message: 'Data isolation policies configured and verified', severity: 'low' },
      { tick_offset: 75, type: 'action', message: 'Network segmentation completed', severity: 'low' },
      { tick_offset: 88, type: 'info', message: 'Revenue projection: +$1.8M monthly impact', severity: 'low' },
      { tick_offset: 95, type: 'resolved', message: 'Tenant onboarding complete - operational', severity: 'low' },
      { tick_offset: 100, type: 'resolved', message: 'Simulation completed - Tenant Expansion scenario', severity: 'low' },
    ]
  },
  {
    id: 'emissions_vs_sovereignty',
    name: 'Renewable Drop',
    description: 'Compare impact when renewable energy mix drops from 85% to 45%',
    category: 'emissions',
    duration_seconds: 35,
    severity: 'medium',
    kpi_impacts: {
      renewableMix: { delta: -40, trend: 'down' },
      gco2PerGpuHour: { delta: 85, trend: 'up' },
      dailyEmissions: { delta: 18, trend: 'up' },
      sustainabilityScore: { delta: -22, trend: 'down' },
      carbonCostExposure: { delta: 3500, trend: 'up' },
    },
    event_timeline: [
      { tick_offset: 0, type: 'info', message: 'Simulation initialized - Renewable Drop scenario', severity: 'low' },
      { tick_offset: 12, type: 'detect', message: 'Grid carbon intensity rising: Renewable supply constrained', severity: 'medium' },
      { tick_offset: 25, type: 'alert', message: 'Renewable mix dropped to 45% - gas backup increasing', severity: 'high' },
      { tick_offset: 40, type: 'detect', message: 'Carbon intensity spiking: 32 → 117 g CO₂/GPU-hr', severity: 'high' },
      { tick_offset: 55, type: 'decision', message: 'Evaluating workload shift to QC facility', severity: 'medium' },
      { tick_offset: 70, type: 'info', message: 'Daily emissions projection: +18 tonnes CO₂', severity: 'medium' },
      { tick_offset: 85, type: 'action', message: 'Carbon credit purchase order prepared', severity: 'medium' },
      { tick_offset: 95, type: 'info', message: 'Recommendation: Increase PPA with renewable supplier', severity: 'low' },
      { tick_offset: 100, type: 'resolved', message: 'Simulation completed - Renewable Drop scenario', severity: 'low' },
    ]
  },
  {
    id: 'optimization_run',
    name: 'Optimization Run',
    description: 'AI-driven optimization cycle to improve efficiency scores',
    category: 'optimization',
    duration_seconds: 30,
    severity: 'low',
    kpi_impacts: {
      overallEfficiencyScore: { delta: 6, trend: 'up' },
      effectiveAiPue: { delta: -0.05, trend: 'down' },
      coolingEfficiency: { delta: 4, trend: 'up' },
      economicEfficiencyScore: { delta: 4, trend: 'up' },
      costPerGpuHour: { delta: -0.03, trend: 'down' },
    },
    event_timeline: [
      { tick_offset: 0, type: 'info', message: 'Simulation initialized - Optimization Run scenario', severity: 'low' },
      { tick_offset: 10, type: 'info', message: 'AI optimization engine analyzing facility metrics', severity: 'low' },
      { tick_offset: 25, type: 'detect', message: 'Opportunity identified: Cooling setpoint adjustment', severity: 'low' },
      { tick_offset: 40, type: 'action', message: 'Applying cooling optimization: +2°C setpoint', severity: 'low' },
      { tick_offset: 55, type: 'detect', message: 'Workload balancing opportunity identified', severity: 'low' },
      { tick_offset: 70, type: 'action', message: 'Redistributing jobs across clusters for efficiency', severity: 'low' },
      { tick_offset: 85, type: 'info', message: 'PUE improvement: 1.28 → 1.23 achieved', severity: 'low' },
      { tick_offset: 95, type: 'resolved', message: 'Optimization cycle complete - gains logged', severity: 'low' },
      { tick_offset: 100, type: 'resolved', message: 'Simulation completed - Optimization Run scenario', severity: 'low' },
    ]
  }
];

// ============================================================================
// AI RECOMMENDATIONS
// ============================================================================

export interface AIRecommendation {
  id: string;
  category: 'optimization' | 'risk' | 'compliance' | 'cost' | 'sustainability';
  title: string;
  description: string;
  predictedGain: string;
  confidence: number; // 0-100
  priority: 'high' | 'medium' | 'low';
  actions: string[];
}

export interface SimulationSummary {
  scenario: EnhancedScenario;
  runId: string;
  timestamp: string;
  durationMs: number;
  kpiChanges: Record<string, { before: number; after: number; delta: number; trend: string }>;
  recommendations: AIRecommendation[];
  riskScore: number; // 0-100
  overallImpact: 'positive' | 'negative' | 'neutral';
}

export function generateAIRecommendations(
  scenario: EnhancedScenario,
  kpiChanges: Record<string, { before: number; after: number; delta: number }>
): AIRecommendation[] {
  const recommendations: AIRecommendation[] = [];

  // Scenario-specific recommendations
  switch (scenario.id) {
    case 'gpu_overload':
      recommendations.push({
        id: 'rec-1',
        category: 'optimization',
        title: 'Implement Predictive Workload Balancing',
        description: 'Deploy ML-based workload predictor to anticipate GPU spikes 15+ minutes ahead',
        predictedGain: '18% reduction in thermal throttling events',
        confidence: 87,
        priority: 'high',
        actions: ['Enable workload prediction model', 'Configure auto-scaling policies', 'Set up preemptive migration rules']
      });
      recommendations.push({
        id: 'rec-2',
        category: 'cost',
        title: 'Optimize Cooling Pre-staging',
        description: 'Pre-cool affected zones before predicted high-utilization windows',
        predictedGain: '$12K/month in cooling efficiency savings',
        confidence: 78,
        priority: 'medium',
        actions: ['Integrate with workload scheduler', 'Define cooling ramp-up profiles', 'Monitor thermal lag metrics']
      });
      break;

    case 'cooling_failure':
      recommendations.push({
        id: 'rec-1',
        category: 'risk',
        title: 'Enhance Cooling Redundancy',
        description: 'Install N+2 cooling redundancy for critical GPU zones',
        predictedGain: '99.99% cooling availability',
        confidence: 92,
        priority: 'high',
        actions: ['Procure backup cooling units', 'Design failover plumbing', 'Implement automatic switchover']
      });
      recommendations.push({
        id: 'rec-2',
        category: 'optimization',
        title: 'Deploy Predictive Maintenance',
        description: 'ML-based coolant pump health monitoring to predict failures 48hrs ahead',
        predictedGain: '65% reduction in unplanned cooling outages',
        confidence: 81,
        priority: 'high',
        actions: ['Install vibration sensors', 'Train failure prediction model', 'Configure early warning alerts']
      });
      break;

    case 'carbon_price_shock':
      recommendations.push({
        id: 'rec-1',
        category: 'sustainability',
        title: 'Accelerate Renewable Transition',
        description: 'Increase renewable PPA coverage from 85% to 95%',
        predictedGain: '$2.1M/year carbon cost avoidance at $200/t',
        confidence: 85,
        priority: 'high',
        actions: ['Negotiate expanded PPA terms', 'Evaluate on-site solar/wind', 'Explore battery storage options']
      });
      recommendations.push({
        id: 'rec-2',
        category: 'cost',
        title: 'Dynamic Workload Shifting',
        description: 'Shift flexible workloads to low-carbon windows automatically',
        predictedGain: '22% reduction in effective carbon costs',
        confidence: 76,
        priority: 'medium',
        actions: ['Implement carbon-aware scheduler', 'Define workload flexibility tiers', 'Monitor grid carbon signals']
      });
      break;

    case 'sovereignty_violation':
      recommendations.push({
        id: 'rec-1',
        category: 'compliance',
        title: 'Implement Zero-Trust Data Boundaries',
        description: 'Deploy network-level enforcement of data sovereignty boundaries',
        predictedGain: '99.9% violation prevention rate',
        confidence: 94,
        priority: 'high',
        actions: ['Configure geo-fencing rules', 'Enable real-time flow monitoring', 'Deploy automated blocking']
      });
      recommendations.push({
        id: 'rec-2',
        category: 'compliance',
        title: 'Enhance Replication Policy Controls',
        description: 'Add mandatory sovereignty checks to all replication configurations',
        predictedGain: 'Eliminate configuration-based violations',
        confidence: 91,
        priority: 'high',
        actions: ['Update replication templates', 'Add jurisdiction validation', 'Implement change approval workflow']
      });
      break;

    case 'power_grid_outage':
      recommendations.push({
        id: 'rec-1',
        category: 'risk',
        title: 'Extend UPS Runtime',
        description: 'Upgrade UPS capacity to support 15-minute full-load operation',
        predictedGain: 'Eliminate workload disruption during generator start',
        confidence: 88,
        priority: 'high',
        actions: ['Assess current UPS capacity', 'Procure additional battery modules', 'Test extended runtime']
      });
      recommendations.push({
        id: 'rec-2',
        category: 'cost',
        title: 'Implement Smart Load Shedding',
        description: 'Prioritize critical workloads automatically during power events',
        predictedGain: '40% reduction in workload disruption impact',
        confidence: 82,
        priority: 'medium',
        actions: ['Define workload priority tiers', 'Configure auto-pause policies', 'Test failover scenarios']
      });
      break;

    default:
      recommendations.push({
        id: 'rec-1',
        category: 'optimization',
        title: 'Continue Monitoring',
        description: 'No immediate action required - maintain current optimization trajectory',
        predictedGain: 'Sustained efficiency gains',
        confidence: 70,
        priority: 'low',
        actions: ['Review weekly efficiency reports', 'Monitor for anomalies', 'Update baseline metrics']
      });
  }

  return recommendations;
}

// ============================================================================
// MULTI-RUN COMPARISON
// ============================================================================

export interface MultiRunComparison {
  runIds: string[];
  scenario: EnhancedScenario;
  kpiAverages: Record<string, number>;
  kpiVariance: Record<string, number>;
  consistencyScore: number; // 0-100
  trends: Record<string, 'improving' | 'degrading' | 'stable'>;
}

export function compareMultipleRuns(summaries: SimulationSummary[]): MultiRunComparison | null {
  if (summaries.length < 2) return null;

  const scenario = summaries[0].scenario;
  const kpiKeys = Object.keys(summaries[0].kpiChanges);
  
  const kpiAverages: Record<string, number> = {};
  const kpiVariance: Record<string, number> = {};
  const trends: Record<string, 'improving' | 'degrading' | 'stable'> = {};

  kpiKeys.forEach(key => {
    const deltas = summaries.map(s => s.kpiChanges[key]?.delta || 0);
    const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const variance = deltas.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / deltas.length;
    
    kpiAverages[key] = avg;
    kpiVariance[key] = variance;

    // Determine trend based on direction
    const kpi = SOVEREIGN_DC_KPI_GROUPS.flatMap(g => g.kpis).find(k => k.key === key);
    if (kpi) {
      const isPositive = (kpi.direction === 'higher' && avg > 0) || (kpi.direction === 'lower' && avg < 0);
      const isSignificant = Math.abs(avg) > 0.5;
      trends[key] = !isSignificant ? 'stable' : isPositive ? 'improving' : 'degrading';
    } else {
      trends[key] = 'stable';
    }
  });

  // Calculate consistency score based on variance
  const avgVariance = Object.values(kpiVariance).reduce((a, b) => a + b, 0) / Object.keys(kpiVariance).length;
  const consistencyScore = Math.max(0, Math.min(100, 100 - avgVariance * 10));

  return {
    runIds: summaries.map(s => s.runId),
    scenario,
    kpiAverages,
    kpiVariance,
    consistencyScore,
    trends
  };
}

// ============================================================================
// SIMULATION RUNNER
// ============================================================================

export class EnhancedSimulationRunner {
  private scenario: EnhancedScenario;
  private baselineKpis: Record<string, number>;
  private currentKpis: Record<string, number>;
  private events: SimulationEventTemplate[];
  private tick: number = 0;
  private intervalId: number | null = null;
  private speed: number = 1;
  private listeners: Map<string, ((...args: unknown[]) => void)[]> = new Map();
  private runHistory: SimulationSummary[] = [];

  constructor(scenario: EnhancedScenario, baselineKpis?: Record<string, number>) {
    this.scenario = scenario;
    this.events = scenario.event_timeline;
    
    // Initialize baseline KPIs from KPI groups
    this.baselineKpis = baselineKpis || {};
    SOVEREIGN_DC_KPI_GROUPS.forEach(group => {
      group.kpis.forEach(kpi => {
        if (!this.baselineKpis[kpi.key]) {
          this.baselineKpis[kpi.key] = kpi.baseline;
        }
      });
    });
    
    this.currentKpis = { ...this.baselineKpis };
  }

  on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(data));
  }

  start(): void {
    if (this.intervalId) return;

    const baseInterval = 1000;
    const interval = baseInterval / this.speed;

    this.intervalId = window.setInterval(() => {
      this.tick++;
      this.runTick();

      if (this.tick >= this.scenario.duration_seconds) {
        this.complete();
      }
    }, interval);

    this.emit('kpi-update', { timestamp: this.formatTimestamp(0), kpis: this.currentKpis });
  }

  pause(): void {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  stop(): void {
    this.pause();
    this.tick = 0;
    this.currentKpis = { ...this.baselineKpis };
  }

  reset(): void {
    this.stop();
  }

  setSpeed(speed: number): void {
    const wasRunning = this.intervalId !== null;
    this.pause();
    this.speed = speed;
    if (wasRunning) {
      this.start();
    }
  }

  getRunHistory(): SimulationSummary[] {
    return this.runHistory;
  }

  private runTick(): void {
    const progress = (this.tick / this.scenario.duration_seconds) * 100;

    // Update KPIs based on scenario impacts
    this.updateKpis(progress);

    // Emit events at scheduled times
    this.emitScheduledEvents(progress);

    // Emit KPI update
    this.emit('kpi-update', {
      timestamp: this.formatTimestamp(this.tick),
      kpis: { ...this.currentKpis },
      progress
    });
  }

  private updateKpis(progress: number): void {
    const impacts = this.scenario.kpi_impacts;
    
    Object.entries(impacts).forEach(([key, impact]) => {
      if (this.baselineKpis[key] !== undefined && impact) {
        // Gradually apply the delta over the simulation duration
        const targetDelta = impact.delta;
        const easedProgress = this.easeInOutQuad(progress / 100);
        const currentDelta = targetDelta * easedProgress;
        
        this.currentKpis[key] = this.baselineKpis[key] + currentDelta;
      }
    });
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  private emitScheduledEvents(progress: number): void {
    this.events.forEach(event => {
      // Check if this event should fire at this tick (within 2% tolerance)
      if (Math.abs(event.tick_offset - progress) < 2 && !event.metadata?.emitted) {
        event.metadata = { ...event.metadata, emitted: true };
        
        this.emit('event', {
          id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: this.formatTimestamp(this.tick),
          type: event.type,
          message: event.message,
          severity: event.severity,
          metadata: event.metadata
        });
      }
    });
  }

  private complete(): void {
    this.pause();

    // Calculate KPI changes
    const kpiChanges: Record<string, { before: number; after: number; delta: number; trend: string }> = {};
    Object.keys(this.baselineKpis).forEach(key => {
      const before = this.baselineKpis[key];
      const after = this.currentKpis[key];
      const delta = after - before;
      const kpi = SOVEREIGN_DC_KPI_GROUPS.flatMap(g => g.kpis).find(k => k.key === key);
      const isPositive = kpi && ((kpi.direction === 'higher' && delta > 0) || (kpi.direction === 'lower' && delta < 0));
      
      kpiChanges[key] = {
        before,
        after,
        delta,
        trend: Math.abs(delta) < 0.1 ? 'stable' : isPositive ? 'improved' : 'degraded'
      };
    });

    // Generate recommendations
    const recommendations = generateAIRecommendations(this.scenario, kpiChanges);

    // Calculate risk score
    const negativeChanges = Object.values(kpiChanges).filter(c => c.trend === 'degraded').length;
    const totalChanges = Object.keys(kpiChanges).length;
    const riskScore = Math.round((negativeChanges / totalChanges) * 100);

    // Determine overall impact
    const positiveCount = Object.values(kpiChanges).filter(c => c.trend === 'improved').length;
    const overallImpact = positiveCount > negativeChanges ? 'positive' : negativeChanges > positiveCount ? 'negative' : 'neutral';

    const summary: SimulationSummary = {
      scenario: this.scenario,
      runId: `run-${Date.now()}`,
      timestamp: new Date().toISOString(),
      durationMs: this.tick * 1000,
      kpiChanges,
      recommendations,
      riskScore,
      overallImpact
    };

    this.runHistory.push(summary);

    this.emit('complete', summary);

    // Reset event emission flags for next run
    this.events.forEach(event => {
      if (event.metadata) {
        event.metadata.emitted = false;
      }
    });
  }

  private formatTimestamp(tick: number): string {
    const minutes = Math.floor(tick / 60);
    const seconds = tick % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
