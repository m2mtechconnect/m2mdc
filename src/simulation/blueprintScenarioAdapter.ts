/**
 * Blueprint Scenario Adapter
 * Converts SimulationScenarioBlueprint from Blueprint to ScenarioDefinition for the Simulation Engine
 */

import type { SimulationScenarioBlueprint, KpiImpact } from '@/types/dataCentreBlueprint';
import type { ScenarioDefinition, ScenarioTimelineStep } from './types';
import type { DomainType } from '@/types/dataCenterTwin';

// Map severity strings to the expected format
function mapSeverity(severity: string): 'low' | 'medium' | 'high' | 'critical' {
  switch (severity.toLowerCase()) {
    case 'critical':
    case 'emergency':
      return 'critical';
    case 'high':
    case 'error':
      return 'high';
    case 'medium':
    case 'warning':
      return 'medium';
    default:
      return 'low';
  }
}

// Convert KPI impacts to delta format
function kpiImpactsToDeltas(impacts: KpiImpact[]): Partial<Record<string, number>> {
  const deltas: Partial<Record<string, number>> = {};
  
  for (const impact of impacts) {
    const value = impact.direction === 'decrease' ? -impact.magnitude : impact.magnitude;
    // Convert kpiId to camelCase field name
    const fieldName = impact.kpiId
      .replace(/^kpi-/, '')
      .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    deltas[fieldName] = value;
  }
  
  return deltas;
}

// Generate a basic timeline from blueprint scenario
function generateTimeline(
  scenario: SimulationScenarioBlueprint,
  durationSeconds: number
): ScenarioTimelineStep[] {
  const timeline: ScenarioTimelineStep[] = [];
  const primaryDomain = scenario.domainImpact[0] as DomainType || 'thermal_hardware';
  const severity = mapSeverity(scenario.severity);
  const kpiDeltas = kpiImpactsToDeltas(scenario.kpiImpacts);
  
  // Start event
  timeline.push({
    at: 0,
    type: 'START',
    kpiDeltas: {},
    eventTitle: 'Scenario Started',
    eventDescription: `${scenario.name} simulation initiated`,
    severity: 'low',
    domain: primaryDomain,
  });
  
  // Trigger event at 10%
  timeline.push({
    at: Math.round(durationSeconds * 0.1),
    type: 'TRIGGER',
    kpiDeltas: Object.fromEntries(
      Object.entries(kpiDeltas).map(([k, v]) => [k, (v as number) * 0.3])
    ),
    eventTitle: `${scenario.category} Event Detected`,
    eventDescription: scenario.triggers[0] || scenario.description,
    severity: severity,
    domain: primaryDomain,
  });
  
  // Alert event at 25%
  timeline.push({
    at: Math.round(durationSeconds * 0.25),
    type: 'ALERT',
    kpiDeltas: Object.fromEntries(
      Object.entries(kpiDeltas).map(([k, v]) => [k, (v as number) * 0.5])
    ),
    eventTitle: `${scenario.category} Impact Increasing`,
    eventDescription: `KPI thresholds breached`,
    severity: severity === 'low' ? 'medium' : severity,
    domain: primaryDomain,
  });
  
  // Mitigation at 50%
  timeline.push({
    at: Math.round(durationSeconds * 0.5),
    type: 'MITIGATION',
    kpiDeltas: Object.fromEntries(
      Object.entries(kpiDeltas).map(([k, v]) => [k, (v as number) * -0.2])
    ),
    eventTitle: 'Mitigation Initiated',
    eventDescription: 'Automated response activated',
    severity: 'medium',
    domain: primaryDomain,
  });
  
  // Recovery at 75%
  timeline.push({
    at: Math.round(durationSeconds * 0.75),
    type: 'RECOVERY',
    kpiDeltas: Object.fromEntries(
      Object.entries(kpiDeltas).map(([k, v]) => [k, (v as number) * -0.4])
    ),
    eventTitle: 'System Recovering',
    eventDescription: 'KPIs returning to baseline',
    severity: 'low',
    domain: primaryDomain,
  });
  
  // End event
  timeline.push({
    at: durationSeconds,
    type: 'END',
    kpiDeltas: {},
    eventTitle: 'Scenario Complete',
    eventDescription: `${scenario.name} simulation completed`,
    severity: 'low',
    domain: primaryDomain,
  });
  
  return timeline;
}

/**
 * Convert a Blueprint simulation scenario to a Simulation Engine scenario definition
 */
export function convertBlueprintScenario(
  blueprintScenario: SimulationScenarioBlueprint
): ScenarioDefinition {
  const durationSeconds = blueprintScenario.durationMinutes * 60;
  
  return {
    id: blueprintScenario.id,
    name: blueprintScenario.name,
    description: blueprintScenario.description,
    durationSeconds,
    domainsInvolved: blueprintScenario.domainImpact as DomainType[],
    severity: blueprintScenario.severity as any,
    category: blueprintScenario.domainImpact[0] as DomainType || 'thermal_hardware',
    tags: [blueprintScenario.category, ...blueprintScenario.domainImpact],
    timeline: generateTimeline(blueprintScenario, durationSeconds),
    isCustom: false,
  };
}

/**
 * Convert all Blueprint scenarios to Simulation Engine scenarios
 */
export function convertAllBlueprintScenarios(
  blueprintScenarios: SimulationScenarioBlueprint[]
): ScenarioDefinition[] {
  return blueprintScenarios.map(convertBlueprintScenario);
}

/**
 * Get a merged list of preset scenarios and blueprint scenarios
 * Blueprint scenarios take precedence for matching IDs
 */
export function mergeWithPresetScenarios(
  presetScenarios: ScenarioDefinition[],
  blueprintScenarios: SimulationScenarioBlueprint[]
): ScenarioDefinition[] {
  const blueprintConverted = convertAllBlueprintScenarios(blueprintScenarios);
  const blueprintIds = new Set(blueprintConverted.map(s => s.id));
  
  // Filter out preset scenarios that have matching blueprint scenarios
  const filteredPresets = presetScenarios.filter(s => !blueprintIds.has(s.id));
  
  return [...blueprintConverted, ...filteredPresets];
}
