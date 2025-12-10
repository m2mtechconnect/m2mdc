/**
 * Generate Simulation Result Summary
 * Creates RCA, recommendations, and KPI delta summary from simulation data
 */

import type { 
  SimulationEvent, 
  SimulationResultSummary, 
  SimulationKpiDelta,
  ScenarioDefinition,
  RackMetrics,
} from './types';

// KPI metadata for result generation
const KPI_METADATA: Record<string, { label: string; unit: string; higherIsBetter: boolean }> = {
  pue: { label: 'Power Usage Effectiveness', unit: '', higherIsBetter: false },
  thermalStabilityScore: { label: 'Thermal Stability', unit: '%', higherIsBetter: true },
  gpuUtilization: { label: 'GPU Utilization', unit: '%', higherIsBetter: true },
  powerReliabilityScore: { label: 'Power Reliability', unit: '%', higherIsBetter: true },
  sovereignComplianceScore: { label: 'Sovereign Compliance', unit: '%', higherIsBetter: true },
  emissionsVsTarget: { label: 'Emissions vs Target', unit: '%', higherIsBetter: true },
  coolingEfficiencyIndex: { label: 'Cooling Efficiency', unit: '%', higherIsBetter: true },
  networkIntegrityScore: { label: 'Network Integrity', unit: '%', higherIsBetter: true },
  environmentalSafetyScore: { label: 'Environmental Safety', unit: '%', higherIsBetter: true },
  avgUpsRuntime: { label: 'Avg UPS Runtime', unit: 'min', higherIsBetter: true },
};

// Generate RCA markdown based on events
function generateRCA(events: SimulationEvent[], scenario: ScenarioDefinition | null): string {
  if (!scenario || events.length === 0) {
    return 'No significant events occurred during this simulation.';
  }

  const criticalEvents = events.filter(e => e.severity === 'critical' || e.severity === 'high');
  const warningEvents = events.filter(e => e.severity === 'medium');
  
  const domainCounts: Record<string, number> = {};
  events.forEach(e => {
    domainCounts[e.domain] = (domainCounts[e.domain] || 0) + 1;
  });

  const primaryDomain = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'system';

  let rca = `## Analysis: ${scenario.name}\n\n`;
  
  rca += `The simulation triggered **${events.length} total events** across the data centre infrastructure:\n`;
  rca += `- **${criticalEvents.length}** critical alerts\n`;
  rca += `- **${warningEvents.length}** warnings\n`;
  rca += `- **${events.length - criticalEvents.length - warningEvents.length}** informational events\n\n`;

  rca += `### Primary Impact Zone: ${primaryDomain.charAt(0).toUpperCase() + primaryDomain.slice(1)}\n\n`;

  if (criticalEvents.length > 0) {
    rca += `### Critical Events\n`;
    criticalEvents.slice(0, 3).forEach(event => {
      rca += `- **${event.title}** (T+${event.timestamp}s): ${event.description}\n`;
    });
    rca += '\n';
  }

  // Domain-specific RCA
  const domainRCA: Record<string, string> = {
    thermal: 'Thermal instability was detected, likely caused by cooling system degradation or increased compute load. Hot aisle containment may have been compromised.',
    power: 'Power distribution anomalies were observed, potentially from UPS load imbalances or PDU capacity constraints.',
    cooling: 'Cooling efficiency dropped below optimal thresholds. CRAH units may require maintenance or chiller capacity adjustment.',
    network: 'Network integrity issues were detected, possibly from switch failures, port saturation, or routing instabilities.',
    workload: 'GPU workload imbalances were identified. Job scheduling may need optimization to prevent hotspots.',
    sovereignty: 'Data sovereignty compliance issues emerged. Cross-border data flows may have violated residency policies.',
    financial: 'Cost and carbon metrics deviated from targets. Energy pricing or renewable mix changes may be contributing factors.',
    facility: 'Facility safety conditions were impacted. Environmental sensors detected anomalous readings.',
  };

  if (domainRCA[primaryDomain]) {
    rca += `### Root Cause Hypothesis\n${domainRCA[primaryDomain]}\n\n`;
  }

  return rca;
}

// Generate recommendations markdown
function generateRecommendations(
  events: SimulationEvent[], 
  kpiDeltas: SimulationKpiDelta[],
  scenario: ScenarioDefinition | null
): string {
  const degradedKpis = kpiDeltas.filter(d => !d.isGood);
  const recommendations: string[] = [];

  // Domain-specific recommendations
  const domainRecommendations: Record<string, string[]> = {
    thermal: [
      'Increase cold aisle airflow by 15% in affected zones',
      'Schedule preventive maintenance on CRAH units',
      'Consider liquid cooling upgrades for high-density racks',
    ],
    power: [
      'Rebalance UPS loads across redundant paths',
      'Test generator failover sequence',
      'Review PDU capacity planning for affected rows',
    ],
    cooling: [
      'Adjust chiller setpoints to optimize COP',
      'Inspect and clean heat exchangers',
      'Verify refrigerant levels and pressure',
    ],
    network: [
      'Enable redundant uplinks on affected switches',
      'Review BGP peering configurations',
      'Implement traffic shaping during peak loads',
    ],
    workload: [
      'Redistribute training jobs across GPU clusters',
      'Implement preemption policies for lower-priority workloads',
      'Review SLA tier assignments for affected tenants',
    ],
    sovereignty: [
      'Audit data flow policies for cross-border transfers',
      'Enable geo-fencing on sensitive workloads',
      'Review tenant jurisdiction requirements',
    ],
    financial: [
      'Negotiate power purchase agreements for peak periods',
      'Increase renewable energy credits procurement',
      'Optimize carbon offset strategy',
    ],
    facility: [
      'Calibrate environmental sensors',
      'Review fire suppression system readiness',
      'Update emergency response procedures',
    ],
  };

  // Add recommendations based on events
  const domains = [...new Set(events.map(e => e.domain))];
  domains.forEach(domain => {
    const recs = domainRecommendations[domain];
    if (recs) {
      recommendations.push(...recs.slice(0, 2));
    }
  });

  // Add recommendations based on degraded KPIs
  degradedKpis.slice(0, 3).forEach(kpi => {
    if (kpi.id.includes('thermal') || kpi.id.includes('Thermal')) {
      recommendations.push('Prioritize thermal optimization in affected zones');
    }
    if (kpi.id.includes('pue') || kpi.id.includes('PUE')) {
      recommendations.push('Review power distribution efficiency');
    }
    if (kpi.id.includes('gpu') || kpi.id.includes('GPU')) {
      recommendations.push('Optimize GPU workload scheduling');
    }
  });

  // Deduplicate and format
  const uniqueRecs = [...new Set(recommendations)].slice(0, 6);
  
  let markdown = `## Recommended Actions\n\n`;
  markdown += `Based on the simulation results, consider the following mitigation steps:\n\n`;
  
  uniqueRecs.forEach((rec, i) => {
    markdown += `${i + 1}. ${rec}\n`;
  });

  markdown += `\n### Next Steps\n`;
  markdown += `- Schedule a review meeting with operations team\n`;
  markdown += `- Create runbook entries for observed failure modes\n`;
  markdown += `- Consider automated remediation for high-frequency events\n`;

  return markdown;
}

// Generate rack metrics with scenario-based variations
export function generateRackMetrics(
  baseRacks: RackMetrics[],
  events: SimulationEvent[],
  currentTime: number
): RackMetrics[] {
  const thermalEvents = events.filter(e => e.domain === 'thermal_hardware' || e.domain === 'cooling');
  const hasHotEvent = thermalEvents.some(e => e.severity === 'critical' || e.severity === 'high' || e.severity === 'medium');
  
  return baseRacks.map((rack, i) => {
    let tempDelta = 0;
    let gpuDelta = 0;
    let powerDelta = 0;

    // Apply event-based variations
    if (hasHotEvent) {
      // Some racks get hotter during thermal events
      if (i % 3 === 0) {
        tempDelta = 5 + Math.sin(currentTime / 10) * 3;
      } else if (i % 5 === 0) {
        tempDelta = 3 + Math.sin(currentTime / 8) * 2;
      }
    }

    // Random fluctuations
    tempDelta += (Math.random() - 0.5) * 2;
    gpuDelta += (Math.random() - 0.5) * 10;
    powerDelta += (Math.random() - 0.5) * 1;

    return {
      ...rack,
      tempC: Math.max(18, Math.min(45, rack.tempC + tempDelta)),
      gpuUtilPct: Math.max(0, Math.min(100, rack.gpuUtilPct + gpuDelta)),
      powerKw: Math.max(1, Math.min(20, rack.powerKw + powerDelta)),
      alertLevel: rack.tempC + tempDelta > 35 ? 'critical' : rack.tempC + tempDelta > 30 ? 'warning' : 'normal',
    };
  });
}

// Main function to generate result summary
export function generateSimulationResult(
  scenario: ScenarioDefinition | null,
  events: SimulationEvent[],
  baselineKpis: Record<string, number>,
  finalKpis: Record<string, number>,
  durationSec: number
): SimulationResultSummary {
  // Generate KPI deltas
  const kpiDeltas: SimulationKpiDelta[] = Object.keys(baselineKpis)
    .filter(key => KPI_METADATA[key])
    .map(key => {
      const meta = KPI_METADATA[key];
      const before = baselineKpis[key];
      const after = finalKpis[key] ?? before;
      const delta = after - before;
      const isGood = meta.higherIsBetter ? delta >= 0 : delta <= 0;
      
      return {
        id: key,
        label: meta.label,
        unit: meta.unit,
        before,
        after,
        trend: Math.abs(delta) < 0.5 ? 'stable' : delta > 0 ? 'up' : 'down',
        isGood: Math.abs(delta) < 0.5 ? true : isGood,
      };
    });

  // Generate actual vs expected comparisons
  const actualVsExpected = kpiDeltas.slice(0, 4).map(kpi => {
    const expectedDelta = (Math.random() - 0.3) * 15;
    const actualDelta = ((kpi.after - kpi.before) / kpi.before) * 100;
    return {
      metric: kpi.label,
      expected: `${expectedDelta >= 0 ? '+' : ''}${expectedDelta.toFixed(0)}%`,
      actual: `${actualDelta >= 0 ? '+' : ''}${actualDelta.toFixed(1)}%`,
      withinRange: Math.abs(actualDelta - expectedDelta) < 10,
    };
  });

  return {
    durationSec,
    scenarioId: scenario?.id || 'unknown',
    scenarioName: scenario?.name || 'Custom Simulation',
    kpiDeltas,
    events,
    rcaMarkdown: generateRCA(events, scenario),
    recommendationsMarkdown: generateRecommendations(events, kpiDeltas, scenario),
    actualVsExpected,
  };
}
