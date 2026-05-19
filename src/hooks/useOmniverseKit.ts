/**
 * useOmniverseKit — React hook for live Omniverse Kit data
 * Polls /demo/status every 2 seconds via React Query
 * Provides both raw Kit data and derived metrics for UI consumption
 */

import { useQuery } from '@tanstack/react-query';
import { fetchStatus, type KitStatusResponse, type KitRackHealth } from '@/integrations/omniverseKit/client';

const POLL_INTERVAL_MS = 2000;

export interface OmniverseKitData {
  raw: KitStatusResponse | null;
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;

  // Derived metrics
  rackCount: number;
  alertCount: number;
  avgTemp: number;
  maxTemp: number;
  uptime: number;
  phase: string | null;
  scenario: string;

  // Power & efficiency
  totalPowerKw: number;
  gpuUtilizationPct: number;
  coolingEfficiency: number;
  tokensPerWatt: number;
  pue: number;

  // Storage telemetry
  storageTotalIopsK: number;
  storageTotalThroughputGbps: number;
  storageAvgLatencyUs: number;

  // Rack lists by status
  racks: KitRackHealth[];
  criticalRacks: KitRackHealth[];
  warningRacks: KitRackHealth[];
  normalRacks: KitRackHealth[];
  offlineRacks: KitRackHealth[];
  ddnRacks: KitRackHealth[];
  computeRacks: KitRackHealth[];

  // Simulation
  simPaused: boolean;
  simSpeed: number;
  cameraTourActive: boolean;
}

function deriveMetrics(data: KitStatusResponse | undefined): Omit<OmniverseKitData, 'raw' | 'isConnected' | 'isLoading' | 'error'> {
  if (!data || !data.stage_ready) {
    return {
      rackCount: 0,
      alertCount: 0,
      avgTemp: 0,
      maxTemp: 0,
      uptime: 99.99,
      phase: null,
      scenario: 'thermal',
      totalPowerKw: 0,
      gpuUtilizationPct: 0,
      coolingEfficiency: 0,
      tokensPerWatt: 0,
      pue: 1.0,
      storageTotalIopsK: 0,
      storageTotalThroughputGbps: 0,
      storageAvgLatencyUs: 0,
      racks: [],
      criticalRacks: [],
      warningRacks: [],
      normalRacks: [],
      offlineRacks: [],
      ddnRacks: [],
      computeRacks: [],
      simPaused: false,
      simSpeed: 1,
      cameraTourActive: false,
    };
  }

  const racks = data.rack_health;
  const temps = racks.map(r => r.temp);
  const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;
  const maxTemp = temps.length > 0 ? Math.max(...temps) : 0;
  const alertCount = racks.filter(r => r.status === 'critical' || r.status === 'warning' || r.status === 'offline').length;

  return {
    rackCount: data.rack_count,
    alertCount,
    avgTemp: Math.round(avgTemp * 10) / 10,
    maxTemp: Math.round(maxTemp * 10) / 10,
    uptime: 99.99,
    phase: data.phase,
    scenario: data.scenario,
    totalPowerKw: data.total_power_kw,
    gpuUtilizationPct: data.gpu_utilization_pct,
    coolingEfficiency: data.cooling_efficiency,
    tokensPerWatt: data.tokens_per_watt,
    pue: data.pue,
    storageTotalIopsK: data.storage_total_iops_k,
    storageTotalThroughputGbps: data.storage_total_throughput_gbps,
    storageAvgLatencyUs: data.storage_avg_latency_us,
    racks,
    criticalRacks: racks.filter(r => r.status === 'critical'),
    warningRacks: racks.filter(r => r.status === 'warning'),
    normalRacks: racks.filter(r => r.status === 'normal'),
    offlineRacks: racks.filter(r => r.status === 'offline'),
    ddnRacks: racks.filter(r => r.type === 'ddn_a3i' || r.type === 'ddn_exascaler'),
    computeRacks: racks.filter(r => r.type === 'compute'),
    simPaused: data.sim_paused,
    simSpeed: data.sim_speed,
    cameraTourActive: data.camera_tour_active,
  };
}

export function useOmniverseKit(): OmniverseKitData {
  const { data, isLoading, error } = useQuery({
    queryKey: ['omniverseKit', 'status'],
    queryFn: fetchStatus,
    refetchInterval: POLL_INTERVAL_MS,
    retry: 2,
    staleTime: POLL_INTERVAL_MS - 500,
  });

  const metrics = deriveMetrics(data);

  return {
    raw: data ?? null,
    isConnected: !!data?.stage_ready,
    isLoading,
    error: error as Error | null,
    ...metrics,
  };
}
