/**
 * Data Centre Digital Twin - Synthetic Telemetry Generator
 * Generates industry-accurate telemetry for sovereign green AI data centres
 * 
 * Technical References:
 * - ASHRAE TC 9.9 2021: Data Center Thermal Guidelines (A1/A2 class equipment)
 * - Uptime Institute Tier Standards: Power and cooling redundancy
 * - NVIDIA DGX H100 Specifications: GPU thermal envelopes and power profiles
 * - Hydro-Québec Commercial Rates 2024: Energy cost baselines
 * - Canada Carbon Pricing Act: $80/tonne (2024), $170/tonne (2030 target)
 * - IEEE 1100-2005: Data center power quality standards
 * - TIA-942-B: Data center infrastructure standards
 * 
 * Configuration:
 * - 20 racks (mixed compute/GPU/storage)
 * - 40 servers per rack (800 total)
 * - 2 GPU clusters (H100 training + inference)
 * - 8 cooling zones (hot/cold aisle containment)
 * - 6 power buses (N+1 redundancy)
 * - 2 UPS banks (2N architecture)
 * - 4 network switches (spine-leaf topology)
 */

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
  SimulationScenario,
  TimeSeriesPoint,
  Jurisdiction,
} from '@/types/dataCenterTwin';

// ============================================================================
// RANDOM DATA GENERATORS
// ============================================================================

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomInRange(min, max + 1));
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function addNoise(value: number, noisePct: number = 5): number {
  const noise = value * (noisePct / 100) * (Math.random() - 0.5) * 2;
  return value + noise;
}

function generateTimeSeriesData(hours: number, baseValue: number, pattern: 'daily' | 'random' | 'degrading' = 'random'): TimeSeriesPoint[] {
  const data: TimeSeriesPoint[] = [];
  const now = new Date();
  
  for (let i = 0; i < hours; i++) {
    const timestamp = new Date(now.getTime() - (hours - i) * 60 * 60 * 1000);
    let value = baseValue;
    
    if (pattern === 'daily') {
      const hour = timestamp.getHours();
      const dailyFactor = hour >= 9 && hour <= 17 ? 1.2 : hour >= 18 && hour <= 22 ? 1.1 : 0.85;
      value = baseValue * dailyFactor;
    } else if (pattern === 'degrading') {
      value = baseValue * (1 + i * 0.001);
    }
    
    data.push({ timestamp, value: addNoise(value) });
  }
  
  return data;
}

// ============================================================================
// THERMAL & HARDWARE DATA - ASHRAE TC 9.9 Compliant
// ============================================================================

/**
 * Generate server hardware telemetry
 * Thermal ranges based on:
 * - Intel Xeon Scalable: Tcase max 84-105°C depending on SKU
 * - NVIDIA H100 SXM: Max junction temp 83°C
 * - DDR5 DIMMs: Max operating 85°C
 * - Power: 400W (storage) to 1200W (GPU compute)
 */
function generateServer(rackId: string, position: number): ServerHardware {
  const isGpuServer = Math.random() > 0.6;
  // CPU temps: Intel Xeon typically 55-78°C under load
  const baseCpuTemp = randomInRange(58, 76);
  
  return {
    id: `srv-${rackId}-${position}`,
    rackId,
    position,
    model: randomChoice(['Dell R750xa', 'HPE DL380 Gen11', 'Supermicro AS-4125GS', 'Lenovo SR675 V3']),
    cpuTempC: addNoise(baseCpuTemp, 6),
    // H100 GPU: typically 65-78°C under training workloads
    gpuTempC: isGpuServer ? addNoise(randomInRange(65, 78), 8) : undefined,
    // DDR5 typically 10-15°C below CPU
    dimmTempC: addNoise(baseCpuTemp - 12, 4),
    // VRMs run 5-10°C above CPU
    vrmTempC: addNoise(baseCpuTemp + 7, 5),
    // Server fans: 3000-12000 RPM range for 2U/4U servers
    fanRpm: Array.from({ length: 6 }, () => randomInt(4500, 9500)),
    // Power: GPU servers 800-1200W, standard 400-600W
    powerDrawW: isGpuServer ? randomInt(800, 1200) : randomInt(400, 650),
    eccErrorCount: randomInt(0, 3),
    diskHealth: randomInt(92, 100),
    smartMetrics: {
      reallocatedSectors: randomInt(0, 5),
      powerOnHours: randomInt(2000, 35000),
      temperature: randomInt(32, 42),
      remainingLife: randomInt(78, 100),
    },
    thermalThrottling: Math.random() > 0.97,
    // ASHRAE recommends 1.5-3.0 m/s airflow for proper cooling
    airflowVelocityMps: randomInRange(1.8, 3.5),
  };
}

/**
 * Generate rack thermal profile
 * ASHRAE A1 class: 18-27°C inlet, max 40°C outlet
 * Typical ΔT: 12-18°C for high-density GPU racks
 */
function generateRack(rackId: string, zone: string, serverCount: number = 40): RackThermal {
  const servers = Array.from({ length: serverCount }, (_, i) => generateServer(rackId, i + 1));
  const avgCpuTemp = servers.reduce((sum, s) => sum + s.cpuTempC, 0) / servers.length;
  const totalPowerKw = servers.reduce((sum, s) => sum + s.powerDrawW, 0) / 1000;
  
  // ASHRAE A1: 18-27°C inlet temperature range
  const inletTemp = addNoise(randomInRange(19, 25), 3);
  // ΔT proportional to power density
  const deltaT = 10 + (totalPowerKw / 30) * 8; // Higher power = higher ΔT
  
  return {
    id: rackId,
    name: `Rack ${rackId.toUpperCase()}`,
    zone,
    servers,
    inletTempC: inletTemp,
    outletTempC: inletTemp + addNoise(deltaT, 5),
    deltaT: addNoise(deltaT, 5),
    powerDrawKw: totalPowerKw,
    // Hotspot risk based on inlet temp and power density
    hotspotRisk: inletTemp > 26 || totalPowerKw > 25 ? randomInt(35, 70) : randomInt(5, 20),
  };
}

function generateThermalSensors(racks: RackThermal[]): ThermalSensor[] {
  const sensors: ThermalSensor[] = [];
  
  racks.forEach(rack => {
    rack.servers.slice(0, 5).forEach(server => {
      sensors.push({
        id: `sensor-${server.id}-cpu`,
        rackId: rack.id,
        serverId: server.id,
        type: 'cpu',
        tempC: server.cpuTempC,
        maxTempC: 85,
        status: server.cpuTempC > 80 ? 'critical' : server.cpuTempC > 70 ? 'warning' : 'normal',
      });
    });
  });
  
  return sensors;
}

function generateThermalHardwareTwin(): ThermalHardwareTwin {
  const zones = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const racks: RackThermal[] = [];
  
  // Generate 20 racks across 8 zones
  for (let i = 1; i <= 20; i++) {
    const zone = zones[Math.floor((i - 1) / 3) % zones.length];
    racks.push(generateRack(`rack-${i.toString().padStart(2, '0')}`, zone, 40));
  }
  
  const sensors = generateThermalSensors(racks);
  const allServers = racks.flatMap(r => r.servers);
  const avgTemp = allServers.reduce((sum, s) => sum + s.cpuTempC, 0) / allServers.length;
  const maxTemp = Math.max(...allServers.map(s => s.cpuTempC));
  const eccErrors = allServers.reduce((sum, s) => sum + s.eccErrorCount, 0);
  const throttlingEvents = allServers.filter(s => s.thermalThrottling).length;
  
  return {
    racks,
    sensors,
    kpis: {
      thermalStabilityScore: Math.max(0, 100 - (maxTemp - 65) * 2 - throttlingEvents * 5),
      hotspotRiskProbability: racks.reduce((sum, r) => sum + r.hotspotRisk, 0) / racks.length,
      coolingImpactPerRack: Object.fromEntries(racks.map(r => [r.id, r.powerDrawKw * 0.3])),
      avgServerTemp: avgTemp,
      maxServerTemp: maxTemp,
      eccErrorRate: eccErrors / 24,
      thermalThrottlingEvents: throttlingEvents,
    },
  };
}

// ============================================================================
// POWER & UPS DATA - IEEE 1100-2005 / TIA-942-B Compliant
// ============================================================================

function generatePDU(rackId: string, pduNum: number): PDU {
  const outlets: PDUOutlet[] = Array.from({ length: 24 }, (_, i) => ({
    id: `outlet-${rackId}-${pduNum}-${i + 1}`,
    pduId: `pdu-${rackId}-${pduNum}`,
    outlet: i + 1,
    powerW: randomInt(100, 600),
    currentA: randomInRange(0.5, 3.0),
    voltageV: addNoise(208, 2),
    powerFactor: randomInRange(0.92, 0.99),
    status: Math.random() > 0.98 ? 'warning' : 'normal',
  }));
  
  const totalPower = outlets.reduce((sum, o) => sum + o.powerW, 0) / 1000;
  
  return {
    id: `pdu-${rackId}-${pduNum}`,
    rackId,
    name: `PDU ${rackId.toUpperCase()}-${pduNum}`,
    model: randomChoice(['APC AP8841', 'Raritan PX3', 'Eaton ePDU']),
    outlets,
    totalPowerKw: totalPower,
    maxCapacityKw: 20,
    utilizationPct: (totalPower / 20) * 100,
  };
}

function generateBusway(id: number): Busway {
  const power = randomInRange(200, 800);
  return {
    id: `busway-${id}`,
    name: `Busway ${String.fromCharCode(65 + id - 1)}`,
    currentA: power / 0.48,
    voltageV: addNoise(480, 3),
    powerKw: power,
    maxCapacityKw: 1000,
    utilizationPct: (power / 1000) * 100,
    status: power > 850 ? 'warning' : 'normal',
  };
}

function generateUPSBank(id: number): UPSBank {
  const health = randomInt(75, 100);
  return {
    id: `ups-bank-${id}`,
    name: `UPS Bank ${id}`,
    model: randomChoice(['Eaton 93PM', 'Vertiv Liebert', 'APC Symmetra']),
    capacityKva: 500,
    loadPct: randomInt(40, 75),
    batteryHealthPct: health,
    batteryCycles: randomInt(50, 300),
    internalResistanceOhms: randomInRange(0.001, 0.005),
    runtimeMinutes: Math.floor(health * 0.4),
    status: health < 60 ? 'warning' : 'normal',
    lastTestDate: new Date(Date.now() - randomInt(7, 30) * 24 * 60 * 60 * 1000),
    inputVoltageV: addNoise(480, 2),
    outputVoltageV: addNoise(480, 1),
    frequency: addNoise(60, 0.5),
    efficiency: randomInRange(0.94, 0.97),
  };
}

function generateGenerator(id: number): Generator {
  return {
    id: `generator-${id}`,
    name: `Generator ${id}`,
    capacityKw: 2000,
    fuelLevelPct: randomInt(70, 100),
    runtimeHours: randomInt(0, 500),
    failoverState: 'standby',
    lastTestDate: new Date(Date.now() - randomInt(7, 14) * 24 * 60 * 60 * 1000),
    status: 'normal',
  };
}

function generatePowerUpsTwin(thermalTwin: ThermalHardwareTwin): PowerUpsTwin {
  const pdus: PDU[] = thermalTwin.racks.flatMap(rack => [
    generatePDU(rack.id, 1),
    generatePDU(rack.id, 2),
  ]);
  
  const busways = Array.from({ length: 6 }, (_, i) => generateBusway(i + 1));
  const upsBanks = Array.from({ length: 2 }, (_, i) => generateUPSBank(i + 1));
  const generators = Array.from({ length: 2 }, (_, i) => generateGenerator(i + 1));
  
  const totalPower = pdus.reduce((sum, p) => sum + p.totalPowerKw, 0) / 1000;
  const avgHealth = upsBanks.reduce((sum, u) => sum + u.batteryHealthPct, 0) / upsBanks.length;
  
  return {
    pdus,
    busways,
    upsBanks,
    generators,
    gridConnection: {
      status: 'stable',
      voltageV: addNoise(480, 1),
      frequencyHz: addNoise(60, 0.1),
      powerFactorPct: randomInRange(95, 99),
    },
    kpis: {
      powerReliabilityScore: Math.min(100, 85 + avgHealth * 0.15),
      upsHealthIndex: avgHealth,
      redundancyLevel: 'N+1',
      totalPowerDrawMw: totalPower,
      powerCapacityMw: 12,
      utilizationPct: (totalPower / 12) * 100,
      avgUpsRuntime: upsBanks.reduce((sum, u) => sum + u.runtimeMinutes, 0) / upsBanks.length,
      generatorReadiness: generators.reduce((sum, g) => sum + g.fuelLevelPct, 0) / generators.length,
    },
  };
}

// ============================================================================
// COOLING MOCK DATA
// ============================================================================

function generateCoolingUnit(zoneId: string, unitNum: number): CoolingUnit {
  const supplyTemp = randomInRange(12, 16);
  const returnTemp = randomInRange(22, 28);
  
  return {
    id: `cooling-${zoneId}-${unitNum}`,
    name: `CRAH ${zoneId.toUpperCase()}-${unitNum}`,
    type: randomChoice(['CRAC', 'CRAH', 'InRow']),
    zone: zoneId,
    supplyAirTempC: supplyTemp,
    returnAirTempC: returnTemp,
    deltaT: returnTemp - supplyTemp,
    humidityPct: randomInRange(40, 55),
    refrigerantPressurePsi: randomInRange(180, 220),
    compressorCurrentA: randomInRange(15, 45),
    coolingCoilDeltaT: randomInRange(8, 14),
    damperPositionPct: randomInt(40, 100),
    fanSpeedRpm: randomInt(800, 1800),
    fanAmps: randomInRange(5, 15),
    capacityKw: randomInt(80, 150),
    utilizationPct: randomInt(50, 85),
    status: Math.random() > 0.95 ? 'warning' : 'normal',
  };
}

function generateCoolingZone(zoneId: string): CoolingZoneDetail {
  const units = Array.from({ length: 3 }, (_, i) => generateCoolingUnit(zoneId, i + 1));
  const avgSupply = units.reduce((sum, u) => sum + u.supplyAirTempC, 0) / units.length;
  
  return {
    id: zoneId,
    name: `Cooling Zone ${zoneId.toUpperCase()}`,
    units,
    ambientTempC: addNoise(22, 5),
    targetTempC: 22,
    humidityPct: randomInRange(42, 52),
    targetHumidityPct: 45,
    airflowCfm: randomInt(50000, 80000),
    pueContribution: randomInRange(0.08, 0.18),
    status: avgSupply > 18 ? 'warning' : 'normal',
  };
}

function generateCoolingTwin(): CoolingTwin {
  const zones = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(z => generateCoolingZone(z));
  const allUnits = zones.flatMap(z => z.units);
  
  return {
    zones,
    units: allUnits,
    chillerPlant: {
      chillers: Array.from({ length: 4 }, (_, i) => ({
        id: `chiller-${i + 1}`,
        name: `Chiller ${i + 1}`,
        capacityTons: 500,
        loadPct: randomInt(40, 75),
        supplyTempC: randomInRange(6, 8),
        returnTempC: randomInRange(12, 14),
        status: 'normal' as const,
      })),
      coolingTowers: Array.from({ length: 4 }, (_, i) => ({
        id: `tower-${i + 1}`,
        name: `Cooling Tower ${i + 1}`,
        wetBulbTempC: randomInRange(18, 24),
        approachTempC: randomInRange(3, 6),
        fanSpeedPct: randomInt(50, 85),
        status: 'normal' as const,
      })),
    },
    kpis: {
      coolingEfficiencyIndex: randomInt(75, 92),
      coolingCostPerKw: randomInRange(0.04, 0.08),
      coolingRedundancyScore: 85,
      avgSupplyTemp: allUnits.reduce((sum, u) => sum + u.supplyAirTempC, 0) / allUnits.length,
      avgReturnTemp: allUnits.reduce((sum, u) => sum + u.returnAirTempC, 0) / allUnits.length,
      totalCoolingCapacityKw: allUnits.reduce((sum, u) => sum + u.capacityKw, 0),
      activeCoolingLoadKw: allUnits.reduce((sum, u) => sum + u.capacityKw * u.utilizationPct / 100, 0),
      pueFromCooling: zones.reduce((sum, z) => sum + z.pueContribution, 0) + 1,
    },
  };
}

// ============================================================================
// NETWORK DATA - Spine-Leaf Architecture
// ============================================================================

function generateNetworkPort(switchId: string, portNum: number): NetworkPort {
  return {
    id: `port-${switchId}-${portNum}`,
    switchId,
    portNumber: portNum,
    speed: randomChoice(['25G', '100G', '400G']),
    utilizationPct: randomInt(10, 85),
    packetErrors: randomInt(0, 100),
    crcErrors: randomInt(0, 20),
    linkFlaps: randomInt(0, 5),
    status: Math.random() > 0.02 ? 'up' : 'down',
  };
}

function generateSwitch(id: number, type: 'ToR' | 'Spine' | 'Leaf' | 'Core'): NetworkSwitch {
  const portCount = type === 'ToR' ? 48 : type === 'Spine' ? 64 : 32;
  const ports = Array.from({ length: portCount }, (_, i) => generateNetworkPort(`switch-${id}`, i + 1));
  
  return {
    id: `switch-${id}`,
    name: `${type} Switch ${id}`,
    type,
    model: randomChoice(['Arista 7280', 'Cisco Nexus 9364', 'Juniper QFX5220']),
    ports,
    cpuUtilization: randomInt(15, 45),
    memoryUtilization: randomInt(30, 60),
    temperature: randomInt(35, 55),
    uptime: randomInt(1000, 50000),
    status: 'normal',
  };
}

function generateNetworkTwin(): NetworkTwin {
  const torSwitches = Array.from({ length: 20 }, (_, i) => generateSwitch(i + 1, 'ToR'));
  const spineSwitches = Array.from({ length: 4 }, (_, i) => generateSwitch(100 + i, 'Spine'));
  const allSwitches = [...torSwitches, ...spineSwitches];
  
  return {
    fabrics: [
      {
        id: 'fabric-ethernet',
        name: 'Ethernet Fabric',
        type: 'Ethernet',
        switches: torSwitches,
        latencyMs: randomInRange(0.2, 0.8),
        jitterMs: randomInRange(0.01, 0.1),
        throughputGbps: randomInt(800, 1200),
        maxThroughputGbps: 1600,
      },
      {
        id: 'fabric-infiniband',
        name: 'InfiniBand Fabric',
        type: 'InfiniBand',
        switches: spineSwitches,
        latencyMs: randomInRange(0.1, 0.3),
        jitterMs: randomInRange(0.005, 0.02),
        throughputGbps: randomInt(1500, 2500),
        maxThroughputGbps: 3200,
      },
    ],
    switches: allSwitches,
    firewalls: Array.from({ length: 2 }, (_, i) => ({
      id: `firewall-${i + 1}`,
      name: `Firewall ${i + 1}`,
      throughputGbps: randomInt(40, 80),
      maxThroughputGbps: 100,
      connectionsPerSec: randomInt(50000, 150000),
      activeSessions: randomInt(100000, 500000),
      cpuUtilization: randomInt(30, 60),
      status: 'normal' as const,
    })),
    kpis: {
      networkIntegrityScore: randomInt(92, 99),
      fabricSaturationIndex: randomInt(30, 55),
      avgLatencyMs: randomInRange(0.3, 0.6),
      maxLatencyMs: randomInRange(1, 3),
      totalThroughputGbps: randomInt(2000, 3500),
      packetLossRate: randomInRange(0, 0.01),
      portUtilizationAvg: allSwitches.reduce((sum, s) => sum + s.ports.reduce((ps, p) => ps + p.utilizationPct, 0) / s.ports.length, 0) / allSwitches.length,
      linkFlapRate: randomInRange(0, 0.5),
    },
  };
}

// ============================================================================
// FACILITY & SAFETY MOCK DATA
// ============================================================================

function generateFacilitySafetyTwin(): FacilitySafetyTwin {
  const zones = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  
  return {
    environmentalZones: zones.map(z => ({
      id: `env-zone-${z}`,
      name: `Server Hall ${z}`,
      type: 'server_hall' as const,
      tempC: addNoise(22, 8),
      humidityPct: randomInRange(40, 55),
      pm25: randomInRange(5, 25),
      pm10: randomInRange(10, 40),
      status: 'normal' as const,
    })),
    safetySensors: [
      ...zones.map(z => ({
        id: `hydrogen-${z}`,
        type: 'hydrogen' as const,
        zone: z,
        value: randomInRange(0, 50),
        threshold: 1000,
        triggered: false,
        status: 'normal' as const,
      })),
      ...zones.map(z => ({
        id: `water-${z}`,
        type: 'water_leak' as const,
        zone: z,
        value: 0,
        threshold: 1,
        triggered: false,
        status: 'normal' as const,
      })),
      ...zones.map(z => ({
        id: `smoke-${z}`,
        type: 'smoke' as const,
        zone: z,
        value: randomInRange(0, 5),
        threshold: 100,
        triggered: false,
        status: 'normal' as const,
      })),
    ],
    fireSuppressionSystems: zones.map(z => ({
      id: `fire-${z}`,
      zone: z,
      type: randomChoice(['FM200', 'Novec', 'Inergen']) as 'FM200' | 'Novec' | 'Inergen',
      tankPressurePsi: randomInRange(350, 400),
      targetPressurePsi: 380,
      status: 'armed' as const,
      lastInspection: new Date(Date.now() - randomInt(30, 90) * 24 * 60 * 60 * 1000),
      nextInspection: new Date(Date.now() + randomInt(30, 90) * 24 * 60 * 60 * 1000),
    })),
    accessControl: {
      activePersonnel: randomInt(15, 45),
      recentAccess: Array.from({ length: 10 }, (_, i) => ({
        userId: `user-${randomInt(100, 999)}`,
        zone: randomChoice(zones),
        timestamp: new Date(Date.now() - randomInt(0, 60) * 60 * 1000),
        action: randomChoice(['entry', 'exit']) as 'entry' | 'exit',
      })),
    },
    kpis: {
      environmentalSafetyScore: randomInt(88, 98),
      earlyWarningIndex: randomInt(90, 100),
      avgAmbientTemp: 22,
      avgHumidity: 47,
      airQualityIndex: randomInt(80, 100),
      waterLeakRisk: randomInt(1, 8),
      fireSuppressionReadiness: randomInt(95, 100),
    },
  };
}

// ============================================================================
// WORKLOAD & GPU DATA - NVIDIA DGX Specifications
// ============================================================================

/**
 * Generate GPU node telemetry
 * Based on NVIDIA H100 SXM specifications:
 * - TDP: 700W per GPU
 * - HBM3: 80GB per GPU
 * - NVLink: 900 GB/s bidirectional
 * - Max junction temp: 83°C
 */
function generateGpuNode(clusterId: string, nodeNum: number): GpuNode {
  const gpuCount = 8;
  return {
    id: `gpu-node-${clusterId}-${nodeNum}`,
    clusterId,
    hostname: `gpu-${clusterId}-node${nodeNum.toString().padStart(2, '0')}`,
    gpuModel: randomChoice(['H100', 'H200', 'A100']) as 'H100' | 'H200' | 'A100',
    gpuCount,
    // H100 typical utilization during training: 70-95%
    gpuUtilizationPct: Array.from({ length: gpuCount }, () => randomInt(68, 94)),
    // H100 HBM3 memory: 80GB, typical usage 50-75GB during LLM training
    gpuMemoryUsedGb: Array.from({ length: gpuCount }, () => randomInt(52, 76)),
    gpuMemoryTotalGb: 80,
    // H100 operating temps: 55-78°C typical, max 83°C
    gpuTempC: Array.from({ length: gpuCount }, () => randomInt(58, 76)),
    // H100 TDP 700W, typical draw 400-650W
    gpuPowerW: Array.from({ length: gpuCount }, () => randomInt(420, 650)),
    // NVLink 4.0: 900 GB/s total, measuring in Gbps
    nvlinkBandwidthGbps: randomInt(580, 720),
    status: 'normal',
  };
}

function generateWorkloadGpuTwin(): WorkloadGpuTwin {
  const clusters: GpuClusterDetail[] = [
    {
      id: 'cluster-training-alpha',
      name: 'Sovereign Training Cluster Alpha',
      region: 'CA-QC',
      nodes: Array.from({ length: 32 }, (_, i) => generateGpuNode('alpha', i + 1)),
      totalGpus: 256,
      activeGpus: randomInt(200, 256),
      avgUtilization: randomInt(70, 88),
      workloadType: 'training',
      scheduler: 'slurm',
      isSovereign: true,
    },
    {
      id: 'cluster-inference-beta',
      name: 'Inference Pool Beta',
      region: 'CA-QC',
      nodes: Array.from({ length: 16 }, (_, i) => generateGpuNode('beta', i + 1)),
      totalGpus: 128,
      activeGpus: randomInt(100, 128),
      avgUtilization: randomInt(75, 92),
      workloadType: 'inference',
      scheduler: 'kubernetes',
      isSovereign: true,
    },
  ];
  
  const activeJobs: WorkloadJob[] = Array.from({ length: 25 }, (_, i) => ({
    id: `job-active-${i + 1}`,
    name: `${randomChoice(['LLM-Training', 'Fine-Tune', 'Inference', 'Batch-Process'])}-${randomInt(1000, 9999)}`,
    userId: `user-${randomInt(100, 999)}`,
    tenantId: `tenant-${randomChoice(['bank-a', 'gov-b', 'health-c', 'fintech-d'])}`,
    clusterId: randomChoice(clusters).id,
    type: randomChoice(['training', 'fine_tuning', 'inference', 'batch']) as 'training' | 'fine_tuning' | 'inference' | 'batch',
    gpusRequested: randomChoice([8, 16, 32, 64]),
    gpusAllocated: randomChoice([8, 16, 32, 64]),
    status: 'running',
    queueTimeMinutes: randomInt(0, 45),
    runTimeMinutes: randomInt(10, 480),
    priority: randomChoice(['normal', 'high']) as 'normal' | 'high',
    slaBreached: Math.random() > 0.95,
  }));
  
  const queuedJobs: WorkloadJob[] = Array.from({ length: 12 }, (_, i) => ({
    id: `job-queued-${i + 1}`,
    name: `${randomChoice(['LLM-Training', 'Fine-Tune', 'Batch-Process'])}-${randomInt(1000, 9999)}`,
    userId: `user-${randomInt(100, 999)}`,
    tenantId: `tenant-${randomChoice(['bank-a', 'gov-b', 'health-c'])}`,
    clusterId: randomChoice(clusters).id,
    type: randomChoice(['training', 'fine_tuning', 'batch']) as 'training' | 'fine_tuning' | 'batch',
    gpusRequested: randomChoice([16, 32, 64, 128]),
    gpusAllocated: 0,
    status: 'queued',
    queueTimeMinutes: randomInt(5, 120),
    runTimeMinutes: 0,
    estimatedCompletionTime: new Date(Date.now() + randomInt(60, 480) * 60 * 1000),
    priority: randomChoice(['low', 'normal', 'high']) as 'low' | 'normal' | 'high',
    slaBreached: false,
  }));
  
  const totalGpus = clusters.reduce((sum, c) => sum + c.totalGpus, 0);
  const activeGpus = clusters.reduce((sum, c) => sum + c.activeGpus, 0);
  
  return {
    clusters,
    activeJobs,
    queuedJobs,
    kpis: {
      totalGpuCount: totalGpus,
      activeGpuCount: activeGpus,
      avgGpuUtilization: clusters.reduce((sum, c) => sum + c.avgUtilization, 0) / clusters.length,
      queueDepth: queuedJobs.length,
      avgQueueTimeMinutes: queuedJobs.reduce((sum, j) => sum + j.queueTimeMinutes, 0) / Math.max(queuedJobs.length, 1),
      slaBreachRate: activeJobs.filter(j => j.slaBreached).length / activeJobs.length * 100,
      gpuFairnessIndex: randomInt(85, 96),
      // H100 cloud pricing: $2.50-$4.00/hr depending on commitment
      costPerGpuHour: randomInRange(2.80, 3.60),
      // Training throughput: tokens/second for LLM workloads
      trainingThroughput: randomInt(18000, 28000),
      inferenceThroughput: randomInt(6000, 14000),
    },
  };
}

// ============================================================================
// SOVEREIGNTY MOCK DATA
// ============================================================================

function generateSovereigntyTwin(): SovereigntyTwin {
  const jurisdictions: Jurisdiction[] = ['CA-QC', 'CA-ON', 'CA-AB', 'US'];
  
  const dataFlows: DataFlow[] = Array.from({ length: 50 }, (_, i) => {
    const source = randomChoice(jurisdictions);
    const dest = Math.random() > 0.95 ? 'US' : source;
    return {
      id: `flow-${i + 1}`,
      workloadId: `workload-${randomInt(1, 100)}`,
      sourceJurisdiction: source,
      destinationJurisdiction: dest as Jurisdiction,
      dataClassification: randomChoice(['internal', 'confidential', 'restricted']) as 'internal' | 'confidential' | 'restricted',
      dataVolumeGb: randomInt(10, 500),
      isSovereign: dest !== 'US',
      flowType: randomChoice(['training', 'inference', 'backup', 'replication']) as 'training' | 'inference' | 'backup' | 'replication',
      timestamp: new Date(Date.now() - randomInt(0, 72) * 60 * 60 * 1000),
      complianceStatus: dest === 'US' && source !== 'US' ? 'violation' : 'compliant',
    };
  });
  
  const violations = dataFlows.filter(f => f.complianceStatus === 'violation').length;
  
  return {
    dataFlows,
    policies: [
      { id: 'policy-residency', name: 'Canadian Data Residency', type: 'data_residency', jurisdiction: ['CA-QC', 'CA-ON', 'CA-AB', 'CA-BC'], enabled: true, lastAudit: new Date(), violations: 0 },
      { id: 'policy-pipeda', name: 'PIPEDA Compliance', type: 'access_control', jurisdiction: ['CA-QC', 'CA-ON', 'CA-AB', 'CA-BC'], enabled: true, lastAudit: new Date(), violations: 0 },
      { id: 'policy-encryption', name: 'Data Encryption Standard', type: 'encryption', jurisdiction: ['CA-QC', 'CA-ON', 'CA-AB', 'CA-BC', 'US', 'EU'], enabled: true, lastAudit: new Date(), violations: 0 },
    ],
    jurisdictionMapping: {
      'cluster-training-alpha': 'CA-QC',
      'cluster-inference-beta': 'CA-QC',
    },
    kpis: {
      sovereignComputeRatioPct: 100 - violations * 2,
      sovereigntyRiskScore: violations * 10,
      dataFlowViolations: violations,
      policyComplianceRate: ((50 - violations) / 50) * 100,
      auditReadinessScore: randomInt(88, 98),
      crossBorderTransfers: dataFlows.filter(f => f.sourceJurisdiction !== f.destinationJurisdiction).length,
      encryptionCoverage: randomInt(98, 100),
    },
  };
}

// ============================================================================
// FINANCIAL & CARBON DATA - Canadian Standards
// Sources: Hydro-Québec rates, NRCan emission factors, Canada Carbon Pricing
// ============================================================================

/**
 * Generate financial and carbon metrics
 * Quebec baseline:
 * - Grid carbon intensity: 1.2 gCO₂/kWh (99.8% hydro)
 * - Electricity cost: $0.055/kWh (Hydro-Québec Large Power)
 * - Carbon price: $80/tonne (2024), $170/tonne (2030 target)
 */
function generateFinancialCarbonTwin(): FinancialCarbonTwin {
  // Quebec: 99.8% renewable (hydro)
  const renewablePct = randomInt(97, 100);
  // Quebec grid: ~1.2 gCO₂/kWh
  const gridCarbonIntensity = renewablePct >= 98 ? randomInRange(1.0, 2.5) : randomInt(100, 200);
  
  return {
    carbonMetrics: {
      // Scope 1: On-site diesel backup testing only
      scope1Emissions: randomInRange(8, 25),
      // Scope 2: Grid electricity - minimal in Quebec
      scope2Emissions: randomInRange(15, 45),
      // Scope 3: Supply chain, employee commute, etc.
      scope3Emissions: randomInRange(80, 180),
      // Quebec: 1-3 kgCO₂/MWh vs Alberta: 470 kgCO₂/MWh
      carbonIntensityKgPerMwh: gridCarbonIntensity,
      // gCO₂ per GPU-hour: ~18-28g in Quebec vs 150-200g in Alberta
      gCo2PerGpuHour: renewablePct >= 98 ? randomInt(18, 28) : randomInt(150, 200),
      renewableEnergyPct: renewablePct,
      carbonCreditsOwned: randomInt(500, 2000),
      carbonCreditsUsed: randomInt(50, 200),
    },
    energyMix: {
      // Quebec energy mix (Hydro-Québec 2023)
      renewable: renewablePct / 100,
      naturalGas: 0.002,
      nuclear: 0,
      coal: 0,
      other: (100 - renewablePct - 0.2) / 100,
      gridCarbonIntensity: gridCarbonIntensity,
    },
    financialMetrics: {
      // CAPEX: $12-15M/MW for AI-optimized green DC
      capexTotal: randomInt(450, 550) * 1000000,
      // OPEX: ~$8-12M/month for 5MW facility
      opexMonthly: randomInt(8, 11) * 1000000,
      // Revenue: GPU rental @ $3.50/hr avg, 400 GPUs = ~$15-20M/month
      revenueMonthly: randomInt(15, 22) * 1000000,
      // Hydro-Québec: $55-70/MWh
      costPerMwh: randomInRange(55, 70),
      // Carbon exposure: minimal in Quebec
      carbonCostExposure: randomInt(50000, 150000),
      // NPV: Green build advantage in Quebec
      npvGreenBuild: randomInt(280, 380) * 1000000,
      npvGasBuild: randomInt(200, 250) * 1000000,
      // IRR: 18-24% typical for sovereign AI infrastructure
      irrPct: randomInRange(18, 24),
      // Payback: 4-5 years with incentives
      paybackYears: randomInRange(4.0, 5.2),
      marginPct: randomInRange(28, 42),
    },
    scenarios: [
      { id: 'current', name: 'Current Carbon Price', carbonPricePerTon: 80, projectedOpexDelta: 0, projectedEmissionsDelta: 0, description: 'Canada federal backstop $80/tonne (2024)' },
      { id: 'accelerated', name: '2030 Projected', carbonPricePerTon: 170, projectedOpexDelta: 2.1, projectedEmissionsDelta: -8, description: 'Scheduled increase to $170/tonne' },
      { id: 'shock', name: 'Carbon Price Shock', carbonPricePerTon: 250, projectedOpexDelta: 5.5, projectedEmissionsDelta: -15, description: 'EU ETS parity stress test' },
    ],
    carbonPriceHistory: generateTimeSeriesData(168, 80, 'random'),
    emissionsHistory: generateTimeSeriesData(168, 45, 'degrading'),
    kpis: {
      // PUE: 1.15-1.25 for modern liquid-cooled DC
      effectivePue: randomInRange(1.18, 1.27),
      // DCIE: inverse of PUE as percentage
      dcie: randomInt(79, 85),
      // WUE: 0.3-0.6 L/kWh for efficient cooling
      wue: randomInRange(0.35, 0.55),
      // CUE: Carbon Use Effectiveness - very low in Quebec
      cue: renewablePct >= 98 ? randomInRange(0.01, 0.03) : randomInRange(0.8, 1.2),
      economicEfficiencyScore: randomInt(82, 94),
      carbonNeutralProgress: renewablePct >= 98 ? randomInt(92, 99) : randomInt(25, 45),
      renewableEnergyScore: renewablePct,
    },
  };
}

// ============================================================================
// COMPLETE FACILITY GENERATOR
// ============================================================================

export function generateDataCentreFacility(id: string, name: string, region: Jurisdiction = 'CA-QC'): DataCentreFacility {
  const thermalHardware = generateThermalHardwareTwin();
  const powerUps = generatePowerUpsTwin(thermalHardware);
  const cooling = generateCoolingTwin();
  const financialCarbon = generateFinancialCarbonTwin();
  
  const totalPowerCapacityKw = 12000; // 12 MW
  const currentPowerDrawKw = powerUps.kpis.totalPowerDrawMw * 1000;
  const pue = financialCarbon.kpis.effectivePue;
  
  return {
    id,
    name,
    region,
    description: `${name} - Sovereign AI compute facility in ${region}`,
    tier: 4,
    totalCapacityMw: 12,
    currentLoadMw: powerUps.kpis.totalPowerDrawMw,
    
    // Extended UI properties
    location: { 
      city: region === 'CA-QC' ? 'Montreal' : region === 'CA-AB' ? 'Calgary' : 'Toronto', 
      country: 'Canada' 
    },
    status: 'operational',
    totalRacks: thermalHardware.racks.length,
    totalPowerCapacityKw,
    currentPowerDrawKw,
    pue,
    carbonIntensityGCo2Kwh: financialCarbon.carbonMetrics.carbonIntensityKgPerMwh,
    costPerKwh: 0.065,
    renewablePercent: Math.round(financialCarbon.carbonMetrics.renewableEnergyPct),
    alerts: [], // Will be populated by simulation
    
    // Domain Twins
    thermalHardware,
    powerUps,
    cooling,
    network: generateNetworkTwin(),
    facilitySafety: generateFacilitySafetyTwin(),
    workloadGpu: generateWorkloadGpuTwin(),
    sovereignty: generateSovereigntyTwin(),
    financialCarbon,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ============================================================================
// DEMO FACILITIES
// ============================================================================

export const sovereignQCFacility = generateDataCentreFacility(
  'facility-sovereign-qc-001',
  'Sovereign AI Factory Quebec',
  'CA-QC'
);

export const prairieABFacility = generateDataCentreFacility(
  'facility-prairie-ab-001', 
  'Prairie AI Compute Centre',
  'CA-AB'
);

export function getAllDemoFacilities(): DataCentreFacility[] {
  return [sovereignQCFacility, prairieABFacility];
}

export function getDemoFacilityById(id: string): DataCentreFacility | undefined {
  return getAllDemoFacilities().find(f => f.id === id);
}

// ============================================================================
// TIME-SERIES GENERATORS FOR UI
// ============================================================================

export function generateGpuUsageCurve(hours: number = 24): TimeSeriesPoint[] {
  return generateTimeSeriesData(hours, 75, 'daily');
}

export function generateCoolingTemperatureCycles(hours: number = 24): TimeSeriesPoint[] {
  return generateTimeSeriesData(hours, 22, 'random');
}

export function generatePowerDrawHistory(hours: number = 24): TimeSeriesPoint[] {
  return generateTimeSeriesData(hours, 8.5, 'daily');
}

export function generateCarbonIntensityHistory(hours: number = 168): TimeSeriesPoint[] {
  return generateTimeSeriesData(hours, 22, 'random');
}
