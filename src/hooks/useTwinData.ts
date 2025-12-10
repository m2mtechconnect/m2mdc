/**
 * useTwinData - Hooks for fetching twin-scoped data
 * All data queries are automatically filtered by the current twin
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTwin } from '@/context/ActiveTwinContext';

// Twin Telemetry
export function useTwinTelemetry(domain?: string) {
  const { activeTwinId: twinId } = useActiveTwin();
  
  return useQuery({
    queryKey: ['twin-telemetry', twinId, domain],
    queryFn: async () => {
      if (!twinId) return [];
      
      let query = supabase
        .from('twin_telemetry')
        .select('*')
        .eq('twin_id', twinId)
        .order('recorded_at', { ascending: false })
        .limit(1000);
      
      if (domain) {
        query = query.eq('domain', domain);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!twinId,
  });
}

// Twin KPI Snapshots
export function useTwinKPIs(kpiKeys?: string[]) {
  const { activeTwinId: twinId } = useActiveTwin();
  
  return useQuery({
    queryKey: ['twin-kpis', twinId, kpiKeys],
    queryFn: async () => {
      if (!twinId) return [];
      
      let query = supabase
        .from('twin_kpi_snapshots')
        .select('*')
        .eq('twin_id', twinId)
        .order('snapshot_at', { ascending: false });
      
      if (kpiKeys && kpiKeys.length > 0) {
        query = query.in('kpi_key', kpiKeys);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!twinId,
  });
}

// Twin Simulation Runs
export function useTwinSimulations() {
  const { activeTwinId: twinId } = useActiveTwin();
  
  return useQuery({
    queryKey: ['twin-simulations', twinId],
    queryFn: async () => {
      if (!twinId) return [];
      
      const { data, error } = await supabase
        .from('twin_simulation_runs')
        .select('*')
        .eq('twin_id', twinId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!twinId,
  });
}

// Create Simulation Run
export function useCreateSimulationRun() {
  const { activeTwinId: twinId } = useActiveTwin();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      scenario_id: string;
      scenario_name?: string;
    }) => {
      if (!twinId) throw new Error('No twin selected');
      
      const { data: run, error } = await supabase
        .from('twin_simulation_runs')
        .insert({
          twin_id: twinId,
          scenario_id: data.scenario_id,
          scenario_name: data.scenario_name,
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      return run;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['twin-simulations', twinId] });
    },
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
