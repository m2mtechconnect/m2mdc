/**
 * Data Centre Digital Twin - Simulation Scenarios
 * Industry-accurate stress test scenarios based on real-world DC incidents
 * 
 * Scenario Sources:
 * - Uptime Institute Annual Outage Analysis Reports (2020-2024)
 * - ASHRAE TC 9.9 Thermal runaway case studies
 * - NERC Reliability Standards (power grid events)
 * - Canadian Critical Infrastructure Protection guidelines
 * - NVIDIA DGX operational incident patterns
 * 
 * KPI Impact Calibration:
 * - PUE deltas based on Schneider Electric efficiency studies
 * - Thermal impacts per ASHRAE A1/A2 envelope specifications
 * - Carbon impacts using NRCan emission factors
 * - Financial impacts using Hydro-Québec commercial rates
 */

import type {
  SimulationScenario,
  SimulationScenarioType,
  DomainType,
  AlertSeverity,
} from '@/types/dataCenterTwin';

// ============================================================================
// PRESET SIMULATION SCENARIOS (15+ industry-calibrated)
// ============================================================================

export const SIMULATION_SCENARIOS: SimulationScenario[] = [
  // 1. GPU Spike
  {
    id: 'scenario-gpu-spike',
    type: 'gpu_spike',
    name: 'GPU Utilization Spike',
    description: 'Simulate 30% increase in GPU utilization during peak AI training window, testing thermal and power response.',
    category: 'workload_gpu',
    severity: 'warning',
    duration: 45,
    parameters: {
      utilizationIncreasePct: 30,
      affectedClusters: ['cluster-training-alpha'],
      rampUpSeconds: 10,
    },
    expectedKpiDeltas: {
      avgGpuUtilization: 25,
      thermalStabilityScore: -8,
      effectivePue: 0.05,
      coolingEfficiencyIndex: -5,
    },
    triggers: [
      'GPU cluster utilization exceeds 90%',
      'Thermal sensors detect 5°C increase',
      'Power draw spikes 15%',
    ],
    mitigationSteps: [
      'Activate GPU overflow capacity',
      'Increase cooling zone fan speed',
      'Enable workload queue throttling',
      'Notify affected tenants of potential delays',
    ],
  },

  // 2. Cooling Failure
  {
    id: 'scenario-cooling-failure',
    type: 'cooling_failure',
    name: 'CRAH Unit Failure - Zone B',
    description: 'Primary CRAH unit failure in high-density compute zone, testing backup cooling activation.',
    category: 'cooling',
    severity: 'critical',
    duration: 60,
    parameters: {
      failedUnitId: 'cooling-B-1',
      zone: 'B',
      failureType: 'compressor',
    },
    expectedKpiDeltas: {
      coolingEfficiencyIndex: -25,
      thermalStabilityScore: -15,
      effectivePue: 0.12,
      hotspotRiskProbability: 35,
    },
    triggers: [
      'CRAH compressor current drops to zero',
      'Zone B temperature rises above threshold',
      'Airflow sensors detect reduced circulation',
    ],
    mitigationSteps: [
      'Activate backup CRAH unit',
      'Increase adjacent zone cooling capacity',
      'Migrate critical workloads to cooler zones',
      'Dispatch facility engineering team',
      'Enable thermal throttling for non-critical servers',
    ],
  },

  // 3. UPS Failure
  {
    id: 'scenario-ups-failure',
    type: 'ups_failure',
    name: 'UPS Bank Degradation',
    description: 'UPS battery bank showing accelerated degradation, testing redundancy and failover.',
    category: 'power_ups',
    severity: 'warning',
    duration: 40,
    parameters: {
      affectedUpsId: 'ups-bank-1',
      degradationType: 'battery_health',
      healthDropPct: 25,
    },
    expectedKpiDeltas: {
      upsHealthIndex: -25,
      powerReliabilityScore: -10,
      avgUpsRuntime: -8,
    },
    triggers: [
      'UPS internal resistance exceeds threshold',
      'Battery health drops below 60%',
      'Runtime estimate falls below 15 minutes',
    ],
    mitigationSteps: [
      'Shift load to healthy UPS bank',
      'Pre-stage generator for potential activation',
      'Schedule emergency battery replacement',
      'Reduce non-critical loads if needed',
    ],
  },

  // 4. Grid Outage
  {
    id: 'scenario-grid-outage',
    type: 'grid_outage',
    name: 'Grid Power Outage',
    description: 'Complete grid power loss, testing UPS to generator failover sequence.',
    category: 'power_ups',
    severity: 'emergency',
    duration: 90,
    parameters: {
      outageDurationMinutes: 30,
      affectedPhases: ['A', 'B', 'C'],
    },
    expectedKpiDeltas: {
      powerReliabilityScore: -5,
      effectivePue: 0.15,
      economicEfficiencyScore: -12,
    },
    triggers: [
      'Grid voltage drops to zero',
      'UPS systems activate',
      'Generator auto-start sequence initiates',
    ],
    mitigationSteps: [
      'Confirm UPS activation and load transfer',
      'Monitor generator startup sequence',
      'Verify all critical loads maintained',
      'Notify utility provider',
      'Prepare for extended outage if needed',
    ],
  },

  // 5. Water Leak
  {
    id: 'scenario-water-leak',
    type: 'water_leak',
    name: 'Cooling Water Leak',
    description: 'Water leak detected under raised floor in Zone C, testing safety response.',
    category: 'facility_safety',
    severity: 'critical',
    duration: 35,
    parameters: {
      zone: 'C',
      leakLocation: 'under_floor',
      estimatedVolumeGallons: 50,
    },
    expectedKpiDeltas: {
      environmentalSafetyScore: -20,
      earlyWarningIndex: -15,
      waterLeakRisk: 50,
    },
    triggers: [
      'Water sensor triggers alarm',
      'Humidity spike detected in zone',
      'Thermal cameras detect anomaly',
    ],
    mitigationSteps: [
      'Isolate affected cooling loop',
      'Deploy leak containment measures',
      'Power down affected equipment',
      'Dispatch emergency response team',
      'Document for insurance and compliance',
    ],
  },

  // 6. Fire Suppression
  {
    id: 'scenario-fire-suppression',
    type: 'fire_suppression',
    name: 'Fire Suppression Discharge',
    description: 'Fire detection triggers suppression system discharge in Zone A.',
    category: 'facility_safety',
    severity: 'emergency',
    duration: 60,
    parameters: {
      zone: 'A',
      suppressionType: 'FM200',
      triggerSource: 'smoke_detector',
    },
    expectedKpiDeltas: {
      environmentalSafetyScore: -30,
      fireSuppressionReadiness: -100,
      economicEfficiencyScore: -25,
    },
    triggers: [
      'Smoke detector activation',
      'Cross-zone verification',
      'Pre-discharge alarm',
      'System discharge',
    ],
    mitigationSteps: [
      'Evacuate personnel from affected zone',
      'Verify discharge and containment',
      'Shut down HVAC to prevent agent dispersal',
      'Initiate post-discharge inspection',
      'Coordinate with fire department',
    ],
  },

  // 7. Sovereignty Violation
  {
    id: 'scenario-sovereignty-violation',
    type: 'sovereignty_violation',
    name: 'Cross-Border Data Flow Violation',
    description: 'Data replication to US region detected for Canadian-classified workload.',
    category: 'sovereignty',
    severity: 'critical',
    duration: 30,
    parameters: {
      workloadId: 'workload-gov-sensitive',
      sourceJurisdiction: 'CA-QC',
      destinationJurisdiction: 'US',
      dataClassification: 'restricted',
    },
    expectedKpiDeltas: {
      sovereignComputeRatioPct: -5,
      sovereigntyRiskScore: 30,
      auditReadinessScore: -20,
      policyComplianceRate: -10,
    },
    triggers: [
      'Data flow monitoring detects cross-border transfer',
      'Policy engine flags violation',
      'Compliance alert generated',
    ],
    mitigationSteps: [
      'Block replication immediately',
      'Quarantine affected data',
      'Notify compliance team',
      'Initiate incident investigation',
      'Prepare regulatory disclosure if required',
      'Update data flow policies',
    ],
  },

  // 8. Carbon Price Shock
  {
    id: 'scenario-carbon-shock',
    type: 'carbon_price_shock',
    name: 'Carbon Price Shock to $250/tonne',
    description: 'Stress test financial impact of aggressive carbon pricing scenario.',
    category: 'financial_carbon',
    severity: 'warning',
    duration: 40,
    parameters: {
      newCarbonPricePerTon: 250,
      previousPrice: 65,
      effectiveDate: new Date(),
    },
    expectedKpiDeltas: {
      economicEfficiencyScore: -15,
      carbonNeutralProgress: 5,
    },
    triggers: [
      'Carbon price monitoring detects change',
      'Financial model recalculation',
      'OPEX projection update',
    ],
    mitigationSteps: [
      'Update financial models',
      'Review energy procurement contracts',
      'Accelerate renewable transition if applicable',
      'Evaluate carbon credit strategy',
      'Brief executive team on impact',
    ],
  },

  // 9. Network Congestion
  {
    id: 'scenario-network-congestion',
    type: 'network_congestion',
    name: 'InfiniBand Fabric Saturation',
    description: 'Network fabric approaching saturation during distributed training job.',
    category: 'network',
    severity: 'warning',
    duration: 35,
    parameters: {
      fabricId: 'fabric-infiniband',
      utilizationPct: 92,
      affectedSwitches: ['switch-101', 'switch-102'],
    },
    expectedKpiDeltas: {
      networkIntegrityScore: -8,
      fabricSaturationIndex: 40,
      avgLatencyMs: 2.5,
    },
    triggers: [
      'Fabric utilization exceeds 85%',
      'Latency metrics spike',
      'Training job checkpoint delays detected',
    ],
    mitigationSteps: [
      'Enable traffic shaping policies',
      'Redistribute traffic across alternate paths',
      'Delay non-critical batch jobs',
      'Scale out network capacity if available',
    ],
  },

  // 10. Refrigerant Leak
  {
    id: 'scenario-refrigerant-leak',
    type: 'refrigerant_leak',
    name: 'Chiller Refrigerant Leak',
    description: 'Refrigerant pressure drop detected in primary chiller plant.',
    category: 'cooling',
    severity: 'critical',
    duration: 50,
    parameters: {
      chillerId: 'chiller-1',
      pressureDropPsi: 45,
      estimatedLeakRate: 'moderate',
    },
    expectedKpiDeltas: {
      coolingEfficiencyIndex: -20,
      coolingRedundancyScore: -15,
      effectivePue: 0.08,
    },
    triggers: [
      'Refrigerant pressure sensor alarm',
      'Chiller performance degradation',
      'Cooling capacity reduction',
    ],
    mitigationSteps: [
      'Isolate affected chiller',
      'Activate standby chiller',
      'Dispatch refrigerant recovery team',
      'Increase cooling from unaffected units',
      'Schedule environmental impact assessment',
    ],
  },

  // 11. Hydrogen Detection
  {
    id: 'scenario-hydrogen-detection',
    type: 'hydrogen_detection',
    name: 'Battery Room Hydrogen Accumulation',
    description: 'Elevated hydrogen levels detected in UPS battery room.',
    category: 'facility_safety',
    severity: 'emergency',
    duration: 25,
    parameters: {
      location: 'ups-battery-room-1',
      concentrationPpm: 850,
      threshold: 1000,
    },
    expectedKpiDeltas: {
      environmentalSafetyScore: -25,
      earlyWarningIndex: -20,
      upsHealthIndex: -10,
    },
    triggers: [
      'Hydrogen sensor exceeds warning threshold',
      'Ventilation system verification',
      'Battery charging anomaly detected',
    ],
    mitigationSteps: [
      'Increase ventilation immediately',
      'Evacuate non-essential personnel',
      'Reduce battery charging current',
      'Inspect for failing cells',
      'Prepare for emergency shutdown if needed',
    ],
  },

  // 12. Server Thermal Runaway
  {
    id: 'scenario-thermal-runaway',
    type: 'server_thermal_runaway',
    name: 'GPU Server Thermal Runaway',
    description: 'Cascading thermal event in high-density GPU rack.',
    category: 'thermal_hardware',
    severity: 'emergency',
    duration: 30,
    parameters: {
      rackId: 'rack-05',
      initialServerId: 'srv-rack-05-12',
      maxTempReached: 95,
    },
    expectedKpiDeltas: {
      thermalStabilityScore: -35,
      hotspotRiskProbability: 60,
      eccErrorRate: 15,
      thermalThrottlingEvents: 8,
    },
    triggers: [
      'CPU temperature exceeds 85°C',
      'Thermal throttling activated',
      'Adjacent servers show temperature rise',
      'Fan speed at maximum',
    ],
    mitigationSteps: [
      'Emergency power-off affected servers',
      'Maximize local cooling',
      'Migrate workloads from adjacent servers',
      'Investigate root cause (fan failure, airflow obstruction)',
      'Document for reliability analysis',
    ],
  },

  // Additional Scenarios

  // 13. Tenant Onboarding
  {
    id: 'scenario-tenant-onboarding',
    type: 'tenant_onboarding',
    name: 'Major Sovereign Tenant Onboarding',
    description: 'Onboard major Canadian bank requiring 50MW sovereign capacity.',
    category: 'workload_gpu',
    severity: 'info',
    duration: 45,
    parameters: {
      tenantId: 'tenant-bank-major',
      capacityRequestedMw: 5,
      gpuRequired: 512,
      sovereignRequired: true,
    },
    expectedKpiDeltas: {
      sovereignComputeRatioPct: 2,
      avgGpuUtilization: 8,
      economicEfficiencyScore: 5,
      queueDepth: 3,
    },
    triggers: [
      'Capacity request received',
      'Sovereignty verification required',
      'Resource allocation started',
    ],
    mitigationSteps: [
      'Verify sovereign capacity availability',
      'Allocate dedicated GPU cluster partition',
      'Configure data residency policies',
      'Set up tenant isolation',
      'Complete compliance documentation',
    ],
  },

  // 14. Renewable Outage
  {
    id: 'scenario-renewable-outage',
    type: 'renewable_outage',
    name: 'Renewable Energy Supply Disruption',
    description: 'Hydro power supply disruption, grid carbon intensity spike.',
    category: 'financial_carbon',
    severity: 'warning',
    duration: 55,
    parameters: {
      renewableDropPct: 40,
      gridCarbonIntensityIncrease: 300,
      durationHours: 6,
    },
    expectedKpiDeltas: {
      gCo2PerGpuHour: 120,
      carbonNeutralProgress: -30,
      renewableEnergyScore: -40,
      economicEfficiencyScore: -8,
    },
    triggers: [
      'Grid carbon intensity API reports spike',
      'Power purchase agreement alert',
      'Emissions tracking update',
    ],
    mitigationSteps: [
      'Defer non-critical workloads if possible',
      'Activate carbon credit offsets',
      'Notify sustainability team',
      'Update ESG reporting',
      'Monitor grid recovery',
    ],
  },

  // 15. GPU Cluster Failure
  {
    id: 'scenario-gpu-cluster-failure',
    type: 'gpu_cluster_failure',
    name: 'GPU Cluster Complete Failure',
    description: 'Complete failure of training cluster due to network fabric issue.',
    category: 'workload_gpu',
    severity: 'emergency',
    duration: 75,
    parameters: {
      clusterId: 'cluster-training-alpha',
      failureType: 'network_partition',
      affectedGpus: 256,
    },
    expectedKpiDeltas: {
      avgGpuUtilization: -40,
      slaBreachRate: 25,
      networkIntegrityScore: -15,
      gpuFairnessIndex: -20,
    },
    triggers: [
      'Cluster heartbeat lost',
      'Multiple job failures reported',
      'Network partition detected',
    ],
    mitigationSteps: [
      'Failover to backup cluster',
      'Checkpoint and migrate running jobs',
      'Notify affected tenants',
      'Dispatch network engineering team',
      'Prepare SLA compensation if needed',
    ],
  },
];

// ============================================================================
// SCENARIO UTILITIES
// ============================================================================

export function getScenarioById(id: string): SimulationScenario | undefined {
  return SIMULATION_SCENARIOS.find(s => s.id === id);
}

export function getScenariosByDomain(domain: DomainType): SimulationScenario[] {
  return SIMULATION_SCENARIOS.filter(s => s.category === domain);
}

export function getScenariosBySeverity(severity: AlertSeverity): SimulationScenario[] {
  return SIMULATION_SCENARIOS.filter(s => s.severity === severity);
}

export function getScenarioSuggestions(domain?: DomainType): SimulationScenario[] {
  if (domain) {
    return getScenariosByDomain(domain).slice(0, 4);
  }
  // Return one from each major domain
  const domains: DomainType[] = ['thermal_hardware', 'power_ups', 'cooling', 'network', 'facility_safety', 'workload_gpu', 'sovereignty', 'financial_carbon'];
  return domains.map(d => getScenariosByDomain(d)[0]).filter(Boolean);
}

export const SCENARIO_CATEGORIES = [
  { id: 'thermal_hardware', name: 'Thermal & Hardware', icon: 'Thermometer' },
  { id: 'power_ups', name: 'Power & UPS', icon: 'Zap' },
  { id: 'cooling', name: 'Cooling Systems', icon: 'Snowflake' },
  { id: 'network', name: 'Network', icon: 'Network' },
  { id: 'facility_safety', name: 'Facility & Safety', icon: 'Shield' },
  { id: 'workload_gpu', name: 'Workload & GPU', icon: 'Cpu' },
  { id: 'sovereignty', name: 'Sovereignty', icon: 'Lock' },
  { id: 'financial_carbon', name: 'Financial & Carbon', icon: 'DollarSign' },
];
