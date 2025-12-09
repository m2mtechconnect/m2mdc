/**
 * Data Centre Digital Twin - Complete Type Definitions
 * 5 Domain Twins: Thermal/Hardware, Power/UPS, Cooling, Network, Facility/Safety
 * Plus: Workload/GPU, Sovereignty, Financial/Carbon
 */

// ============================================================================
// CORE ENUMS & COMMON TYPES
// ============================================================================

export type DomainType = 
  | 'thermal_hardware'
  | 'power_ups'
  | 'cooling'
  | 'network'
  | 'facility_safety'
  | 'workload_gpu'
  | 'sovereignty'
  | 'financial_carbon';

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';
export type SensorStatus = 'normal' | 'warning' | 'critical' | 'offline' | 'maintenance';
export type RedundancyLevel = 'N' | 'N+1' | '2N' | '2N+1';

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
}

export interface SensorReading<T = number> {
  sensorId: string;
  name: string;
  value: T;
  unit: string;
  status: SensorStatus;
  timestamp: Date;
  threshold?: { warning: number; critical: number };
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  domain: DomainType;
  message: string;
  source: string;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
}

// ============================================================================
// DOMAIN 1: THERMAL & HARDWARE TWIN
// ============================================================================

export interface ThermalSensor {
  id: string;
  rackId: string;
  serverId: string;
  type: 'cpu' | 'gpu' | 'dimm' | 'vrm' | 'ambient' | 'exhaust';
  tempC: number;
  maxTempC: number;
  status: SensorStatus;
}

export interface ServerHardware {
  id: string;
  rackId: string;
  position: number; // U position in rack
  model: string;
  cpuTempC: number;
  gpuTempC?: number;
  dimmTempC: number;
  vrmTempC: number;
  fanRpm: number[];
  powerDrawW: number;
  eccErrorCount: number;
  diskHealth: number; // 0-100%
  smartMetrics: {
    reallocatedSectors: number;
    powerOnHours: number;
    temperature: number;
    remainingLife: number;
  };
  thermalThrottling: boolean;
  airflowVelocityMps: number;
}

export interface RackThermal {
  id: string;
  name: string;
  zone: string;
  servers: ServerHardware[];
  inletTempC: number;
  outletTempC: number;
  deltaT: number;
  powerDrawKw: number;
  hotspotRisk: number; // 0-100
}

export interface ThermalHardwareTwin {
  racks: RackThermal[];
  sensors: ThermalSensor[];
  kpis: {
    thermalStabilityScore: number; // 0-100
    hotspotRiskProbability: number; // 0-100
    coolingImpactPerRack: Record<string, number>;
    avgServerTemp: number;
    maxServerTemp: number;
    eccErrorRate: number;
    thermalThrottlingEvents: number;
  };
}

// ============================================================================
// DOMAIN 2: POWER & UPS TWIN
// ============================================================================

export interface PDUOutlet {
  id: string;
  pduId: string;
  outlet: number;
  powerW: number;
  currentA: number;
  voltageV: number;
  powerFactor: number;
  status: SensorStatus;
}

export interface PDU {
  id: string;
  rackId: string;
  name: string;
  model: string;
  outlets: PDUOutlet[];
  totalPowerKw: number;
  maxCapacityKw: number;
  utilizationPct: number;
}

export interface Busway {
  id: string;
  name: string;
  currentA: number;
  voltageV: number;
  powerKw: number;
  maxCapacityKw: number;
  utilizationPct: number;
  status: SensorStatus;
}

export interface UPSBank {
  id: string;
  name: string;
  model: string;
  capacityKva: number;
  loadPct: number;
  batteryHealthPct: number;
  batteryCycles: number;
  internalResistanceOhms: number;
  runtimeMinutes: number;
  status: SensorStatus;
  lastTestDate: Date;
  inputVoltageV: number;
  outputVoltageV: number;
  frequency: number;
  efficiency: number;
}

export interface Generator {
  id: string;
  name: string;
  capacityKw: number;
  fuelLevelPct: number;
  runtimeHours: number;
  failoverState: 'standby' | 'running' | 'cooldown' | 'maintenance';
  lastTestDate: Date;
  status: SensorStatus;
}

export interface PowerUpsTwin {
  pdus: PDU[];
  busways: Busway[];
  upsBanks: UPSBank[];
  generators: Generator[];
  gridConnection: {
    status: 'stable' | 'fluctuating' | 'outage';
    voltageV: number;
    frequencyHz: number;
    powerFactorPct: number;
  };
  kpis: {
    powerReliabilityScore: number; // 0-100
    upsHealthIndex: number; // 0-100
    redundancyLevel: RedundancyLevel;
    totalPowerDrawMw: number;
    powerCapacityMw: number;
    utilizationPct: number;
    avgUpsRuntime: number;
    generatorReadiness: number;
  };
}

// ============================================================================
// DOMAIN 3: COOLING SYSTEM TWIN (CRAC/CRAH)
// ============================================================================

export interface CoolingUnit {
  id: string;
  name: string;
  type: 'CRAC' | 'CRAH' | 'InRow' | 'RearDoor' | 'LiquidCooling';
  zone: string;
  supplyAirTempC: number;
  returnAirTempC: number;
  deltaT: number;
  humidityPct: number;
  refrigerantPressurePsi: number;
  compressorCurrentA: number;
  coolingCoilDeltaT: number;
  damperPositionPct: number;
  fanSpeedRpm: number;
  fanAmps: number;
  capacityKw: number;
  utilizationPct: number;
  status: SensorStatus;
}

export interface CoolingZoneDetail {
  id: string;
  name: string;
  units: CoolingUnit[];
  ambientTempC: number;
  targetTempC: number;
  humidityPct: number;
  targetHumidityPct: number;
  airflowCfm: number;
  pueContribution: number;
  status: SensorStatus;
}

export interface CoolingTwin {
  zones: CoolingZoneDetail[];
  units: CoolingUnit[];
  chillerPlant: {
    chillers: {
      id: string;
      name: string;
      capacityTons: number;
      loadPct: number;
      supplyTempC: number;
      returnTempC: number;
      status: SensorStatus;
    }[];
    coolingTowers: {
      id: string;
      name: string;
      wetBulbTempC: number;
      approachTempC: number;
      fanSpeedPct: number;
      status: SensorStatus;
    }[];
  };
  kpis: {
    coolingEfficiencyIndex: number; // 0-100
    coolingCostPerKw: number;
    coolingRedundancyScore: number; // 0-100
    avgSupplyTemp: number;
    avgReturnTemp: number;
    totalCoolingCapacityKw: number;
    activeCoolingLoadKw: number;
    pueFromCooling: number;
  };
}

// ============================================================================
// DOMAIN 4: NETWORK TWIN
// ============================================================================

export interface NetworkPort {
  id: string;
  switchId: string;
  portNumber: number;
  speed: '1G' | '10G' | '25G' | '40G' | '100G' | '400G';
  utilizationPct: number;
  packetErrors: number;
  crcErrors: number;
  linkFlaps: number;
  status: 'up' | 'down' | 'disabled';
}

export interface NetworkSwitch {
  id: string;
  name: string;
  type: 'ToR' | 'Spine' | 'Leaf' | 'Core' | 'Border';
  model: string;
  ports: NetworkPort[];
  cpuUtilization: number;
  memoryUtilization: number;
  temperature: number;
  uptime: number;
  status: SensorStatus;
}

export interface NetworkFabric {
  id: string;
  name: string;
  type: 'Ethernet' | 'InfiniBand' | 'RoCE';
  switches: NetworkSwitch[];
  latencyMs: number;
  jitterMs: number;
  throughputGbps: number;
  maxThroughputGbps: number;
}

export interface Firewall {
  id: string;
  name: string;
  throughputGbps: number;
  maxThroughputGbps: number;
  connectionsPerSec: number;
  activeSessions: number;
  cpuUtilization: number;
  status: SensorStatus;
}

export interface NetworkTwin {
  fabrics: NetworkFabric[];
  switches: NetworkSwitch[];
  firewalls: Firewall[];
  kpis: {
    networkIntegrityScore: number; // 0-100
    fabricSaturationIndex: number; // 0-100
    avgLatencyMs: number;
    maxLatencyMs: number;
    totalThroughputGbps: number;
    packetLossRate: number;
    portUtilizationAvg: number;
    linkFlapRate: number;
  };
}

// ============================================================================
// DOMAIN 5: FACILITY & SAFETY TWIN
// ============================================================================

export interface EnvironmentalZone {
  id: string;
  name: string;
  type: 'server_hall' | 'electrical' | 'mechanical' | 'office' | 'loading';
  tempC: number;
  humidityPct: number;
  pm25: number;
  pm10: number;
  status: SensorStatus;
}

export interface SafetySensor {
  id: string;
  type: 'hydrogen' | 'smoke' | 'water_leak' | 'motion' | 'door' | 'vibration';
  zone: string;
  value: number;
  threshold: number;
  triggered: boolean;
  lastTriggered?: Date;
  status: SensorStatus;
}

export interface FireSuppressionSystem {
  id: string;
  zone: string;
  type: 'FM200' | 'Novec' | 'Inergen' | 'PreAction' | 'DryPipe';
  tankPressurePsi: number;
  targetPressurePsi: number;
  status: 'armed' | 'discharged' | 'disabled' | 'maintenance';
  lastInspection: Date;
  nextInspection: Date;
}

export interface FacilitySafetyTwin {
  environmentalZones: EnvironmentalZone[];
  safetySensors: SafetySensor[];
  fireSuppressionSystems: FireSuppressionSystem[];
  accessControl: {
    activePersonnel: number;
    recentAccess: { userId: string; zone: string; timestamp: Date; action: 'entry' | 'exit' }[];
  };
  kpis: {
    environmentalSafetyScore: number; // 0-100
    earlyWarningIndex: number; // 0-100
    avgAmbientTemp: number;
    avgHumidity: number;
    airQualityIndex: number;
    waterLeakRisk: number;
    fireSuppressionReadiness: number;
  };
}

// ============================================================================
// DOMAIN 6: WORKLOAD & GPU SCHEDULER TWIN
// ============================================================================

export type GpuModel = 'H100' | 'H200' | 'A100' | 'L40S' | 'MI300X' | 'Gaudi3';

export interface GpuNode {
  id: string;
  clusterId: string;
  hostname: string;
  gpuModel: GpuModel;
  gpuCount: number;
  gpuUtilizationPct: number[];
  gpuMemoryUsedGb: number[];
  gpuMemoryTotalGb: number;
  gpuTempC: number[];
  gpuPowerW: number[];
  nvlinkBandwidthGbps?: number;
  status: SensorStatus;
}

export interface GpuClusterDetail {
  id: string;
  name: string;
  region: string;
  nodes: GpuNode[];
  totalGpus: number;
  activeGpus: number;
  avgUtilization: number;
  workloadType: 'training' | 'inference' | 'mixed';
  scheduler: 'slurm' | 'kubernetes' | 'custom';
  isSovereign: boolean;
}

export interface WorkloadJob {
  id: string;
  name: string;
  userId: string;
  tenantId: string;
  clusterId: string;
  type: 'training' | 'fine_tuning' | 'inference' | 'batch';
  gpusRequested: number;
  gpusAllocated: number;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  queueTimeMinutes: number;
  runTimeMinutes: number;
  estimatedCompletionTime?: Date;
  priority: 'low' | 'normal' | 'high' | 'critical';
  slaBreached: boolean;
}

export interface WorkloadGpuTwin {
  clusters: GpuClusterDetail[];
  activeJobs: WorkloadJob[];
  queuedJobs: WorkloadJob[];
  kpis: {
    totalGpuCount: number;
    activeGpuCount: number;
    avgGpuUtilization: number;
    queueDepth: number;
    avgQueueTimeMinutes: number;
    slaBreachRate: number;
    gpuFairnessIndex: number; // 0-100, measures fair allocation across tenants
    costPerGpuHour: number;
    trainingThroughput: number; // tokens/sec or similar
    inferenceThroughput: number; // requests/sec
  };
}

// ============================================================================
// DOMAIN 7: SOVEREIGNTY & COMPLIANCE TWIN
// ============================================================================

export type Jurisdiction = 'CA-QC' | 'CA-ON' | 'CA-AB' | 'CA-BC' | 'US' | 'EU' | 'UK' | 'other';

export interface DataFlow {
  id: string;
  workloadId: string;
  sourceJurisdiction: Jurisdiction;
  destinationJurisdiction: Jurisdiction;
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  dataVolumeGb: number;
  isSovereign: boolean;
  flowType: 'training' | 'inference' | 'backup' | 'replication' | 'logging';
  timestamp: Date;
  complianceStatus: 'compliant' | 'violation' | 'pending_review';
}

export interface CompliancePolicy {
  id: string;
  name: string;
  type: 'data_residency' | 'access_control' | 'encryption' | 'audit' | 'retention';
  jurisdiction: Jurisdiction[];
  enabled: boolean;
  lastAudit: Date;
  violations: number;
}

export interface SovereigntyTwin {
  dataFlows: DataFlow[];
  policies: CompliancePolicy[];
  jurisdictionMapping: Record<string, Jurisdiction>;
  kpis: {
    sovereignComputeRatioPct: number;
    sovereigntyRiskScore: number; // 0-100, lower is better
    dataFlowViolations: number;
    policyComplianceRate: number;
    auditReadinessScore: number;
    crossBorderTransfers: number;
    encryptionCoverage: number;
  };
}

// ============================================================================
// DOMAIN 8: FINANCIAL & CARBON TWIN
// ============================================================================

export interface CarbonMetrics {
  scope1Emissions: number; // tonnes CO2e - direct emissions
  scope2Emissions: number; // tonnes CO2e - purchased energy
  scope3Emissions: number; // tonnes CO2e - supply chain
  carbonIntensityKgPerMwh: number;
  gCo2PerGpuHour: number;
  renewableEnergyPct: number;
  carbonCreditsOwned: number;
  carbonCreditsUsed: number;
}

export interface EnergyMixDetail {
  renewable: number;
  naturalGas: number;
  nuclear: number;
  coal: number;
  other: number;
  gridCarbonIntensity: number;
}

export interface FinancialMetrics {
  capexTotal: number;
  opexMonthly: number;
  revenueMonthly: number;
  costPerMwh: number;
  carbonCostExposure: number;
  npvGreenBuild: number;
  npvGasBuild: number;
  irrPct: number;
  paybackYears: number;
  marginPct: number;
}

export interface CarbonScenarioDetail {
  id: string;
  name: string;
  carbonPricePerTon: number;
  renewableDropPct?: number;
  projectedOpexDelta: number;
  projectedEmissionsDelta: number;
  description: string;
}

export interface FinancialCarbonTwin {
  carbonMetrics: CarbonMetrics;
  energyMix: EnergyMixDetail;
  financialMetrics: FinancialMetrics;
  scenarios: CarbonScenarioDetail[];
  carbonPriceHistory: TimeSeriesPoint[];
  emissionsHistory: TimeSeriesPoint[];
  kpis: {
    effectivePue: number;
    dcie: number; // Data Center Infrastructure Efficiency
    wue: number; // Water Usage Effectiveness
    cue: number; // Carbon Usage Effectiveness
    economicEfficiencyScore: number;
    carbonNeutralProgress: number; // 0-100%
    renewableEnergyScore: number;
  };
}

// ============================================================================
// SIMULATION SCENARIOS
// ============================================================================

export type SimulationScenarioType =
  | 'gpu_spike'
  | 'cooling_failure'
  | 'ups_failure'
  | 'grid_outage'
  | 'water_leak'
  | 'fire_suppression'
  | 'sovereignty_violation'
  | 'carbon_price_shock'
  | 'network_congestion'
  | 'refrigerant_leak'
  | 'hydrogen_detection'
  | 'server_thermal_runaway'
  | 'tenant_onboarding'
  | 'renewable_outage'
  | 'gpu_cluster_failure'
  | 'custom';

export interface SimulationScenario {
  id: string;
  type: SimulationScenarioType;
  name: string;
  description: string;
  category: DomainType;
  severity: AlertSeverity;
  duration: number; // seconds
  parameters: Record<string, any>;
  expectedKpiDeltas: Record<string, number>;
  triggers: string[];
  mitigationSteps: string[];
}

export interface SimulationEvent {
  id: string;
  scenarioId: string;
  timestamp: Date;
  eventType: 'start' | 'milestone' | 'alert' | 'mitigation' | 'recovery' | 'end';
  message: string;
  kpiSnapshot: Record<string, number>;
}

export interface SimulationRun {
  id: string;
  facilityId: string;
  scenarioId: string;
  name: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  currentTime: Date;
  timeMultiplier: number;
  events: SimulationEvent[];
  kpiDeltas: Record<string, number>;
  recommendations: string[];
  playbookGenerated?: string;
}

// ============================================================================
// COMPLETE DATA CENTRE FACILITY
// ============================================================================

export interface DataCentreFacility {
  id: string;
  name: string;
  region: Jurisdiction;
  description: string;
  tier: 1 | 2 | 3 | 4;
  totalCapacityMw: number;
  currentLoadMw: number;
  
  // Domain Twins
  thermalHardware: ThermalHardwareTwin;
  powerUps: PowerUpsTwin;
  cooling: CoolingTwin;
  network: NetworkTwin;
  facilitySafety: FacilitySafetyTwin;
  workloadGpu: WorkloadGpuTwin;
  sovereignty: SovereigntyTwin;
  financialCarbon: FinancialCarbonTwin;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// KPI DEFINITIONS
// ============================================================================

export interface KPIDefinition {
  key: string;
  name: string;
  domain: DomainType;
  unit: string;
  direction: 'higher' | 'lower';
  target: number;
  warningThreshold: number;
  criticalThreshold: number;
  description: string;
}

export const DATA_CENTRE_KPI_DEFINITIONS: KPIDefinition[] = [
  // Thermal & Hardware
  { key: 'thermalStabilityScore', name: 'Thermal Stability', domain: 'thermal_hardware', unit: 'pts', direction: 'higher', target: 90, warningThreshold: 70, criticalThreshold: 50, description: 'Overall thermal management effectiveness' },
  { key: 'hotspotRiskProbability', name: 'Hotspot Risk', domain: 'thermal_hardware', unit: '%', direction: 'lower', target: 5, warningThreshold: 15, criticalThreshold: 30, description: 'Probability of thermal hotspot occurrence' },
  { key: 'eccErrorRate', name: 'ECC Error Rate', domain: 'thermal_hardware', unit: '/hr', direction: 'lower', target: 0, warningThreshold: 5, criticalThreshold: 20, description: 'Memory error correction rate' },
  
  // Power & UPS
  { key: 'powerReliabilityScore', name: 'Power Reliability', domain: 'power_ups', unit: 'pts', direction: 'higher', target: 99, warningThreshold: 95, criticalThreshold: 90, description: 'Overall power system reliability' },
  { key: 'upsHealthIndex', name: 'UPS Health', domain: 'power_ups', unit: 'pts', direction: 'higher', target: 95, warningThreshold: 80, criticalThreshold: 60, description: 'UPS battery and system health' },
  { key: 'avgUpsRuntime', name: 'UPS Runtime', domain: 'power_ups', unit: 'min', direction: 'higher', target: 30, warningThreshold: 15, criticalThreshold: 10, description: 'Average UPS backup runtime' },
  
  // Cooling
  { key: 'coolingEfficiencyIndex', name: 'Cooling Efficiency', domain: 'cooling', unit: 'pts', direction: 'higher', target: 85, warningThreshold: 70, criticalThreshold: 55, description: 'CRAC/CRAH system efficiency' },
  { key: 'coolingCostPerKw', name: 'Cooling Cost', domain: 'cooling', unit: '$/kW', direction: 'lower', target: 0.05, warningThreshold: 0.08, criticalThreshold: 0.12, description: 'Operating cost per kW of cooling' },
  { key: 'pueFromCooling', name: 'PUE (Cooling)', domain: 'cooling', unit: '', direction: 'lower', target: 1.2, warningThreshold: 1.4, criticalThreshold: 1.6, description: 'PUE contribution from cooling' },
  
  // Network
  { key: 'networkIntegrityScore', name: 'Network Integrity', domain: 'network', unit: 'pts', direction: 'higher', target: 99, warningThreshold: 95, criticalThreshold: 90, description: 'Overall network health and reliability' },
  { key: 'fabricSaturationIndex', name: 'Fabric Saturation', domain: 'network', unit: '%', direction: 'lower', target: 40, warningThreshold: 70, criticalThreshold: 85, description: 'Network fabric utilization level' },
  { key: 'avgLatencyMs', name: 'Avg Latency', domain: 'network', unit: 'ms', direction: 'lower', target: 0.5, warningThreshold: 2, criticalThreshold: 5, description: 'Average network latency' },
  
  // Facility & Safety
  { key: 'environmentalSafetyScore', name: 'Environmental Safety', domain: 'facility_safety', unit: 'pts', direction: 'higher', target: 95, warningThreshold: 80, criticalThreshold: 60, description: 'Overall facility safety score' },
  { key: 'earlyWarningIndex', name: 'Early Warning', domain: 'facility_safety', unit: 'pts', direction: 'higher', target: 100, warningThreshold: 85, criticalThreshold: 70, description: 'Safety early warning system effectiveness' },
  { key: 'fireSuppressionReadiness', name: 'Fire Suppression', domain: 'facility_safety', unit: '%', direction: 'higher', target: 100, warningThreshold: 95, criticalThreshold: 85, description: 'Fire suppression system readiness' },
  
  // Workload & GPU
  { key: 'avgGpuUtilization', name: 'GPU Utilization', domain: 'workload_gpu', unit: '%', direction: 'higher', target: 80, warningThreshold: 50, criticalThreshold: 30, description: 'Average GPU utilization across clusters' },
  { key: 'gpuFairnessIndex', name: 'GPU Fairness', domain: 'workload_gpu', unit: 'pts', direction: 'higher', target: 90, warningThreshold: 70, criticalThreshold: 50, description: 'Fair GPU allocation across tenants' },
  { key: 'slaBreachRate', name: 'SLA Breach Rate', domain: 'workload_gpu', unit: '%', direction: 'lower', target: 0, warningThreshold: 2, criticalThreshold: 5, description: 'Percentage of jobs breaching SLA' },
  { key: 'costPerGpuHour', name: 'Cost per GPU-hour', domain: 'workload_gpu', unit: '$', direction: 'lower', target: 2.5, warningThreshold: 4, criticalThreshold: 6, description: 'All-in cost per GPU hour' },
  
  // Sovereignty
  { key: 'sovereignComputeRatioPct', name: 'Sovereign Compute', domain: 'sovereignty', unit: '%', direction: 'higher', target: 98, warningThreshold: 90, criticalThreshold: 80, description: 'Percentage of compute in sovereign jurisdiction' },
  { key: 'sovereigntyRiskScore', name: 'Sovereignty Risk', domain: 'sovereignty', unit: 'pts', direction: 'lower', target: 5, warningThreshold: 20, criticalThreshold: 40, description: 'Data sovereignty risk score' },
  { key: 'auditReadinessScore', name: 'Audit Readiness', domain: 'sovereignty', unit: 'pts', direction: 'higher', target: 95, warningThreshold: 80, criticalThreshold: 60, description: 'Compliance audit readiness' },
  
  // Financial & Carbon
  { key: 'effectivePue', name: 'Effective PUE', domain: 'financial_carbon', unit: '', direction: 'lower', target: 1.2, warningThreshold: 1.4, criticalThreshold: 1.6, description: 'Overall Power Usage Effectiveness' },
  { key: 'gCo2PerGpuHour', name: 'gCO₂e/GPU-hr', domain: 'financial_carbon', unit: 'g', direction: 'lower', target: 20, warningThreshold: 100, criticalThreshold: 200, description: 'Carbon intensity per GPU hour' },
  { key: 'economicEfficiencyScore', name: 'Economic Efficiency', domain: 'financial_carbon', unit: 'pts', direction: 'higher', target: 85, warningThreshold: 70, criticalThreshold: 55, description: 'Combined cost and efficiency score' },
  { key: 'carbonNeutralProgress', name: 'Carbon Neutral', domain: 'financial_carbon', unit: '%', direction: 'higher', target: 100, warningThreshold: 50, criticalThreshold: 25, description: 'Progress towards carbon neutrality' },
];

// ============================================================================
// WORKFLOW DEFINITIONS
// ============================================================================

export interface WorkflowTrigger {
  id: string;
  name: string;
  domain: DomainType;
  condition: string;
  thresholdValue?: number;
  comparisonOperator?: '>' | '<' | '>=' | '<=' | '==' | '!=';
}

export interface WorkflowAction {
  id: string;
  name: string;
  type: 'alert' | 'automation' | 'escalation' | 'report';
  target: string;
  parameters: Record<string, any>;
}

export interface Workflow {
  id: string;
  name: string;
  domain: DomainType;
  trigger: WorkflowTrigger;
  agent: string;
  rootCauseAnalysis: string;
  recommendedMitigation: string[];
  automatedAction?: WorkflowAction;
  enabled: boolean;
}

// ============================================================================
// AGENT DEFINITIONS
// ============================================================================

export interface TwinAgent {
  id: string;
  name: string;
  domain: DomainType;
  description: string;
  capabilities: string[];
  workflows: string[];
  status: 'active' | 'inactive' | 'learning';
}

export const DATA_CENTRE_AGENTS: TwinAgent[] = [
  {
    id: 'thermal-agent',
    name: 'Thermal Agent',
    domain: 'thermal_hardware',
    description: 'Monitors server temperatures, detects hotspots, prevents thermal throttling',
    capabilities: ['Temperature monitoring', 'Hotspot detection', 'Cooling optimization', 'Throttling prevention'],
    workflows: ['thermal_runaway', 'airflow_obstruction', 'cooling_imbalance'],
    status: 'active',
  },
  {
    id: 'power-agent',
    name: 'Power Agent',
    domain: 'power_ups',
    description: 'Manages power distribution, UPS health, generator failover',
    capabilities: ['Power monitoring', 'UPS management', 'Generator control', 'Load balancing'],
    workflows: ['grid_outage', 'ups_degradation', 'pdu_overload'],
    status: 'active',
  },
  {
    id: 'network-agent',
    name: 'Network Agent',
    domain: 'network',
    description: 'Monitors network fabric, detects congestion, manages traffic',
    capabilities: ['Traffic analysis', 'Latency monitoring', 'Congestion detection', 'Route optimization'],
    workflows: ['link_saturation', 'switch_failure', 'route_divergence'],
    status: 'active',
  },
  {
    id: 'gpu-scheduler-agent',
    name: 'GPU Scheduler Agent',
    domain: 'workload_gpu',
    description: 'Optimizes GPU workload scheduling, manages queues, ensures SLA compliance',
    capabilities: ['Workload scheduling', 'Queue management', 'SLA monitoring', 'Resource allocation'],
    workflows: ['gpu_saturation', 'multi_tenant_overload', 'cluster_failure'],
    status: 'active',
  },
  {
    id: 'sovereignty-agent',
    name: 'Sovereignty Agent',
    domain: 'sovereignty',
    description: 'Monitors data flows, enforces residency policies, detects violations',
    capabilities: ['Data flow tracking', 'Policy enforcement', 'Violation detection', 'Compliance reporting'],
    workflows: ['cross_border_violation', 'policy_tightening', 'region_migration'],
    status: 'active',
  },
  {
    id: 'financial-agent',
    name: 'Financial Agent',
    domain: 'financial_carbon',
    description: 'Tracks costs, carbon pricing, renewable energy mix, financial forecasting',
    capabilities: ['Cost tracking', 'Carbon accounting', 'Energy optimization', 'Financial modeling'],
    workflows: ['carbon_price_shock', 'renewable_outage', 'cost_optimization'],
    status: 'active',
  },
  {
    id: 'incident-response-agent',
    name: 'Incident Response Agent',
    domain: 'facility_safety',
    description: 'Coordinates emergency response, manages incidents, ensures safety',
    capabilities: ['Incident detection', 'Emergency coordination', 'Safety monitoring', 'Escalation management'],
    workflows: ['water_leak', 'fire_detection', 'hydrogen_incident'],
    status: 'active',
  },
];

// ============================================================================
// HUMAN ROLES
// ============================================================================

export interface HumanRole {
  id: string;
  name: string;
  description: string;
  domains: DomainType[];
  permissions: string[];
}

export const DATA_CENTRE_ROLES: HumanRole[] = [
  {
    id: 'noc-operator',
    name: 'NOC Operator',
    description: 'Monitors real-time facility performance, responds to operational incidents',
    domains: ['thermal_hardware', 'power_ups', 'cooling', 'network', 'facility_safety'],
    permissions: ['view_all', 'acknowledge_alerts', 'trigger_workflows', 'basic_controls'],
  },
  {
    id: 'facility-engineer',
    name: 'Facility Engineer',
    description: 'Manages physical infrastructure, HVAC, power systems',
    domains: ['thermal_hardware', 'power_ups', 'cooling', 'facility_safety'],
    permissions: ['view_all', 'modify_thresholds', 'maintenance_controls', 'equipment_config'],
  },
  {
    id: 'sustainability-team',
    name: 'Sustainability Team',
    description: 'Tracks carbon emissions, renewable mix, ESG reporting',
    domains: ['financial_carbon'],
    permissions: ['view_carbon', 'generate_reports', 'scenario_modeling'],
  },
  {
    id: 'compliance-officer',
    name: 'Compliance Officer',
    description: 'Ensures data sovereignty, PIPEDA compliance, audit readiness',
    domains: ['sovereignty'],
    permissions: ['view_compliance', 'audit_access', 'policy_management'],
  },
  {
    id: 'cio-cto',
    name: 'CIO/CTO',
    description: 'Makes strategic decisions on capacity, green investments, infrastructure',
    domains: ['thermal_hardware', 'power_ups', 'cooling', 'network', 'facility_safety', 'workload_gpu', 'sovereignty', 'financial_carbon'],
    permissions: ['view_all', 'strategic_decisions', 'budget_approval', 'scenario_approval'],
  },
];
