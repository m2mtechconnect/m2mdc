/**
 * useTwinKPIsFromSimulation - Fetches KPIs from simulation_runs for a twin
 * Single source of truth for KPI values across all pages
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTwin } from '@/context/ActiveTwinContext';
import { KPI_CATALOG, KPIKey, type KPIDefinition } from '@/domain/greenDc/kpiCatalog';

export interface TwinKPIValue {
  key: string;
  value: number | null;
  definition: KPIDefinition | undefined;
  status: 'safe' | 'warning' | 'critical' | 'unknown';
}

export interface UseTwinKPIsResult {
  kpis: Record<string, number | null>;
  kpiValues: TwinKPIValue[];
  baselineKpis: Record<string, number | null>;
  finalKpis: Record<string, number | null>;
  loading: boolean;
  error: Error | null;
  latestRunId: string | null;
}

/**
 * Hook to get KPIs from the most recent simulation run for a twin
 */
export function useTwinKPIsFromSimulation(twinId?: string): UseTwinKPIsResult {
  const { activeTwinId } = useActiveTwin();
  const effectiveTwinId = twinId || activeTwinId;

  const { data, isLoading, error } = useQuery({
    queryKey: ['twin-kpis-simulation', effectiveTwinId],
    queryFn: async () => {
      if (!effectiveTwinId) return null;

      // Get the most recent completed simulation run
      const { data: runs, error: runsError } = await supabase
        .from('simulation_runs')
        .select('id, baseline_kpis, final_kpis, created_at')
        .eq('twin_id', effectiveTwinId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);

      if (runsError) throw runsError;
      if (!runs || runs.length === 0) return null;

      return runs[0];
    },
    enabled: !!effectiveTwinId,
  });

  // Parse KPIs from simulation run
  const baselineKpis: Record<string, number | null> = data?.baseline_kpis as Record<string, number | null> || {};
  const finalKpis: Record<string, number | null> = data?.final_kpis as Record<string, number | null> || {};

  // Merge baseline and final (final overrides baseline)
  const kpis: Record<string, number | null> = { ...baselineKpis, ...finalKpis };

  // Build enriched KPI values with status
  const kpiValues: TwinKPIValue[] = Object.entries(kpis).map(([key, value]) => {
    const definition = KPI_CATALOG[key as KPIKey];
    let status: 'safe' | 'warning' | 'critical' | 'unknown' = 'unknown';

    if (definition && value !== null) {
      if (definition.direction === 'lower_is_better') {
        if (value <= definition.target) status = 'safe';
        else if (value <= definition.criticalThreshold) status = 'warning';
        else status = 'critical';
      } else {
        if (value >= definition.target) status = 'safe';
        else if (value >= definition.criticalThreshold) status = 'warning';
        else status = 'critical';
      }
    }

    return { key, value, definition, status };
  });

  return {
    kpis,
    kpiValues,
    baselineKpis,
    finalKpis,
    loading: isLoading,
    error: error as Error | null,
    latestRunId: data?.id || null,
  };
}

/**
 * Hook to get specific KPI value with formatting
 */
export function useKPIValue(kpiKey: KPIKey, twinId?: string) {
  const { kpis, loading, error } = useTwinKPIsFromSimulation(twinId);
  const definition = KPI_CATALOG[kpiKey];
  const value = kpis[kpiKey] ?? null;

  const formatted = value !== null && definition
    ? `${value}${definition.unit}`
    : 'N/A';

  return {
    value,
    formatted,
    definition,
    loading,
    error,
  };
}
