/**
 * Simulation Persistence Hook
 * Handles saving and loading simulation runs to/from the database
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface SimulationRunRecord {
  id: string;
  twin_id: string;
  user_id: string;
  scenario_key: string;
  scenario_name: string | null;
  run_label: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  baseline_kpis: Record<string, number>;
  final_kpis: Record<string, number>;
  kpi_snapshots: Record<string, unknown>[];
  events: Record<string, unknown>[];
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SaveSimulationParams {
  twinId: string;
  scenarioKey: string;
  scenarioName?: string;
  runLabel?: string;
  baselineKpis: Record<string, number>;
  finalKpis: Record<string, number>;
  kpiSnapshots: Record<string, unknown>[];
  events: Record<string, unknown>[];
  durationMs: number;
  metadata?: Record<string, unknown>;
}

export function useSimulationPersistence() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Start a new simulation run (creates pending record)
   */
  const startSimulationRun = useCallback(async (
    twinId: string,
    scenarioKey: string,
    scenarioName?: string,
    baselineKpis?: Record<string, number>
  ): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('[SimulationPersistence] No user logged in');
        return null;
      }

      const { data, error: insertError } = await supabase
        .from('simulation_runs')
        .insert({
          twin_id: twinId,
          user_id: user.id,
          scenario_key: scenarioKey,
          scenario_name: scenarioName,
          status: 'running',
          started_at: new Date().toISOString(),
          baseline_kpis: baselineKpis || {},
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[SimulationPersistence] Failed to start run:', insertError);
        return null;
      }

      console.log('[SimulationPersistence] Started run:', data.id);
      return data.id;
    } catch (err) {
      console.error('[SimulationPersistence] Error starting run:', err);
      return null;
    }
  }, []);

  /**
   * Complete a simulation run with results
   */
  const completeSimulationRun = useCallback(async (
    runId: string,
    params: Omit<SaveSimulationParams, 'twinId' | 'scenarioKey'>
  ): Promise<boolean> => {
    setIsSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('simulation_runs')
        .update({
          status: 'completed',
          finished_at: new Date().toISOString(),
          duration_ms: params.durationMs,
          final_kpis: params.finalKpis as Json,
          kpi_snapshots: params.kpiSnapshots as Json,
          events: params.events as Json,
          metadata: (params.metadata || {}) as Json,
          run_label: params.runLabel,
        })
        .eq('id', runId);

      if (updateError) {
        console.error('[SimulationPersistence] Failed to complete run:', updateError);
        toast.error('Failed to save simulation results');
        return false;
      }

      console.log('[SimulationPersistence] Completed run:', runId);
      toast.success('Simulation results saved');
      return true;
    } catch (err) {
      console.error('[SimulationPersistence] Error completing run:', err);
      toast.error('Failed to save simulation results');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Save a complete simulation run (one-shot)
   */
  const saveSimulationRun = useCallback(async (params: SaveSimulationParams): Promise<string | null> => {
    setIsSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        toast.error('Please log in to save simulation results');
        return null;
      }

      const { data, error: insertError } = await supabase
        .from('simulation_runs')
        .insert([{
          twin_id: params.twinId,
          user_id: user.id,
          scenario_key: params.scenarioKey,
          scenario_name: params.scenarioName,
          run_label: params.runLabel,
          status: 'completed' as const,
          started_at: new Date(Date.now() - params.durationMs).toISOString(),
          finished_at: new Date().toISOString(),
          duration_ms: params.durationMs,
          baseline_kpis: params.baselineKpis as Json,
          final_kpis: params.finalKpis as Json,
          kpi_snapshots: params.kpiSnapshots as Json,
          events: params.events as Json,
          metadata: (params.metadata || {}) as Json,
        }])
        .select('id')
        .single();

      if (insertError) {
        console.error('[SimulationPersistence] Save error:', insertError);
        setError(insertError.message);
        toast.error('Failed to save simulation');
        return null;
      }

      console.log('[SimulationPersistence] Saved run:', data.id);
      toast.success('Simulation saved successfully');
      return data.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[SimulationPersistence] Error:', err);
      setError(message);
      toast.error('Failed to save simulation');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Load simulation runs for a twin
   */
  const loadSimulationRuns = useCallback(async (
    twinId: string,
    options?: {
      scenarioKey?: string;
      status?: string;
      limit?: number;
    }
  ): Promise<SimulationRunRecord[]> => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('simulation_runs')
        .select('*')
        .eq('twin_id', twinId)
        .order('started_at', { ascending: false });

      if (options?.scenarioKey) {
        query = query.eq('scenario_key', options.scenarioKey);
      }
      if (options?.status) {
        query = query.eq('status', options.status);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('[SimulationPersistence] Load error:', fetchError);
        setError(fetchError.message);
        return [];
      }

      return (data || []) as SimulationRunRecord[];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[SimulationPersistence] Error:', err);
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load a single simulation run by ID
   */
  const loadSimulationRun = useCallback(async (runId: string): Promise<SimulationRunRecord | null> => {
    setIsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('simulation_runs')
        .select('*')
        .eq('id', runId)
        .single();

      if (fetchError) {
        console.error('[SimulationPersistence] Load run error:', fetchError);
        return null;
      }

      return data as SimulationRunRecord;
    } catch (err) {
      console.error('[SimulationPersistence] Error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Delete a simulation run
   */
  const deleteSimulationRun = useCallback(async (runId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('simulation_runs')
        .delete()
        .eq('id', runId);

      if (deleteError) {
        console.error('[SimulationPersistence] Delete error:', deleteError);
        toast.error('Failed to delete simulation');
        return false;
      }

      toast.success('Simulation deleted');
      return true;
    } catch (err) {
      console.error('[SimulationPersistence] Error:', err);
      toast.error('Failed to delete simulation');
      return false;
    }
  }, []);

  return {
    isLoading,
    isSaving,
    error,
    startSimulationRun,
    completeSimulationRun,
    saveSimulationRun,
    loadSimulationRuns,
    loadSimulationRun,
    deleteSimulationRun,
  };
}
