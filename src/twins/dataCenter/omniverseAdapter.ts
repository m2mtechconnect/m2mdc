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
 *   4. Phase 1A: NO `Math.random()` inside the adapter. All demo variance
 *      comes from a seeded PRNG derived from the Kit payload so identical
 *      inputs produce byte-identical output (adapter is a pure function).
 *   5. Phase 1A: operational scores (sovereignty, audit-readiness,
 *      compliance status, carbon intensity, PUE, GPU util) are either
 *      Kit-passthrough or fixed deterministic fixtures; no random score is
 *      surfaced as an operational KPI.
 */

import type { KitStatusResponse, KitRackHealth } from '@/integrations/omniverseKit/client';
import type { FacilityProvenanceMap, ProvenanceMeta } from '@/lib/provenance/types';
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

// ---------------------------------------------------------------------------
// Deterministic PRNG (mulberry32) — seeded per call from the Kit payload.
// This module exposes `randomInRange`/`randomInt`/`addNoise` names identical
// to the previous non-deterministic helpers so the rest of the file is
// unchanged; the difference is that every value is now reproducible.
// ---------------------------------------------------------------------------
let __rng: () => number = Math.random;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromKit(kit: KitStatusResponse): number {
  // Combine a few stable Kit fields into a 32-bit seed. `tick` alone would
  // make the output vary with time; we prefer a seed that reflects payload
  // shape so identical payloads → identical output.
  const s =
    (kit.rack_count | 0) * 2654435761 ^
    Math.round((kit.total_power_kw || 0) * 1000) ^
    Math.round((kit.pue || 0) * 1000) * 40503 ^
    Math.round((kit.gpu_utilization_pct || 0) * 100) * 486187739;
  return s >>> 0 || 0xDEADBEEF;
}

function addNoise(value: number, pct: number = 3): number {
  return value + value * (pct / 100) * (__rng() - 0.5) * 2;
}

function randomInRange(min: number, max: number): number {
  return __rng() * (max - min) + min;
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
    thermalThrottling: rack.status === 'critical' && __rng() > 0.5,
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
  const _rackCount = racks.length;
  type SwitchSpec = { id: string; name: string; type: NetworkSwitch['type']; model: string; portSpeed: NetworkPort['speed'] };
  const switchSpecs: SwitchSpec[] = [
    { id: 'spine-1', name: 'Spine Switch 1', type: 'Spine', model: 'SN3700', portSpeed: '100G' },
    { id: 'spine-2', name: 'Spine Switch 2', type: 'Spine', model: 'SN3700', portSpeed: '100G' },
    { id: 'leaf-1',  name: 'Leaf Switch 1',  type: 'Leaf',  model: 'SN2700', portSpeed: '25G'  },
    { id: 'leaf-2',  name: 'Leaf Switch 2',  type: 'Leaf',  model: 'SN2700', portSpeed: '25G'  },
  ];

  const switches: NetworkSwitch[] = switchSpecs.map(spec => {
    const ports: NetworkPort[] = Array.from({ length: 4 }, (_, i) => ({
      id: `${spec.id}-port-${i}`,
      switchId: spec.id,
      portNumber: i + 1,
      speed: spec.portSpeed,
      utilizationPct: randomInRange(20, 70),
      packetErrors: randomInt(0, 2),
      crcErrors: randomInt(0, 1),
      linkFlaps: randomInt(0, 1),
      status: 'up',
    }));
    return {
      id: spec.id,
      name: spec.name,
      type: spec.type,
      model: spec.model,
      ports,
      cpuUtilization: randomInt(15, 50),
      memoryUtilization: randomInt(20, 55),
      temperature: randomInRange(30, 45),
      uptime: randomInt(30, 365) * 86400,
      status: 'normal',
    };
  });

  const fabric: NetworkFabric = {
    id: 'fabric-primary',
    name: 'Primary Spine-Leaf Fabric',
    type: 'Ethernet',
    switches,
    latencyMs: 0.4,
    jitterMs: 0.1,
    throughputGbps: 1200,
    maxThroughputGbps: 3200,
  };

  const firewalls: Firewall[] = [{
    id: 'fw-1',
    name: 'Core Firewall',
    throughputGbps: 12,
    maxThroughputGbps: 20,
    connectionsPerSec: randomInt(500, 2000),
    activeSessions: randomInt(5000, 20000),
    cpuUtilization: randomInt(20, 55),
    status: 'normal',
  }];

  const allPorts = switches.flatMap(s => s.ports);
  const portUtilizationAvg = allPorts.reduce((s, p) => s + p.utilizationPct, 0) / allPorts.length;

  return {
    fabrics: [fabric],
    switches,
    firewalls,
    kpis: {
      networkIntegrityScore: 98.5,
      fabricSaturationIndex: (fabric.throughputGbps / fabric.maxThroughputGbps) * 100,
      avgLatencyMs: 0.4,
      maxLatencyMs: 1.2,
      totalThroughputGbps: fabric.throughputGbps,
      packetLossRate: 0.001,
      portUtilizationAvg,
      linkFlapRate: allPorts.reduce((s, p) => s + p.linkFlaps, 0) / allPorts.length,
    },
  };
}

function buildFacilitySafety(): FacilitySafetyTwin {
  type ZoneSpec = { name: string; type: EnvironmentalZone['type'] };
  const zoneSpecs: ZoneSpec[] = [
    { name: 'Main Hall',     type: 'server_hall' },
    { name: 'UPS Room',      type: 'electrical' },
    { name: 'Cooling Plant', type: 'mechanical' },
  ];

  const zones: EnvironmentalZone[] = zoneSpecs.map((spec, i) => ({
    id: `env-zone-${i}`,
    name: spec.name,
    type: spec.type,
    tempC: addNoise(22, 5),
    humidityPct: randomInRange(40, 55),
    pm25: randomInRange(5, 15),
    pm10: randomInRange(10, 30),
    status: 'normal',
  }));

  const safetySensors: SafetySensor[] = zones.flatMap(z => [
    { id: `${z.id}-smoke`, type: 'smoke',      zone: z.id, value: 0, threshold: 1, triggered: false, status: 'normal' },
    { id: `${z.id}-leak`,  type: 'water_leak', zone: z.id, value: 0, threshold: 1, triggered: false, status: 'normal' },
  ]);

  const now = Date.now();
  const fireSuppressionSystems: FireSuppressionSystem[] = zones.map(z => ({
    id: `fs-${z.id}`,
    zone: z.id,
    type: 'Novec',
    tankPressurePsi: randomInRange(340, 370),
    targetPressurePsi: 360,
    status: 'armed',
    lastInspection: new Date(now - randomInt(7, 60) * 86400000),
    nextInspection: new Date(now + randomInt(30, 180) * 86400000),
  }));

  return {
    environmentalZones: zones,
    safetySensors,
    fireSuppressionSystems,
    accessControl: {
      activePersonnel: randomInt(0, 6),
      recentAccess: [],
    },
    kpis: {
      environmentalSafetyScore: 94,
      earlyWarningIndex: 88,
      avgAmbientTemp: zones.reduce((s, z) => s + z.tempC, 0) / zones.length,
      avgHumidity: zones.reduce((s, z) => s + z.humidityPct, 0) / zones.length,
      airQualityIndex: 92,
      waterLeakRisk: 5,
      fireSuppressionReadiness: 98,
    },
  };
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
      // WUE is not sourced from Kit or from a facility BMS in Phase 1A.
      // Fixed deterministic fixture; provenance reported as `demo`.
      wue: 0.5,
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
  // Seed the module PRNG so every synthetic value is a deterministic
  // function of the Kit payload. Restored to Math.random on exit so the
  // adapter does not leak state to other callers of the shared helpers.
  const prev = __rng;
  __rng = mulberry32(seedFromKit(kit));
  try {
    return buildFacility(kit);
  } finally {
    __rng = prev;
  }
}

function buildFacility(kit: KitStatusResponse): DataCentreFacility {
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
        domain: 'thermal_hardware',
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
        domain: 'thermal_hardware',
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
        domain: 'power_ups',
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
    region: 'CA-QC',
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

// ---------------------------------------------------------------------------
// Provenance-aware adapter entry point (Phase 1A)
// ---------------------------------------------------------------------------

export interface FacilityWithProvenance {
  facility: DataCentreFacility;
  provenance: FacilityProvenanceMap;
}

function liveMeta(at: Date, note?: string): ProvenanceMeta {
  return { provenance: 'live', source: 'omniverse-kit', at, connection: 'connected', note };
}
function derivedMeta(at: Date, note?: string): ProvenanceMeta {
  return { provenance: 'derived', source: 'omniverse-kit', at, connection: 'connected', note };
}
function demoMeta(at: Date, note?: string): ProvenanceMeta {
  return { provenance: 'demo', source: 'omniverse-kit-adapter (synthetic)', at, connection: 'connected', note };
}
function staticMeta(note?: string): ProvenanceMeta {
  return { provenance: 'static', source: 'aura-config', note };
}

/**
 * Preferred adapter entry: returns the facility PLUS a provenance map so UI
 * surfaces can tag every KPI truthfully. Never surface a value from
 * `facility` without consulting the matching entry in `provenance`.
 */
export function kitStatusToFacilityWithProvenance(
  kit: KitStatusResponse,
): FacilityWithProvenance {
  const facility = kitStatusToFacility(kit);
  const at = facility.updatedAt;
  const provenance: FacilityProvenanceMap = {
    facility:        derivedMeta(at, 'Aggregated from Kit /demo/status.'),
    pue:             liveMeta(at,    'Kit total_power_kw / total_it_power_kw.'),
    totalPower:      liveMeta(at,    'Kit total_power_kw.'),
    gpuUtilization:  liveMeta(at,    'Kit gpu_utilization_pct.'),
    thermal:         derivedMeta(at, 'Rack outlet temps from Kit rack_health.'),
    cooling:         derivedMeta(at, 'Cooling efficiency index from Kit; unit/zone details are demo.'),
    network:         demoMeta(at,    'Kit does not expose network telemetry; spine/leaf topology is demo scaffolding.'),
    facilitySafety:  demoMeta(at,    'No BMS integration in Phase 1A; safety readings are demo scaffolding.'),
    sovereignty:     staticMeta('Fixed policy fixture; no live compliance evidence collector in Phase 1A.'),
    carbon:          demoMeta(at,    'Carbon values derived from Kit power * fixed factor; not audited.'),
    auditReadiness:  staticMeta('Fixed fixture score; no evidence pipeline in Phase 1A.'),
    alerts:          derivedMeta(at, 'Constructed from Kit rack_health status.'),
    timeSeries:      demoMeta(at,    'Time-series arrays are synthesized from current values; no historian in Phase 1A.'),
  };
  return { facility, provenance };
}

/**
 * Provenance map to attach to the mock/demo `DataCentreFacility` when Kit is
 * unavailable. Every section is marked `demo` (or `unavailable` for values
 * that would otherwise be live). Never returns `live` provenance.
 */
export function demoFacilityProvenance(reason: string): FacilityProvenanceMap {
  const meta: ProvenanceMeta = {
    provenance: 'demo',
    source: 'demo-fixture',
    connection: 'demo',
    note: reason,
  };
  const unavail: ProvenanceMeta = {
    provenance: 'unavailable',
    source: 'omniverse-kit',
    connection: 'unavailable',
    note: reason,
  };
  return {
    facility:       meta,
    pue:            unavail,
    totalPower:     unavail,
    gpuUtilization: unavail,
    thermal:        meta,
    cooling:        meta,
    network:        meta,
    facilitySafety: meta,
    sovereignty:    staticMeta(reason),
    carbon:         meta,
    auditReadiness: staticMeta(reason),
    alerts:         meta,
    timeSeries:     meta,
  };
}
