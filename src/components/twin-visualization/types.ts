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
  severity: 'info' | 'warning' | 'critical';
  domain: 'power' | 'cooling' | 'network' | 'compute' | 'sovereignty';
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
}

// Color scales for visualization
export const THERMAL_COLORS = {
  cool: '#3B82F6',    // blue-500
  warm: '#F59E0B',    // amber-500
  hot: '#EF4444',     // red-500
  critical: '#DC2626' // red-600
};

export const UTILIZATION_COLORS = {
  low: '#22C55E',     // green-500
  medium: '#F59E0B',  // amber-500
  high: '#EF4444',    // red-500
};

export const POWER_COLORS = {
  healthy: '#22C55E',
  warning: '#F59E0B',
  critical: '#EF4444',
  degraded: '#6B7280'
};

export function getThermalColor(celsius: number): string {
  if (celsius < 22) return THERMAL_COLORS.cool;
  if (celsius < 28) return THERMAL_COLORS.warm;
  if (celsius < 32) return THERMAL_COLORS.hot;
  return THERMAL_COLORS.critical;
}

export function getUtilizationColor(percent: number): string {
  if (percent < 60) return UTILIZATION_COLORS.low;
  if (percent < 85) return UTILIZATION_COLORS.medium;
  return UTILIZATION_COLORS.high;
}

export function getPowerColor(loadRatio: number, isDegraded: boolean): string {
  if (isDegraded) return POWER_COLORS.degraded;
  if (loadRatio < 0.7) return POWER_COLORS.healthy;
  if (loadRatio < 0.9) return POWER_COLORS.warning;
  return POWER_COLORS.critical;
}
