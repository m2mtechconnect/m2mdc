/**
 * Thermal Heatmap Utilities
 * Color gradients, temperature mapping, and rack grouping logic
 */

import type { RackThermal } from '@/types/dataCenterTwin';

// Temperature thresholds for color mapping
export const TEMP_THRESHOLDS = {
  cold: 22,
  warm: 26,
  hot: 30,
  critical: 35,
};

/**
 * Get HSL color for temperature using continuous gradient
 * < 22°C → green (120°)
 * 22–26°C → yellow (60°)
 * 26–30°C → orange (30°)
 * > 30°C → red (0°)
 */
export function getTempColorHSL(tempC: number): string {
  if (tempC < TEMP_THRESHOLDS.cold) {
    return 'hsl(142, 76%, 36%)'; // green-600
  }
  if (tempC < TEMP_THRESHOLDS.warm) {
    // Gradient from green to yellow
    const ratio = (tempC - TEMP_THRESHOLDS.cold) / (TEMP_THRESHOLDS.warm - TEMP_THRESHOLDS.cold);
    const hue = 142 - ratio * 82; // 142 -> 60
    return `hsl(${Math.round(hue)}, 76%, 50%)`;
  }
  if (tempC < TEMP_THRESHOLDS.hot) {
    // Gradient from yellow to orange
    const ratio = (tempC - TEMP_THRESHOLDS.warm) / (TEMP_THRESHOLDS.hot - TEMP_THRESHOLDS.warm);
    const hue = 60 - ratio * 30; // 60 -> 30
    return `hsl(${Math.round(hue)}, 90%, 50%)`;
  }
  // Gradient from orange to red
  const ratio = Math.min((tempC - TEMP_THRESHOLDS.hot) / 5, 1);
  const hue = 30 - ratio * 30; // 30 -> 0
  return `hsl(${Math.round(hue)}, 90%, 50%)`;
}

/**
 * Get Tailwind-compatible class for temperature
 */
export function getTempClass(tempC: number): string {
  if (tempC < TEMP_THRESHOLDS.cold) return 'bg-emerald-500';
  if (tempC < TEMP_THRESHOLDS.warm) return 'bg-yellow-500';
  if (tempC < TEMP_THRESHOLDS.hot) return 'bg-orange-500';
  return 'bg-red-500';
}

/**
 * Get status label for temperature
 */
export function getTempStatus(tempC: number): 'Stable' | 'Warning' | 'Critical' {
  if (tempC < TEMP_THRESHOLDS.warm) return 'Stable';
  if (tempC < TEMP_THRESHOLDS.hot) return 'Warning';
  return 'Critical';
}

/**
 * Extended rack data with aisle grouping
 */
export interface RackWithAisle extends RackThermal {
  aisleType: 'cold' | 'hot';
  aisleGroup: string;
  containmentZone: string;
  airflowCFM: number;
  avgGpuTemp: number;
}

/**
 * Add aisle grouping metadata to racks
 */
export function addAisleMetadata(racks: RackThermal[]): RackWithAisle[] {
  return racks.map((rack, index) => {
    // Alternate cold/hot aisles
    const aisleType = index % 2 === 0 ? 'cold' : 'hot';
    const aisleGroup = String.fromCharCode(65 + Math.floor(index / 4)); // A, B, C, D...
    const containmentZone = `Zone-${aisleGroup}`;
    
    // Calculate average GPU temp from servers
    const gpuTemps = rack.servers
      .filter(s => s.gpuTempC !== undefined)
      .map(s => s.gpuTempC as number);
    const avgGpuTemp = gpuTemps.length > 0 
      ? gpuTemps.reduce((a, b) => a + b, 0) / gpuTemps.length 
      : 0;
    
    // Estimate airflow CFM based on server fan speeds
    const avgFanRpm = rack.servers.reduce((sum, s) => {
      const rackAvg = s.fanRpm.reduce((a, b) => a + b, 0) / s.fanRpm.length;
      return sum + rackAvg;
    }, 0) / rack.servers.length;
    const airflowCFM = Math.round(avgFanRpm * 0.15); // Rough conversion
    
    return {
      ...rack,
      aisleType,
      aisleGroup,
      containmentZone,
      airflowCFM,
      avgGpuTemp,
    };
  });
}

/**
 * Group racks by aisle
 */
export function groupRacksByAisle(racks: RackWithAisle[]): Record<string, RackWithAisle[]> {
  return racks.reduce((acc, rack) => {
    const key = `${rack.aisleGroup}-${rack.aisleType}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(rack);
    return acc;
  }, {} as Record<string, RackWithAisle[]>);
}

/**
 * Generate sparkline data points
 */
export function generateSparklineData(
  baseValue: number,
  points: number = 12,
  variance: number = 0.1,
  seedText = 'thermal-sparkline',
): number[] {
  // Truth rule: illustrative shape only, and it must be reproducible.
  // Seeded `mulberry32-v1`, never `Math.random()`.
  const rand = mulberry32(deriveSeed(`${seedText}:${baseValue}:${points}:${variance}`));
  const data: number[] = [];
  let current = baseValue;

  for (let i = 0; i < points; i++) {
    const change = (rand() - 0.5) * 2 * baseValue * variance;
    current = Math.max(0, current + change);
    data.push(Math.round(current * 10) / 10);
  }

  return data;
}

/**
 * Thermal filter options
 */
export type ThermalFilter = 
  | 'all'
  | 'hot-28'
  | 'delta-7'
  | 'high-density'
  | 'gpu-only'
  | 'hot-aisle'
  | 'cold-aisle';

export interface ThermalFilterOption {
  key: ThermalFilter;
  label: string;
  color?: string;
}

export const THERMAL_FILTERS: ThermalFilterOption[] = [
  { key: 'all', label: 'All Racks' },
  { key: 'hot-28', label: 'Racks > 28°C', color: 'text-red-500' },
  { key: 'delta-7', label: 'ΔT > 7°C', color: 'text-orange-500' },
  { key: 'high-density', label: 'High Density', color: 'text-purple-500' },
  { key: 'gpu-only', label: 'GPU Racks', color: 'text-blue-500' },
  { key: 'hot-aisle', label: 'Hot Aisle', color: 'text-amber-500' },
  { key: 'cold-aisle', label: 'Cold Aisle', color: 'text-emerald-500' },
];

/**
 * Apply thermal filter to racks
 */
export function applyThermalFilter(
  racks: RackWithAisle[],
  filter: ThermalFilter
): RackWithAisle[] {
  switch (filter) {
    case 'hot-28':
      return racks.filter(r => r.inletTempC >= 28);
    case 'delta-7':
      return racks.filter(r => r.deltaT >= 7);
    case 'high-density':
      return racks.filter(r => r.powerDrawKw >= 15);
    case 'gpu-only':
      return racks.filter(r => r.avgGpuTemp > 0);
    case 'hot-aisle':
      return racks.filter(r => r.aisleType === 'hot');
    case 'cold-aisle':
      return racks.filter(r => r.aisleType === 'cold');
    default:
      return racks;
  }
}
