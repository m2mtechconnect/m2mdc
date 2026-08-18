/**
 * Custom Scenario Builder
 * Utilities for creating user-defined scenarios
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * INDUSTRY SOURCE REFERENCES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * SCENARIO PLANNING & SIMULATION:
 * - ISO 22301:2019 Business Continuity Management Systems
 *   https://www.iso.org/standard/75106.html
 * - Uptime Institute Tier Certification Scenario Testing
 *   https://uptimeinstitute.com/tier-certification
 * 
 * FAILURE MODE ANALYSIS:
 * - FMEA (Failure Mode and Effects Analysis) - ASQ
 *   https://asq.org/quality-resources/fmea
 * - IEEE 1413 Standard for Reliability Predictions
 *   https://standards.ieee.org/standard/1413-2021.html
 * 
 * DATA CENTER DOMAINS:
 * - TIA-942-B Data Center Infrastructure Standard
 *   https://tiaonline.org/what-we-do/standards/
 * - Uptime Institute Tier Topology Standards
 *   https://uptimeinstitute.com/tier-certification/tier-requirements
 * 
 * KPI DEFINITIONS:
 * - The Green Grid Metrics (PUE, DCiE, CUE, WUE)
 *   https://www.thegreengrid.org/en/resources/library-and-tools
 * - DCIM KPI Best Practices (Schneider Electric)
 *   https://www.se.com/ww/en/download/document/WP104/
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ScenarioDefinition, ScenarioTimelineStep, CustomScenarioConfig } from './types';
import type { DomainType } from '@/types/dataCenterTwin';
import { addCustomScenario } from './scenarioRegistry';

/**
 * Create a custom scenario from user configuration
 */
export function createCustomScenario(config: CustomScenarioConfig): ScenarioDefinition {
  // Identifier only (not simulation output): UUID-backed, no Math.random.
  const id = newIdentifier('custom');
  
  // Build timeline from config steps
  const timeline: ScenarioTimelineStep[] = [];
  
  // Start event
  timeline.push({
    at: 0,
    type: 'START',
    kpiDeltas: config.initialKpiOffsets,
    eventTitle: 'Custom Scenario Started',
    eventDescription: config.description,
    severity: 'low',
    domain: config.affectedDomains[0] || 'facility_safety',
  });
  
  // User-defined steps
  config.timelineSteps.forEach((step, index) => {
    const atSeconds = (step.atPercent / 100) * config.durationSeconds;
    timeline.push({
      at: atSeconds,
      type: index < config.timelineSteps.length / 2 ? 'ALERT' : 'MITIGATION',
      kpiDeltas: step.kpiDeltas,
      eventTitle: step.eventTitle,
      eventDescription: `Step ${index + 1} of custom scenario`,
      severity: step.severity,
      domain: config.affectedDomains[index % config.affectedDomains.length] || 'facility_safety',
    });
  });
  
  // End event
  timeline.push({
    at: config.durationSeconds,
    type: 'END',
    kpiDeltas: {},
    eventTitle: 'Custom Scenario Complete',
    eventDescription: 'User-defined scenario has completed',
    severity: 'low',
    domain: config.affectedDomains[0] || 'facility_safety',
  });
  
  // Sort timeline by time
  timeline.sort((a, b) => a.at - b.at);
  
  const scenario: ScenarioDefinition = {
    id,
    name: config.name,
    description: config.description,
    durationSeconds: config.durationSeconds,
    domainsInvolved: config.affectedDomains,
    severity: 'warning',
    category: config.affectedDomains[0] || 'facility_safety',
    timeline,
    tags: ['Custom'],
    isCustom: true,
  };
  
  // Register the scenario
  addCustomScenario(scenario);
  
  return scenario;
}

/**
 * Get default KPI options for the custom builder
 */
export function getAvailableKpiOptions(): { key: string; label: string; unit: string }[] {
  return [
    { key: 'effectivePue', label: 'PUE', unit: '' },
    { key: 'avgGpuUtilization', label: 'GPU Utilization', unit: '%' },
    { key: 'thermalStabilityScore', label: 'Thermal Stability', unit: 'pts' },
    { key: 'powerReliabilityScore', label: 'Power Reliability', unit: 'pts' },
    { key: 'coolingEfficiencyIndex', label: 'Cooling Efficiency', unit: '%' },
    { key: 'networkIntegrityScore', label: 'Network Integrity', unit: '%' },
    { key: 'environmentalSafetyScore', label: 'Environmental Safety', unit: '%' },
    { key: 'sovereigntyRiskScore', label: 'Sovereignty Risk', unit: 'pts' },
    { key: 'upsHealthIndex', label: 'UPS Health', unit: '%' },
    { key: 'avgUpsRuntime', label: 'UPS Runtime', unit: 'min' },
    { key: 'economicEfficiencyScore', label: 'Economic Efficiency', unit: '%' },
    { key: 'carbonNeutralProgress', label: 'Carbon Neutral Progress', unit: '%' },
  ];
}

/**
 * Get domain options for the custom builder
 */
export function getDomainOptions(): { id: DomainType; label: string }[] {
  return [
    { id: 'thermal_hardware', label: 'Thermal & Hardware' },
    { id: 'power_ups', label: 'Power & UPS' },
    { id: 'cooling', label: 'Cooling Systems' },
    { id: 'network', label: 'Network' },
    { id: 'facility_safety', label: 'Facility & Safety' },
    { id: 'workload_gpu', label: 'Workload & GPU' },
    { id: 'sovereignty', label: 'Sovereignty' },
    { id: 'financial_carbon', label: 'Financial & Carbon' },
  ];
}
