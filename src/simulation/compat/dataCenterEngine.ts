/**
 * Data Centre Digital Twin - Simulation Engine
 * Handles scenario execution, KPI calculations, and event generation
 */

import type {
  DataCentreFacility,
  SimulationScenario,
  SimulationRun,
  SimulationEvent,
  DomainType,
} from '@/types/dataCenterTwin';
import { SIMULATION_SCENARIOS, getScenarioById } from './simulationScenarios';

// ============================================================================
// SIMULATION STATE
// ============================================================================

export interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  currentTime: number; // seconds elapsed
  timeMultiplier: number;
  events: SimulationEvent[];
  currentKpis: Record<string, number>;
  kpiHistory: { time: number; kpis: Record<string, number> }[];
}

// ============================================================================
// KPI CALCULATION ENGINE
// ============================================================================

export function calculateBaseKpis(facility: DataCentreFacility): Record<string, number> {
  return {
    // Thermal & Hardware
    thermalStabilityScore: facility.thermalHardware.kpis.thermalStabilityScore,
    hotspotRiskProbability: facility.thermalHardware.kpis.hotspotRiskProbability,
    avgServerTemp: facility.thermalHardware.kpis.avgServerTemp,
    maxServerTemp: facility.thermalHardware.kpis.maxServerTemp,
    eccErrorRate: facility.thermalHardware.kpis.eccErrorRate,
    thermalThrottlingEvents: facility.thermalHardware.kpis.thermalThrottlingEvents,
    
    // Power & UPS
    powerReliabilityScore: facility.powerUps.kpis.powerReliabilityScore,
    upsHealthIndex: facility.powerUps.kpis.upsHealthIndex,
    totalPowerDrawMw: facility.powerUps.kpis.totalPowerDrawMw,
    avgUpsRuntime: facility.powerUps.kpis.avgUpsRuntime,
    generatorReadiness: facility.powerUps.kpis.generatorReadiness,
    
    // Cooling
    coolingEfficiencyIndex: facility.cooling.kpis.coolingEfficiencyIndex,
    coolingCostPerKw: facility.cooling.kpis.coolingCostPerKw,
    coolingRedundancyScore: facility.cooling.kpis.coolingRedundancyScore,
    pueFromCooling: facility.cooling.kpis.pueFromCooling,
    
    // Network
    networkIntegrityScore: facility.network.kpis.networkIntegrityScore,
    fabricSaturationIndex: facility.network.kpis.fabricSaturationIndex,
    avgLatencyMs: facility.network.kpis.avgLatencyMs,
    packetLossRate: facility.network.kpis.packetLossRate,
    
    // Facility & Safety
    environmentalSafetyScore: facility.facilitySafety.kpis.environmentalSafetyScore,
    earlyWarningIndex: facility.facilitySafety.kpis.earlyWarningIndex,
    fireSuppressionReadiness: facility.facilitySafety.kpis.fireSuppressionReadiness,
    waterLeakRisk: facility.facilitySafety.kpis.waterLeakRisk,
    
    // Workload & GPU
    totalGpuCount: facility.workloadGpu.kpis.totalGpuCount,
    activeGpuCount: facility.workloadGpu.kpis.activeGpuCount,
    avgGpuUtilization: facility.workloadGpu.kpis.avgGpuUtilization,
    queueDepth: facility.workloadGpu.kpis.queueDepth,
    slaBreachRate: facility.workloadGpu.kpis.slaBreachRate,
    gpuFairnessIndex: facility.workloadGpu.kpis.gpuFairnessIndex,
    costPerGpuHour: facility.workloadGpu.kpis.costPerGpuHour,
    
    // Sovereignty
    sovereignComputeRatioPct: facility.sovereignty.kpis.sovereignComputeRatioPct,
    sovereigntyRiskScore: facility.sovereignty.kpis.sovereigntyRiskScore,
    dataFlowViolations: facility.sovereignty.kpis.dataFlowViolations,
    policyComplianceRate: facility.sovereignty.kpis.policyComplianceRate,
    auditReadinessScore: facility.sovereignty.kpis.auditReadinessScore,
    
    // Financial & Carbon
    effectivePue: facility.financialCarbon.kpis.effectivePue,
    dcie: facility.financialCarbon.kpis.dcie,
    wue: facility.financialCarbon.kpis.wue,
    cue: facility.financialCarbon.kpis.cue,
    economicEfficiencyScore: facility.financialCarbon.kpis.economicEfficiencyScore,
    carbonNeutralProgress: facility.financialCarbon.kpis.carbonNeutralProgress,
    renewableEnergyScore: facility.financialCarbon.kpis.renewableEnergyScore,
    gCo2PerGpuHour: facility.financialCarbon.carbonMetrics.gCo2PerGpuHour,
  };
}

export function applyScenarioDeltas(
  baseKpis: Record<string, number>,
  scenario: SimulationScenario,
  progress: number // 0-1
): Record<string, number> {
  const result = { ...baseKpis };
  
  // Apply deltas progressively based on simulation progress
  for (const [key, delta] of Object.entries(scenario.expectedKpiDeltas)) {
    if (key in result && typeof delta === 'number') {
      // Use a curve for more realistic simulation (ramp up, peak, recovery)
      let effectiveProgress: number;
      if (progress < 0.3) {
        // Ramp up phase
        effectiveProgress = progress / 0.3;
      } else if (progress < 0.7) {
        // Peak phase
        effectiveProgress = 1;
      } else {
        // Recovery phase (for non-permanent impacts)
        effectiveProgress = 1 - (progress - 0.7) / 0.3 * 0.5;
      }
      
      result[key] = result[key] + delta * effectiveProgress;
      
      // Clamp percentage values
      if (key.includes('Pct') || key.includes('Score') || key.includes('Index')) {
        result[key] = Math.max(0, Math.min(100, result[key]));
      }
    }
  }
  
  return result;
}

// ============================================================================
// EVENT GENERATION
// ============================================================================

export function generateScenarioEvents(
  scenario: SimulationScenario,
  runId: string
): SimulationEvent[] {
  const events: SimulationEvent[] = [];
  const duration = scenario.duration;
  
  // Start event
  events.push({
    id: `${runId}-event-start`,
    scenarioId: scenario.id,
    timestamp: new Date(),
    eventType: 'start',
    message: `Simulation started: ${scenario.name}`,
    kpiSnapshot: {},
  });
  
  // Trigger events (spread across first 30% of simulation)
  scenario.triggers.forEach((trigger, index) => {
    events.push({
      id: `${runId}-event-trigger-${index}`,
      scenarioId: scenario.id,
      timestamp: new Date(Date.now() + (duration * 0.1 * (index + 1)) * 1000),
      eventType: 'alert',
      message: trigger,
      kpiSnapshot: {},
    });
  });
  
  // Mitigation events (spread across 40-80% of simulation)
  scenario.mitigationSteps.forEach((step, index) => {
    const progress = 0.4 + (0.4 / scenario.mitigationSteps.length) * (index + 1);
    events.push({
      id: `${runId}-event-mitigation-${index}`,
      scenarioId: scenario.id,
      timestamp: new Date(Date.now() + (duration * progress) * 1000),
      eventType: 'mitigation',
      message: step,
      kpiSnapshot: {},
    });
  });
  
  // Recovery event
  events.push({
    id: `${runId}-event-recovery`,
    scenarioId: scenario.id,
    timestamp: new Date(Date.now() + (duration * 0.9) * 1000),
    eventType: 'recovery',
    message: 'System recovering to normal state',
    kpiSnapshot: {},
  });
  
  // End event
  events.push({
    id: `${runId}-event-end`,
    scenarioId: scenario.id,
    timestamp: new Date(Date.now() + duration * 1000),
    eventType: 'end',
    message: `Simulation completed: ${scenario.name}`,
    kpiSnapshot: {},
  });
  
  return events;
}

// ============================================================================
// SIMULATION RUN MANAGEMENT
// ============================================================================

export function createSimulationRun(
  facilityId: string,
  scenario: SimulationScenario
): SimulationRun {
  const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id: runId,
    facilityId,
    scenarioId: scenario.id,
    name: scenario.name,
    status: 'pending',
    startTime: new Date(),
    currentTime: new Date(),
    timeMultiplier: 1,
    events: generateScenarioEvents(scenario, runId),
    kpiDeltas: scenario.expectedKpiDeltas,
    recommendations: scenario.mitigationSteps,
  };
}

export function updateSimulationRun(
  run: SimulationRun,
  elapsedSeconds: number,
  baseKpis: Record<string, number>
): SimulationRun {
  const scenario = getScenarioById(run.scenarioId);
  if (!scenario) return run;
  
  const progress = Math.min(1, elapsedSeconds / scenario.duration);
  const currentKpis = applyScenarioDeltas(baseKpis, scenario, progress);
  
  // Update event timestamps and KPI snapshots
  const updatedEvents = run.events.map(event => {
    const eventProgress = (event.timestamp.getTime() - run.startTime.getTime()) / (scenario.duration * 1000);
    if (eventProgress <= progress) {
      return {
        ...event,
        kpiSnapshot: applyScenarioDeltas(baseKpis, scenario, eventProgress),
      };
    }
    return event;
  });
  
  return {
    ...run,
    status: progress >= 1 ? 'completed' : 'running',
    currentTime: new Date(run.startTime.getTime() + elapsedSeconds * 1000),
    endTime: progress >= 1 ? new Date() : undefined,
    events: updatedEvents,
    kpiDeltas: Object.fromEntries(
      Object.entries(scenario.expectedKpiDeltas).map(([key, delta]) => [
        key,
        (delta as number) * progress,
      ])
    ),
  };
}

// ============================================================================
// PLAYBOOK GENERATION
// ============================================================================

export interface GeneratedPlaybook {
  id: string;
  scenarioId: string;
  scenarioName: string;
  generatedAt: Date;
  executiveSummary: string;
  incidentTimeline: { time: string; event: string; action: string }[];
  rootCauseAnalysis: string[];
  mitigationProcedures: { step: number; action: string; responsibility: string; timeframe: string }[];
  preventiveMeasures: string[];
  kpiImpact: { kpi: string; before: number; after: number; delta: number }[];
  lessonsLearned: string[];
}

export function generatePlaybook(
  scenario: SimulationScenario,
  baseKpis: Record<string, number>
): GeneratedPlaybook {
  const affectedKpis = applyScenarioDeltas(baseKpis, scenario, 1);
  
  return {
    id: `playbook-${scenario.id}-${Date.now()}`,
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    generatedAt: new Date(),
    executiveSummary: `This playbook addresses the "${scenario.name}" scenario, a ${scenario.severity}-severity incident in the ${scenario.category.replace('_', ' ')} domain. The expected duration is ${scenario.duration} seconds. Immediate response and proper mitigation are critical to minimize impact.`,
    incidentTimeline: [
      { time: 'T+0s', event: 'Incident Detection', action: 'Automated monitoring triggers alert' },
      ...scenario.triggers.map((trigger, i) => ({
        time: `T+${(i + 1) * 10}s`,
        event: trigger,
        action: 'Assess severity and initiate response',
      })),
      ...scenario.mitigationSteps.map((step, i) => ({
        time: `T+${(i + 1) * 30 + 30}s`,
        event: 'Mitigation Step',
        action: step,
      })),
    ],
    rootCauseAnalysis: [
      `Primary cause: ${scenario.description}`,
      `Category: ${scenario.category.replace('_', ' ').toUpperCase()}`,
      `Severity: ${scenario.severity.toUpperCase()}`,
      `Contributing factors may include equipment age, load conditions, or environmental factors`,
    ],
    mitigationProcedures: scenario.mitigationSteps.map((step, i) => ({
      step: i + 1,
      action: step,
      responsibility: i < 2 ? 'NOC Operator' : i < 4 ? 'Facility Engineer' : 'Management',
      timeframe: i < 2 ? 'Immediate' : i < 4 ? 'Within 15 minutes' : 'Within 1 hour',
    })),
    preventiveMeasures: [
      'Regular equipment maintenance and testing',
      'Enhanced monitoring and alerting thresholds',
      'Staff training on emergency procedures',
      'Redundancy improvements where feasible',
      'Documentation and runbook updates',
    ],
    kpiImpact: Object.entries(scenario.expectedKpiDeltas).map(([key, delta]) => ({
      kpi: key,
      before: baseKpis[key] || 0,
      after: affectedKpis[key] || 0,
      delta: delta as number,
    })),
    lessonsLearned: [
      'Early detection is critical for minimizing impact',
      'Clear escalation paths reduce response time',
      'Regular drills improve team readiness',
      'Post-incident reviews identify improvement opportunities',
    ],
  };
}

export function playbookToMarkdown(playbook: GeneratedPlaybook): string {
  let md = `# Incident Playbook: ${playbook.scenarioName}\n\n`;
  md += `**Generated:** ${playbook.generatedAt.toISOString()}\n\n`;
  md += `## Executive Summary\n\n${playbook.executiveSummary}\n\n`;
  
  md += `## Incident Timeline\n\n`;
  md += `| Time | Event | Action |\n|------|-------|--------|\n`;
  playbook.incidentTimeline.forEach(item => {
    md += `| ${item.time} | ${item.event} | ${item.action} |\n`;
  });
  
  md += `\n## Root Cause Analysis\n\n`;
  playbook.rootCauseAnalysis.forEach(item => {
    md += `- ${item}\n`;
  });
  
  md += `\n## Mitigation Procedures\n\n`;
  playbook.mitigationProcedures.forEach(proc => {
    md += `${proc.step}. **${proc.action}**\n   - Responsibility: ${proc.responsibility}\n   - Timeframe: ${proc.timeframe}\n\n`;
  });
  
  md += `## KPI Impact\n\n`;
  md += `| KPI | Before | After | Delta |\n|-----|--------|-------|-------|\n`;
  playbook.kpiImpact.forEach(kpi => {
    const sign = kpi.delta >= 0 ? '+' : '';
    md += `| ${kpi.kpi} | ${kpi.before.toFixed(2)} | ${kpi.after.toFixed(2)} | ${sign}${kpi.delta.toFixed(2)} |\n`;
  });
  
  md += `\n## Preventive Measures\n\n`;
  playbook.preventiveMeasures.forEach(item => {
    md += `- ${item}\n`;
  });
  
  md += `\n## Lessons Learned\n\n`;
  playbook.lessonsLearned.forEach(item => {
    md += `- ${item}\n`;
  });
  
  return md;
}
