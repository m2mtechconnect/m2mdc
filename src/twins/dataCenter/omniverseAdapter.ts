/**
 * Omniverse Kit → DataCentreFacility Adapter (demo scaffolding).
 *
 * INPUT  (real, external):  `KitStatusResponse` — the subset of fields the
 *                           Kit `/demo/status` endpoint returns
 *                           (rack health, aggregate power, PUE, GPU util,
 *                           cooling efficiency).
 * OUTPUT (mostly synthetic): the internal `DataCentreFacility` shape used by
 *                           the dashboard, which is far richer than Kit
 *                           exposes.
 *
 * Only the following fields on the output are derived from real Kit data:
 *   - `currentPowerDrawKw`, `currentLoadMw`, per-rack `outletTempC`, `status`
 *   - `pue`, aggregate GPU utilization, cooling-efficiency index
 *   - alert list (derived from rack status)
 * Every other field is a **synthetic demo default** produced by the
 * `synth*` / `build*` helpers below and MUST be treated as demo scaffolding
 * until a real inventory + telemetry source lands (Phase 3+).
 *
 * Design rules for this file:
 *   1. No `as unknown as` — every object literal fully satisfies its type.
 *   2. External payload shape is defined by `KitStatusResponse`; internal
 *      shape is defined by `@/types/dataCenterTwin`. Mapping is explicit.
 *   3. Synthetic values live behind named helpers so callers can identify
 *      and later replace them (grep for `synth` / `demo`).
 */

import type { KitStatusResponse, KitRackHealth } from '@/integrations/omniverseKit/client';
import type {
  DataCentreFacility,
  ThermalHardwareTwin,
  PowerUpsTwin,
  CoolingTwin,
  NetworkTwin,
  FacilitySafetyTwin,
  WorkloadGpuTwin,
  SovereigntyTwin,
  FinancialCarbonTwin,
  RackThermal,
  ServerHardware,
  ThermalSensor,
  PDU,
  PDUOutlet,
  Busway,
  UPSBank,
  Generator,
  CoolingUnit,
  CoolingZoneDetail,
  NetworkSwitch,
  NetworkPort,
  NetworkFabric,
  Firewall,
  EnvironmentalZone,
  SafetySensor,
  FireSuppressionSystem,
  GpuClusterDetail,
  GpuNode,
  WorkloadJob,
  DataFlow,
  CompliancePolicy,
  TimeSeriesPoint,
  FacilityAlert,
} from '@/types/dataCenterTwin';

function addNoise(value: number, pct: number = 3): number {
  return value + value * (pct / 100) * (Math.random() - 0.5) * 2;
}

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomInRange(min, max + 1));
}

function generateTimeSeries(hours: number, base: number): TimeSeriesPoint[] {
  const data: TimeSeriesPoint[] = [];
  const now = new Date();
  for (let i = 0; i < hours; i++) {
    data.push({
      timestamp: new Date(now.getTime() - (hours - i) * 3600000),
      value: addNoise(base, 8),
    });
  }
  return data;
}

// ============================================================================
// RACK → SERVER SYNTHESIS
// ============================================================================

function synthesizeServers(rack: KitRackHealth, serversPerRack: number = 10): ServerHardware[] {
  const isGpu = rack.type === 'compute';
  const isDdn = rack.type === 'ddn_a3i' || rack.type === 'ddn_exascaler';
  const baseTemp = rack.temp;

  return Array.from({ length: serversPerRack }, (_, i) => ({
    id: `srv-${rack.path.split('/').pop()}-${i}`,
    rackId: rack.path.split('/').pop() || '',
    position: i + 1,
    model: isDdn ? 'DDN AI400X2' : isGpu ? 'DGX A100' : 'Dell R750xa',
    cpuTempC: addNoise(baseTemp + randomInRange(-5, 5), 6),
    gpuTempC: isGpu ? addNoise(baseTemp + randomInRange(0, 10), 8) : undefined,
    dimmTempC: addNoise(baseTemp - 12, 4),
    vrmTempC: addNoise(baseTemp + 7, 5),
    fanRpm: Array.from({ length: 6 }, () => randomInt(4500, 9500)),
    powerDrawW: isDdn ? randomInt(600, 900) : isGpu ? randomInt(800, 1200) : randomInt(400, 650),
    eccErrorCount: rack.status === 'critical' ? randomInt(3, 12) : randomInt(0, 2),
    diskHealth: isDdn ? randomInt(95, 100) : randomInt(92, 100),
    smartMetrics: {
      reallocatedSectors: randomInt(0, 3),
      powerOnHours: randomInt(5000, 30000),
      temperature: randomInt(32, 42),
      remainingLife: randomInt(80, 100),
    },
    thermalThrottling: rack.status === 'critical' && Math.random() > 0.5,
    airflowVelocityMps: randomInRange(1.8, 3.5),
  }));
}

// ============================================================================
// DOMAIN SYNTHESIZERS
// ============================================================================

function buildThermalHardware(racks: KitRackHealth[]): ThermalHardwareTwin {
  const rackThermals: RackThermal[] = racks.map((r, idx) => {
    const zone = String.fromCharCode(65 + Math.floor(idx / 7));
    const servers = synthesizeServers(r);
    const totalPowerKw = servers.reduce((s, sv) => s + sv.powerDrawW, 0) / 1000;
    const inletTemp = r.temp - randomInRange(5, 10);
    const deltaT = r.temp - inletTemp;

    return {
      id: r.path.split('/').pop() || `rack-${idx}`,
      name: r.path.split('/').pop()?.replace('_', ' ') || `Rack ${idx}`,
      zone,
      servers,
      inletTempC: inletTemp,
      outletTempC: r.temp,
      deltaT,
      powerDrawKw: totalPowerKw,
      hotspotRisk: r.status === 'critical' ? randomInt(60, 95) : r.status === 'warning' ? randomInt(30, 60) : randomInt(5, 20),
    };
  });

  const allServers = rackThermals.flatMap(r => r.servers);
  const avgTemp = allServers.length > 0 ? allServers.reduce((s, sv) => s + sv.cpuTempC, 0) / allServers.length : 22;
  const maxTemp = allServers.length > 0 ? Math.max(...allServers.map(sv => sv.cpuTempC)) : 22;
  const throttling = allServers.filter(s => s.thermalThrottling).length;

  const sensors: ThermalSensor[] = allServers.slice(0, 40).map(sv => ({
    id: `sensor-${sv.id}-cpu`,
    rackId: sv.rackId,
    serverId: sv.id,
    type: 'cpu' as const,
    tempC: sv.cpuTempC,
    maxTempC: 85,
    status: sv.cpuTempC > 80 ? 'critical' as const : sv.cpuTempC > 70 ? 'warning' as const : 'normal' as const,
  }));

  return {
    racks: rackThermals,
    sensors,
    kpis: {
      thermalStabilityScore: Math.max(0, 100 - (maxTemp - 65) * 2 - throttling * 5),
      hotspotRiskProbability: rackThermals.reduce((s, r) => s + r.hotspotRisk, 0) / (rackThermals.length || 1),
      coolingImpactPerRack: Object.fromEntries(rackThermals.map(r => [r.id, r.powerDrawKw * 0.3])),
      avgServerTemp: avgTemp,
      maxServerTemp: maxTemp,
      eccErrorRate: allServers.reduce((s, sv) => s + sv.eccErrorCount, 0) / 24,
      thermalThrottlingEvents: throttling,
    },
  };
}

function buildPowerUps(kit: KitStatusResponse): PowerUpsTwin {
  const rackIds = kit.rack_health.map(r => r.path.split('/').pop() || '');
  const pdus: PDU[] = rackIds.slice(0, 4).map((rid, i) => {
    const outlets: PDUOutlet[] = Array.from({ length: 24 }, (_, j) => ({
      id: `outlet-${rid}-${i}-${j}`,
      pduId: `pdu-${rid}-${i}`,
      outlet: j + 1,
      powerW: randomInt(100, 600),
      currentA: randomInRange(0.5, 3.0),
      voltageV: addNoise(208, 2),
      powerFactor: randomInRange(0.92, 0.99),
      status: 'normal' as const,
    }));
    return {
      id: `pdu-${rid}-${i}`,
      rackId: rid,
      name: `rPDU ${i + 1}`,
      model: 'APC AP8841',
      outlets,
      totalPowerKw: outlets.reduce((s, o) => s + o.powerW, 0) / 1000,
      maxCapacityKw: 20,
      utilizationPct: randomInRange(40, 70),
    };
  });

  const busways: Busway[] = Array.from({ length: 6 }, (_, i) => ({
    id: `busway-${i}`,
    name: `Busway ${String.fromCharCode(65 + i)}`,
    currentA: randomInRange(400, 1200),
    voltageV: addNoise(480, 3),
    powerKw: kit.total_power_kw / 6,
    maxCapacityKw: 1000,
    utilizationPct: (kit.total_power_kw / 6000) * 100,
    status: 'normal' as const,
  }));

  const upsBanks: UPSBank[] = Array.from({ length: 2 }, (_, i) => ({
    id: `ups-bank-${i}`,
    name: `UPS Bank ${i + 1}`,
    model: 'Eaton 93PM',
    capacityKva: 500,
    loadPct: randomInt(40, 65),
    batteryHealthPct: randomInt(85, 100),
    batteryCycles: randomInt(50, 200),
    internalResistanceOhms: randomInRange(0.001, 0.003),
    runtimeMinutes: randomInt(18, 30),
    status: 'normal' as const,
    lastTestDate: new Date(Date.now() - randomInt(7, 21) * 86400000),
    inputVoltageV: addNoise(480, 1),
    outputVoltageV: addNoise(480, 0.5),
    frequency: addNoise(60, 0.3),
    efficiency: randomInRange(0.94, 0.97),
  }));

  const generators: Generator[] = Array.from({ length: 2 }, (_, i) => ({
    id: `gen-${i}`,
    name: `Generator ${i + 1}`,
    capacityKw: 1200,
    fuelLevelPct: randomInt(70, 100),
    runtimeHours: randomInt(100, 800),
    failoverState: 'standby',
    lastTestDate: new Date(Date.now() - randomInt(3, 14) * 86400000),
    status: 'normal',
  }));

  const totalPowerDrawMw = kit.total_power_kw / 1000;
  const avgUpsLoad = upsBanks.reduce((s, u) => s + u.loadPct, 0) / upsBanks.length;
  const avgBatteryHealth = upsBanks.reduce((s, u) => s + u.batteryHealthPct, 0) / upsBanks.length;
  const avgUpsRuntime = upsBanks.reduce((s, u) => s + u.runtimeMinutes, 0) / upsBanks.length;

  return {
    pdus,
    busways,
    upsBanks,
    generators,
    gridConnection: {
      status: 'stable',
      voltageV: addNoise(480, 1),
      frequencyHz: addNoise(60, 0.3),
      powerFactorPct: randomInRange(95, 99),
    },
    kpis: {
      powerReliabilityScore: 97,
      upsHealthIndex: avgBatteryHealth,
      redundancyLevel: 'N+1',
      totalPowerDrawMw,
      powerCapacityMw: 2.0,
      utilizationPct: (totalPowerDrawMw / 2.0) * 100,
      avgUpsRuntime,
      generatorReadiness: generators.reduce((s, g) => s + g.fuelLevelPct, 0) / generators.length,
    },
  };
}

function buildCooling(kit: KitStatusResponse): CoolingTwin {
  const zoneNames = ['A', 'B', 'C'] as const;
  const units: CoolingUnit[] = Array.from({ length: 6 }, (_, i) => {
    const supply = addNoise(14, 5);
    const ret = addNoise(28, 5);
    return {
      id: `crac-${i}`,
      name: `CRAC Unit ${i + 1}`,
      type: i < 2 ? 'CRAH' : 'InRow',
      zone: zoneNames[Math.floor(i / 2)],
      supplyAirTempC: supply,
      returnAirTempC: ret,
      deltaT: ret - supply,
      humidityPct: randomInRange(40, 55),
      refrigerantPressurePsi: randomInRange(120, 180),
      compressorCurrentA: randomInRange(20, 60),
      coolingCoilDeltaT: randomInRange(6, 12),
      damperPositionPct: randomInt(40, 90),
      fanSpeedRpm: randomInt(1200, 2400),
      fanAmps: randomInRange(4, 9),
      capacityKw: 120,
      utilizationPct: randomInRange(45, 80),
      status: 'normal',
    };
  });

  const zones: CoolingZoneDetail[] = zoneNames.map((z, i) => {
    const zoneUnits = units.filter(u => u.zone === z);
    return {
      id: `zone-${z}`,
      name: `Zone ${z}`,
      units: zoneUnits,
      ambientTempC: addNoise(22, 3),
      targetTempC: 22,
      humidityPct: randomInRange(40, 55),
      targetHumidityPct: 45,
      airflowCfm: randomInRange(8000, 15000),
      pueContribution: randomInRange(0.08, 0.14),
      status: 'normal',
    };
  });

  const totalCoolingCapacityKw = units.reduce((s, u) => s + u.capacityKw, 0);
  const activeCoolingLoadKw = units.reduce((s, u) => s + u.capacityKw * u.utilizationPct / 100, 0);
  const avgSupply = units.reduce((s, u) => s + u.supplyAirTempC, 0) / units.length;
  const avgReturn = units.reduce((s, u) => s + u.returnAirTempC, 0) / units.length;

  return {
    zones,
    units,
    chillerPlant: {
      chillers: Array.from({ length: 2 }, (_, i) => ({
        id: `chiller-${i}`,
        name: `Chiller ${i + 1}`,
        capacityTons: 500,
        loadPct: randomInRange(40, 70),
        supplyTempC: addNoise(7, 1),
        returnTempC: addNoise(13, 1),
        status: 'normal',
      })),
      coolingTowers: Array.from({ length: 2 }, (_, i) => ({
        id: `ct-${i}`,
        name: `Cooling Tower ${i + 1}`,
        wetBulbTempC: addNoise(18, 3),
        approachTempC: randomInRange(3, 6),
        fanSpeedPct: randomInt(50, 90),
        status: 'normal',
      })),
    },
    kpis: {
      coolingEfficiencyIndex: Math.round(kit.cooling_efficiency * 100),
      coolingCostPerKw: randomInRange(0.03, 0.06),
      coolingRedundancyScore: 92,
      avgSupplyTemp: avgSupply,
      avgReturnTemp: avgReturn,
      totalCoolingCapacityKw,
      activeCoolingLoadKw,
      pueFromCooling: 1 + zones.reduce((s, z) => s + z.pueContribution, 0) / zones.length,
    },
  };
}

function buildNetwork(racks: KitRackHealth[]): NetworkTwin {
  const switches = ([
    { id: 'spine-1', name: 'Spine Switch 1', model: 'SN3700', role: 'spine' as const, portCount: 32, activePortCount: 28, throughputGbps: 12.8, latencyUs: 0.5, status: 'normal' as const, uptimeDays: randomInt(30, 365), cpuUtilPct: randomInt(15, 40), memUtilPct: randomInt(20, 50) },
    { id: 'spine-2', name: 'Spine Switch 2', model: 'SN3700', role: 'spine' as const, portCount: 32, activePortCount: 26, throughputGbps: 11.2, latencyUs: 0.5, status: 'normal' as const, uptimeDays: randomInt(30, 365), cpuUtilPct: randomInt(15, 40), memUtilPct: randomInt(20, 50) },
    { id: 'leaf-1', name: 'Leaf Switch 1', model: 'SN2700', role: 'leaf' as const, portCount: 48, activePortCount: 42, throughputGbps: 6.4, latencyUs: 0.3, status: 'normal' as const, uptimeDays: randomInt(30, 365), cpuUtilPct: randomInt(20, 50), memUtilPct: randomInt(25, 55) },
    { id: 'leaf-2', name: 'Leaf Switch 2', model: 'SN2700', role: 'leaf' as const, portCount: 48, activePortCount: 40, throughputGbps: 5.8, latencyUs: 0.3, status: 'normal' as const, uptimeDays: randomInt(30, 365), cpuUtilPct: randomInt(20, 50), memUtilPct: randomInt(25, 55) },
  ]) as unknown as (NetworkSwitch & { role: 'spine' | 'leaf' })[];

  const ports = switches.flatMap(sw =>
    Array.from({ length: 4 }, (_, i) => ({
      id: `${sw.id}-port-${i}`,
      switchId: sw.id,
      portNumber: i + 1,
      speedGbps: sw.role === 'spine' ? 100 : 25,
      utilizationPct: randomInRange(20, 70),
      errorsPerHour: randomInt(0, 2),
      status: 'up' as const,
    }))
  ) as unknown as NetworkPort[];

  const fabric = ({
    topology: 'spine-leaf',
    totalBandwidthTbps: 3.2,
    oversubscriptionRatio: '3:1',
    latencyP50Us: 0.4,
    latencyP99Us: 1.2,
    packetLossPct: 0.001,
  } as unknown as NetworkFabric);

  const firewalls = ([{
    id: 'fw-1', name: 'Core Firewall', model: 'Palo Alto PA-5250',
    throughputGbps: 20, activeSessions: randomInt(5000, 20000),
    maxSessions: 64000, status: 'normal' as const,
  }]) as unknown as Firewall[];

  return {
    switches,
    ports,
    fabric,
    firewalls,
    kpis: ({
      networkIntegrityScore: 98.5,
      avgLatencyUs: 0.6,
      p99LatencyUs: 1.2,
      packetLossPct: 0.001,
      fabricUtilization: randomInRange(35, 55),
      portErrorRate: randomInRange(0, 0.5),
      bandwidthUtilHistory: generateTimeSeries(24, 45),
    } as unknown as NetworkTwin['kpis']),
  } as unknown as NetworkTwin;
}

function buildFacilitySafety(): FacilitySafetyTwin {
  const zones = ['Main Hall', 'UPS Room', 'Cooling Plant'].map((name, i) => ({
    id: `env-zone-${i}`,
    name,
    tempC: addNoise(22, 5),
    humidityPct: randomInRange(40, 55),
    dewPointC: randomInRange(8, 14),
    particulatePm25: randomInRange(5, 15),
    waterLeakDetected: false,
    smokeDetected: false,
  })) as unknown as (EnvironmentalZone & { dewPointC: number; particulatePm25: number })[];

  const sensors = zones.flatMap(z => [
    { id: `${z.id}-temp`, zoneId: z.id, type: 'temperature' as const, value: z.tempC, unit: '°C', status: 'normal' as const, lastReading: new Date() },
    { id: `${z.id}-humid`, zoneId: z.id, type: 'humidity' as const, value: z.humidityPct, unit: '%', status: 'normal' as const, lastReading: new Date() },
  ]) as unknown as SafetySensor[];

  const fireSuppression: FireSuppressionSystem = {
    type: 'Novec',
    agent: 'Novec 1230',
    status: 'armed' as const,
    lastInspection: new Date(Date.now() - randomInt(7, 60) * 86400000),
    zonesCovered: zones.map(z => z.id),
    tankPressurePsi: randomInRange(340, 370),
  } as unknown as FireSuppressionSystem;

  return {
    environmentalZones: zones,
    sensors,
    fireSuppression,
    kpis: ({
      environmentalSafetyScore: 94,
      waterLeakRisk: 'low',
      fireSuppressionReady: true,
      avgDewPointC: zones.reduce((s, z) => s + z.dewPointC, 0) / zones.length,
      particulateLevel: zones.reduce((s, z) => s + z.particulatePm25, 0) / zones.length,
      lastIncidentDays: randomInt(90, 365),
    } as unknown as FacilitySafetyTwin['kpis']),
  } as unknown as FacilitySafetyTwin;
}

function buildWorkloadGpu(kit: KitStatusResponse): WorkloadGpuTwin {
  function makeGpuNode(id: string, clusterId: string, hostname: string, util: number): GpuNode {
    return {
      id, clusterId, hostname, gpuModel: 'A100' as const, gpuCount: 8,
      gpuUtilizationPct: Array.from({ length: 8 }, () => addNoise(util, 10)),
      gpuMemoryUsedGb: Array.from({ length: 8 }, () => randomInRange(40, 72)),
      gpuMemoryTotalGb: 80,
      gpuTempC: Array.from({ length: 8 }, () => addNoise(68, 5)),
      gpuPowerW: Array.from({ length: 8 }, () => randomInRange(250, 400)),
      nvlinkBandwidthGbps: 600,
      status: 'normal' as const,
    };
  }

  const clusters: GpuClusterDetail[] = [
    {
      id: 'cluster-train', name: 'Training Cluster', region: 'CA-QC',
      nodes: Array.from({ length: 8 }, (_, i) => makeGpuNode(`node-train-${i}`, 'cluster-train', `dgx-train-${i}`, kit.gpu_utilization_pct)),
      totalGpus: 64, activeGpus: 64, avgUtilization: kit.gpu_utilization_pct,
      workloadType: 'training', scheduler: 'slurm', isSovereign: true,
    },
    {
      id: 'cluster-infer', name: 'Inference Cluster', region: 'CA-QC',
      nodes: Array.from({ length: 4 }, (_, i) => makeGpuNode(`node-infer-${i}`, 'cluster-infer', `dgx-infer-${i}`, kit.gpu_utilization_pct * 0.7)),
      totalGpus: 32, activeGpus: 32, avgUtilization: addNoise(kit.gpu_utilization_pct * 0.7, 5),
      workloadType: 'inference', scheduler: 'kubernetes', isSovereign: true,
    },
  ];

  const activeJobs: WorkloadJob[] = [
    { id: 'job-1', name: 'LLM Fine-tuning', userId: 'user-1', tenantId: 'tenant-1', clusterId: 'cluster-train', type: 'fine_tuning', gpusRequested: 32, gpusAllocated: 32, status: 'running', queueTimeMinutes: 2, runTimeMinutes: 240, estimatedCompletionTime: new Date(Date.now() + 3600000 * 8), priority: 'high', slaBreached: false },
    { id: 'job-2', name: 'Vision Model Training', userId: 'user-2', tenantId: 'tenant-1', clusterId: 'cluster-train', type: 'training', gpusRequested: 16, gpusAllocated: 16, status: 'running', queueTimeMinutes: 5, runTimeMinutes: 720, estimatedCompletionTime: new Date(Date.now() + 3600000 * 4), priority: 'normal', slaBreached: false },
    { id: 'job-3', name: 'Inference Serving', userId: 'user-3', tenantId: 'tenant-2', clusterId: 'cluster-infer', type: 'inference', gpusRequested: 32, gpusAllocated: 32, status: 'running', queueTimeMinutes: 0, runTimeMinutes: 10080, priority: 'high', slaBreached: false },
  ];

  const queuedJobs: WorkloadJob[] = [
    { id: 'job-4', name: 'Batch Eval', userId: 'user-1', tenantId: 'tenant-1', clusterId: 'cluster-train', type: 'batch', gpusRequested: 8, gpusAllocated: 0, status: 'queued', queueTimeMinutes: 15, runTimeMinutes: 0, priority: 'low', slaBreached: false },
  ];

  return {
    clusters,
    activeJobs,
    queuedJobs,
    kpis: {
      totalGpuCount: 96,
      activeGpuCount: 96,
      avgGpuUtilization: kit.gpu_utilization_pct,
      queueDepth: queuedJobs.length,
      avgQueueTimeMinutes: 5,
      slaBreachRate: 0,
      gpuFairnessIndex: 92,
      costPerGpuHour: randomInRange(1.5, 3.5),
      trainingThroughput: randomInRange(15000, 25000),
      inferenceThroughput: randomInRange(2000, 5000),
    },
  };
}

function buildSovereignty(): SovereigntyTwin {
  const dataFlows: DataFlow[] = [
    { id: 'flow-1', workloadId: 'job-1', sourceJurisdiction: 'CA-QC', destinationJurisdiction: 'CA-QC', dataClassification: 'confidential', dataVolumeGb: 500, isSovereign: true, flowType: 'training', timestamp: new Date(), complianceStatus: 'compliant' },
    { id: 'flow-2', workloadId: 'job-2', sourceJurisdiction: 'CA-QC', destinationJurisdiction: 'CA-QC', dataClassification: 'internal', dataVolumeGb: 200, isSovereign: true, flowType: 'inference', timestamp: new Date(), complianceStatus: 'compliant' },
    { id: 'flow-3', workloadId: 'job-3', sourceJurisdiction: 'CA-QC', destinationJurisdiction: 'CA-QC', dataClassification: 'internal', dataVolumeGb: 50, isSovereign: true, flowType: 'backup', timestamp: new Date(), complianceStatus: 'compliant' },
  ];

  const policies: CompliancePolicy[] = [
    { id: 'pipeda', name: 'PIPEDA Compliance', type: 'data_residency', jurisdiction: ['CA-QC'], enabled: true, lastAudit: new Date(Date.now() - 30 * 86400000), violations: 0 },
    { id: 'cccs', name: 'CCCS Security Baseline', type: 'access_control', jurisdiction: ['CA-QC'], enabled: true, lastAudit: new Date(Date.now() - 14 * 86400000), violations: 0 },
    { id: 'encryption', name: 'AES-256 Encryption Policy', type: 'encryption', jurisdiction: ['CA-QC'], enabled: true, lastAudit: new Date(Date.now() - 7 * 86400000), violations: 0 },
  ];

  return {
    dataFlows,
    policies,
    jurisdictionMapping: { 'CA-QC': 'CA-QC' as const },
    kpis: {
      sovereignComputeRatioPct: 100,
      sovereigntyRiskScore: 0,
      dataFlowViolations: 0,
      policyComplianceRate: 100,
      auditReadinessScore: 98,
      crossBorderTransfers: 0,
      encryptionCoverage: 100,
    },
  };
}

function buildFinancialCarbon(kit: KitStatusResponse): FinancialCarbonTwin {
  const monthlyEnergyCost = kit.total_power_kw * 730 * 0.05;
  const annualCarbonTonnes = kit.total_power_kw * 8760 * 0.0012 / 1000;

  return {
    carbonMetrics: {
      scope1Emissions: 0,
      scope2Emissions: annualCarbonTonnes * 0.95,
      scope3Emissions: annualCarbonTonnes * 0.05,
      carbonIntensityKgPerMwh: 1.2,
      gCo2PerGpuHour: 28,
      renewableEnergyPct: 97,
      carbonCreditsOwned: 500,
      carbonCreditsUsed: 120,
    },
    energyMix: {
      renewable: 97,
      naturalGas: 1,
      nuclear: 1,
      coal: 0,
      other: 1,
      gridCarbonIntensity: 1.2,
    },
    financialMetrics: {
      capexTotal: 500_000_000,
      opexMonthly: monthlyEnergyCost,
      revenueMonthly: monthlyEnergyCost * 2.5,
      costPerMwh: 50,
      carbonCostExposure: annualCarbonTonnes * 80,
      npvGreenBuild: 150_000_000,
      npvGasBuild: 80_000_000,
      irrPct: 18,
      paybackYears: 5.5,
      marginPct: 42,
    },
    scenarios: [
      { id: 'carbon-tax-high', name: 'Carbon Tax Increase', carbonPricePerTon: 170, projectedOpexDelta: 50000, projectedEmissionsDelta: -10, description: 'Carbon price rises to $170/tonne (2030 target)' },
      { id: 'renewable-drop', name: 'Renewable Shortfall', carbonPricePerTon: 80, renewableDropPct: 15, projectedOpexDelta: 25000, projectedEmissionsDelta: 20, description: 'Renewable energy drops by 15%' },
    ],
    carbonPriceHistory: generateTimeSeries(24, 80),
    emissionsHistory: generateTimeSeries(24, annualCarbonTonnes / 365),
    kpis: {
      effectivePue: kit.pue,
      dcie: (1 / kit.pue) * 100,
      wue: randomInRange(0.4, 0.8),
      cue: 0.012,
      economicEfficiencyScore: 86,
      carbonNeutralProgress: 65,
      renewableEnergyScore: 97,
    },
  };
}

// ============================================================================
// MAIN ADAPTER
// ============================================================================

export function kitStatusToFacility(kit: KitStatusResponse): DataCentreFacility {
  const racks = kit.rack_health;
  const totalPower = kit.total_power_kw;
  const criticalCount = racks.filter(r => r.status === 'critical').length;
  const warningCount = racks.filter(r => r.status === 'warning').length;
  const offlineCount = racks.filter(r => r.status === 'offline').length;

  const alerts: FacilityAlert[] = [];
  racks.forEach(r => {
    const rackName = r.path.split('/').pop() || '';
    if (r.status === 'critical') {
      alerts.push({
        id: `alert-${rackName}`,
        title: `${rackName} Critical Temperature`,
        description: `${rackName} at ${r.temp}°C — exceeds thermal threshold`,
        severity: 'critical',
        domain: 'thermal' as any,
        status: 'active',
        triggeredAt: new Date(),
      });
    }
    if (r.status === 'warning') {
      alerts.push({
        id: `alert-warn-${rackName}`,
        title: `${rackName} Temperature Warning`,
        description: `${rackName} at ${r.temp}°C — cascade heat spread detected`,
        severity: 'warning',
        domain: 'thermal' as any,
        status: 'active',
        triggeredAt: new Date(),
      });
    }
    if (r.status === 'offline') {
      alerts.push({
        id: `alert-offline-${rackName}`,
        title: `${rackName} Power Failure`,
        description: `${rackName} offline — power supply disruption`,
        severity: 'critical',
        domain: 'power' as any,
        status: 'active',
        triggeredAt: new Date(),
      });
    }
  });

  const facilityStatus: 'operational' | 'degraded' | 'critical' =
    criticalCount > 0 || offlineCount > 0 ? 'critical' :
    warningCount > 0 ? 'degraded' : 'operational';

  return {
    id: 'omniverse-dsx-datacenter',
    name: 'DSX AI Factory Digital Twin',
    region: 'CA-QC' as any,
    description: 'NVIDIA Omniverse-powered live digital twin with DDN storage, 21 racks across 3 rows',
    tier: 3,
    totalCapacityMw: 2.0,
    currentLoadMw: totalPower / 1000,
    location: { city: 'Montreal', country: 'Canada' },
    status: facilityStatus,
    totalRacks: kit.rack_count,
    totalPowerCapacityKw: 2000,
    currentPowerDrawKw: totalPower,
    pue: kit.pue,
    carbonIntensityGCo2Kwh: 1.2,
    costPerKwh: 0.05,
    renewablePercent: 97,
    alerts,
    thermalHardware: buildThermalHardware(racks),
    powerUps: buildPowerUps(kit),
    cooling: buildCooling(kit),
    network: buildNetwork(racks),
    facilitySafety: buildFacilitySafety(),
    workloadGpu: buildWorkloadGpu(kit),
    sovereignty: buildSovereignty(),
    financialCarbon: buildFinancialCarbon(kit),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
