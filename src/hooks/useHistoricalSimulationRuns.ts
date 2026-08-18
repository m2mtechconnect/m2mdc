/**
 * Hook for loading historical simulation runs from the database
 * Used by the Simulation Comparison tab to compare past runs
 *
 * Reads through the canonical run-record model (Phase 7) so list, comparison
 * and debug surfaces share one mapping and one envelope.
 */

import { useState, useEffect, useCallback } from 'react';
import { useActiveTwin } from '@/context/ActiveTwinContext';
import { loadRunRecords } from '@/workspace/runRecords';

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
  /** Run envelope, cited by provenance UI. */
  engineVersion: string | null;
  executionOrigin: string | null;
  validationStatus: string | null;
  recordCitation: string;
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
      const records = await loadRunRecords(activeTwinId, {
        limit: options?.limit || 20,
        status: 'completed',
      });
      setRuns(records);
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
