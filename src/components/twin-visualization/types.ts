/**
 * Twin Visualization Types
 * Data models for the visual digital twin layer
 */

export interface RackVisual {
  id: string;
  name: string;
  rowId: string;
  position: [number, number, number]; // x, y, z
  heightU: number;
  utilizationPercent: number;
  powerKw: number;
  thermalCelsius: number;
  isCritical: boolean;
  isAffected: boolean; // Highlighted during simulation events
  gpuLoad?: number; // GPU utilization percentage (0-100)
  /**
   * Explicit cooling capability from the facility dataset. Used to decide
   * whether a liquid-cooled, rear-door-heat-exchanger asset may be mounted on
   * this rack. Absent means "unknown" and is treated as incompatible.
   */
  cooling?: {
    liquidCooled?: boolean;
    rearDoorHeatExchanger?: boolean;
    chilledWaterConnected?: boolean;
  } | null;
}

export interface RowVisual {
  id: string;
  name: string;
  position: [number, number, number];
  rackCount: number;
  isHotAisle: boolean;
}

export interface PowerSegmentVisual {
  id: string;
  from: string;
  to: string;
  fromType: 'grid' | 'ups' | 'pdu' | 'rack';
  toType: 'ups' | 'pdu' | 'rack';
  loadKw: number;
  capacityKw: number;
  isDegraded: boolean;
  fromPosition: [number, number, number];
  toPosition: [number, number, number];
}

export interface ThermalZoneVisual {
  id: string;
  areaLabel: string;
  position: [number, number, number];
  size: [number, number];
  avgCelsius: number;
  hotspot: boolean;
}

export interface NetworkNodeVisual {
  id: string;
  type: 'core-switch' | 'tor-switch' | 'firewall' | 'router' | 'server-group';
  label: string;
  rackId?: string;
  position: [number, number];
  critical: boolean;
}

export interface NetworkLinkVisual {
  id: string;
  from: string;
  to: string;
  bandwidthGbps: number;
  utilizationPercent: number;
  degraded: boolean;
}

export interface SimulationEventVisual {
  id: string;
  timestamp: string;
  timeSeconds: number;
  label: string;
  severity: 'info' | 'warning' | 'critical' | 'low' | 'medium' | 'high';
  domain: 'power' | 'cooling' | 'network' | 'compute' | 'sovereignty' | 'thermal' | 'workload' | 'financial';
  affectedRacks?: string[];
  affectedNodes?: string[];
}

export type TwinVisualizationMode = 'blueprint' | 'simulation' | 'dashboard';

export interface TwinVisualizationState {
  racks: RackVisual[];
  rows: RowVisual[];
  powerSegments: PowerSegmentVisual[];
  thermalZones: ThermalZoneVisual[];
  networkNodes: NetworkNodeVisual[];
  networkLinks: NetworkLinkVisual[];
  events: SimulationEventVisual[];
  isSimulating: boolean;
  activeScenario: string | null;
  currentTime: number;
  facilityName: string;
  totalCapacityKw: number;
  pue: number;
  carbonIntensity: number;
  // Simulation-specific fields
  simulationKpis?: Record<string, number>;
  simulationProgress?: number;
}

// Enhanced color scales for visualization - more NOC-like appearance
export const THERMAL_COLORS = {
  cold: '#1e88e5',    // bright blue
  cool: '#42a5f5',    // light blue
  warm: '#ffa726',    // orange
  hot: '#ef5350',     // red
  critical: '#d32f2f' // dark red
};

export const UTILIZATION_COLORS = {
  low: '#26a69a',     // teal
  medium: '#ffb74d',  // amber
  high: '#ef5350',    // red
};

export const POWER_COLORS = {
  healthy: '#26a69a',
  warning: '#ffb74d',
  critical: '#ef5350',
  degraded: '#78909c'
};

export function getThermalColor(celsius: number): string {
  // Smooth gradient interpolation for more realistic thermal visualization
  if (celsius < 18) return THERMAL_COLORS.cold;
  if (celsius < 22) return THERMAL_COLORS.cool;
  if (celsius < 26) return '#8bc34a'; // light green - optimal
  if (celsius < 28) return THERMAL_COLORS.warm;
  if (celsius < 32) return THERMAL_COLORS.hot;
  return THERMAL_COLORS.critical;
}

export function getUtilizationColor(percent: number): string {
  if (percent < 50) return UTILIZATION_COLORS.low;
  if (percent < 75) return UTILIZATION_COLORS.medium;
  return UTILIZATION_COLORS.high;
}

export function getPowerColor(loadRatio: number, isDegraded: boolean): string {
  if (isDegraded) return POWER_COLORS.degraded;
  if (loadRatio < 0.6) return POWER_COLORS.healthy;
  if (loadRatio < 0.85) return POWER_COLORS.warning;
  return POWER_COLORS.critical;
}
