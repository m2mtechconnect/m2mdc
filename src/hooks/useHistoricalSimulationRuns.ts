/**
 * Hook for loading historical simulation runs from the database
 * Used by the Simulation Comparison tab to compare past runs
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTwin } from '@/context/ActiveTwinContext';
import type { Database } from '@/integrations/supabase/types';

type SimulationRunRow = Database['public']['Tables']['simulation_runs']['Row'];

export interface SimulationRunForComparison {
  id: string;
  runId: string;
  scenarioId: string;
  scenarioName: string;
  startTime: Date;
  durationSeconds: number;
  status: string;
  createdAt: Date;
  baselineKpis: Record<string, number>;
  finalKpis: Record<string, number>;
  eventsCount: number;
  overallImpactScore: number;
}

export function useHistoricalSimulationRuns(options?: { limit?: number }) {
  const { activeTwinId } = useActiveTwin();
  const [runs, setRuns] = useState<SimulationRunForComparison[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    if (!activeTwinId) {
      setRuns([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('simulation_runs')
        .select('*')
        .eq('twin_id', activeTwinId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(options?.limit || 20);

      if (fetchError) {
        throw fetchError;
      }

      const mappedRuns: SimulationRunForComparison[] = (data || []).map((run: SimulationRunRow) => {
        const baselineKpis = (run.baseline_kpis as Record<string, number>) || {};
        const finalKpis = (run.final_kpis as Record<string, number>) || {};
        const events = (run.events as Array<unknown>) || [];

        // Calculate overall impact score from KPI deltas
        let impactScore = 0;
        const kpiCount = Object.keys(finalKpis).length;
        if (kpiCount > 0) {
          Object.keys(finalKpis).forEach(kpiId => {
            const baseline = baselineKpis[kpiId] || 0;
            const final = finalKpis[kpiId] || 0;
            if (baseline !== 0) {
              impactScore += ((final - baseline) / Math.abs(baseline)) * 100;
            }
          });
          impactScore = impactScore / kpiCount;
        }

        return {
          id: run.id,
          runId: run.id,
          scenarioId: run.scenario_key,
          scenarioName: run.scenario_name || run.scenario_key,
          startTime: new Date(run.started_at),
          durationSeconds: Math.round((run.duration_ms || 0) / 1000),
          status: run.status,
          createdAt: new Date(run.created_at),
          baselineKpis,
          finalKpis,
          eventsCount: events.length,
          overallImpactScore: Math.round(impactScore * 10) / 10,
        };
      });

      setRuns(mappedRuns);
    } catch (err) {
      console.error('Error fetching historical simulation runs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load simulation runs');
    } finally {
      setIsLoading(false);
    }
  }, [activeTwinId, options?.limit]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  return {
    runs,
    isLoading,
    error,
    refetch: fetchRuns,
  };
}
