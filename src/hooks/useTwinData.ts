/**
 * useTwinData - Hooks for fetching twin-scoped data
 * All data queries are automatically filtered by the current twin
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTwin } from '@/context/ActiveTwinContext';
import { loadRunRecords } from '@/workspace/runRecords';

// Phase 11 - metric identity consolidation.
// Observed telemetry is read from `twin_property_values` through
// `@/telemetry/useFacilityTelemetry` (provenance-bearing, data-mode resolved).
// KPIs are read from the canonical `simulation_runs` envelope through
// `@/hooks/useTwinKPIsFromSimulation`. The legacy `twin_telemetry` and
// `twin_kpi_snapshots` generations carried no provenance and are deprecated,
// so no hook in this module reads or writes them.

// Simulation runs for the active twin.
// Reads the canonical `simulation_runs` table (Phase 7); the legacy
// `twin_simulation_runs` generation carried no run envelope and is deprecated.
export function useTwinSimulations() {
  const { activeTwinId: twinId } = useActiveTwin();
  
  return useQuery({
    queryKey: ['twin-simulations', twinId],
    queryFn: () => loadRunRecords(twinId, { limit: 50 }),
    enabled: !!twinId,
  });
}

// Twin Sovereignty Events
export function useTwinSovereigntyEvents(options?: { severity?: string; limit?: number }) {
  const { activeTwinId: twinId } = useActiveTwin();
  
  return useQuery({
    queryKey: ['twin-sovereignty', twinId, options],
    queryFn: async () => {
      if (!twinId) return [];
      
      let query = supabase
        .from('twin_sovereignty_events')
        .select('*')
        .eq('twin_id', twinId)
        .order('occurred_at', { ascending: false });
      
      if (options?.severity) {
        query = query.eq('severity', options.severity);
      }
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!twinId,
  });
}

// Twin Carbon Emissions
export function useTwinCarbonEmissions(options?: { days?: number }) {
  const { activeTwinId: twinId } = useActiveTwin();
  const days = options?.days || 30;
  
  return useQuery({
    queryKey: ['twin-carbon', twinId, days],
    queryFn: async () => {
      if (!twinId) return [];
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('twin_carbon_emissions')
        .select('*')
        .eq('twin_id', twinId)
        .gte('period_start', startDate.toISOString())
        .order('period_start', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!twinId,
  });
}

// Twin Financial Records
export function useTwinFinancials(options?: { type?: string; days?: number }) {
  const { activeTwinId: twinId } = useActiveTwin();
  
  return useQuery({
    queryKey: ['twin-financials', twinId, options],
    queryFn: async () => {
      if (!twinId) return [];
      
      let query = supabase
        .from('twin_financial_records')
        .select('*')
        .eq('twin_id', twinId)
        .order('period_start', { ascending: false });
      
      if (options?.type) {
        query = query.eq('record_type', options.type);
      }
      
      if (options?.days) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - options.days);
        query = query.gte('period_start', startDate.toISOString());
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!twinId,
  });
}

// Twin Agents
export function useTwinAgents() {
  const { activeTwinId: twinId } = useActiveTwin();
  
  return useQuery({
    queryKey: ['twin-agents', twinId],
    queryFn: async () => {
      if (!twinId) return [];
      
      const { data, error } = await supabase
        .from('agent_definitions')
        .select('*')
        .eq('twin_id', twinId)
        .order('domain', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!twinId,
  });
}

// Twin Agent Runs
export function useTwinAgentRuns(agentId?: string) {
  const { activeTwinId: twinId } = useActiveTwin();
  
  return useQuery({
    queryKey: ['twin-agent-runs', twinId, agentId],
    queryFn: async () => {
      if (!twinId) return [];
      
      let query = supabase
        .from('agent_definition_runs')
        .select('*, agent_definitions(*)')
        .eq('twin_id', twinId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (agentId) {
        query = query.eq('agent_definition_id', agentId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!twinId,
  });
}

// Insert Telemetry
export function useInsertTelemetry() {
  const { activeTwinId: twinId } = useActiveTwin();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      domain: string;
      metric_key: string;
      metric_value: number;
      metadata?: Record<string, any>;
    }) => {
      if (!twinId) throw new Error('No twin selected');
      
      const { data: telemetry, error } = await supabase
        .from('twin_telemetry')
        .insert({
          twin_id: twinId,
          domain: data.domain,
          metric_key: data.metric_key,
          metric_value: data.metric_value,
          metadata: data.metadata || {},
        })
        .select()
        .single();
      
      if (error) throw error;
      return telemetry;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['twin-telemetry', twinId, variables.domain] });
    },
  });
}

// Insert KPI Snapshot
export function useInsertKPI() {
  const { activeTwinId: twinId } = useActiveTwin();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      kpi_key: string;
      kpi_value: number;
      kpi_unit?: string;
      domain?: string;
    }) => {
      if (!twinId) throw new Error('No twin selected');
      
      const { data: kpi, error } = await supabase
        .from('twin_kpi_snapshots')
        .insert({
          twin_id: twinId,
          kpi_key: data.kpi_key,
          kpi_value: data.kpi_value,
          kpi_unit: data.kpi_unit,
          domain: data.domain,
        })
        .select()
        .single();
      
      if (error) throw error;
      return kpi;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['twin-kpis', twinId] });
    },
  });
}
