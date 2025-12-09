/**
 * useKpi Hook - Unified KPI Data Source
 * 
 * PURPOSE: Single source of truth for KPI metrics across Dashboard and Intelligence pages
 * 
 * DATA SOURCES:
 * - roi_growth: Queries rpc_kpi_roi_growth() → roi_snapshots table
 * - time_saved: Queries rpc_kpi_time_saved() → roi_snapshots table (time_saved_week field)
 * - compliance_accuracy: Queries rpc_kpi_compliance_accuracy() → agent_runs table (citations field)
 * - agents_deployed: Queries rpc_kpi_agents_deployed() → agents table (status, deployed_at)
 * 
 * USAGE:
 * - Dashboard KPI cards use this for summary metrics
 * - Intelligence Dashboard uses this for detailed analytics
 * - Both pages show identical values for same time period
 * 
 * FEATURES:
 * - Real-time data from Supabase RPC functions
 * - Automatic period-over-period delta calculation
 * - Loading states and error handling
 * - Type-safe formatting (%, hours, counts)
 * 
 * EMPTY STATE:
 * - Returns zeros when no data exists (new workspace)
 * - UI shows helpful "Deploy first system" message
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDateRangeStore } from '@/stores/dateRangeStore';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';

interface KpiResult {
  value: number;
  delta: number;
  formatted: string;
  deltaFormatted: string;
  loading: boolean;
  error: Error | null;
}

type KpiType = 'roi_growth' | 'time_saved' | 'compliance_accuracy' | 'agents_deployed';

const formatPercent = (value: number): string => {
  return `${Math.round(value)}%`;
};

const formatHours = (value: number): string => {
  return value === 0 ? '--' : `${value.toFixed(1)}h`;
};

const formatCount = (value: number): string => {
  return Math.round(value).toString();
};

const formatDelta = (delta: number, type: KpiType): string => {
  const sign = delta > 0 ? '+' : '';
  
  switch (type) {
    case 'roi_growth':
    case 'compliance_accuracy':
      return `${sign}${delta.toFixed(1)}%`;
    case 'time_saved':
      return `${sign}${Math.round(delta)}h`;
    case 'agents_deployed':
      return `${sign}${Math.round(delta)}`;
    default:
      return `${sign}${delta}`;
  }
};

export const useKpi = (type: KpiType): KpiResult => {
  const { toast } = useToast();
  const range = useDateRangeStore((state) => state.range);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const rpcMap: Record<KpiType, string> = {
    roi_growth: 'rpc_kpi_roi_growth',
    time_saved: 'rpc_kpi_time_saved',
    compliance_accuracy: 'rpc_kpi_compliance_accuracy',
    agents_deployed: 'rpc_kpi_agents_deployed',
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['kpi', type, range.from, range.to],
    queryFn: async () => {
      const rpcName = rpcMap[type];
      const { data, error } = await (supabase.rpc as any)(rpcName, {
        p_from: range.from,
        p_to: range.to,
        p_org_id: null,
      });

      if (error) throw error;
      return data?.[0] || { value: 0, delta: 0 };
    },
    enabled: isAuthenticated,
    staleTime: 60000, // Cache for 60s
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Handle errors with toast (moved to useEffect to prevent infinite loop)
  useEffect(() => {
    if (error && !isLoading) {
      toast({
        title: '❌ KPI Error',
        description: `Failed to load ${type.replace('_', ' ')}. Please try again.`,
        variant: 'destructive',
      });
    }
  }, [error, isLoading, type, toast]);

  // Extract values based on KPI type
  let value = 0;
  let delta = 0;

  if (data) {
    switch (type) {
      case 'roi_growth':
        value = data.roi_pct || 0;
        delta = data.delta_pct || 0;
        break;
      case 'time_saved':
        value = data.hours || 0;
        delta = data.delta_hours || 0;
        break;
      case 'compliance_accuracy':
        value = data.accuracy_pct || 0;
        delta = data.delta_pct || 0;
        break;
      case 'agents_deployed':
        value = data.active_count || 0;
        delta = data.delta_count || 0;
        break;
    }
  }

  // Format based on type
  let formatted = '';
  switch (type) {
    case 'roi_growth':
    case 'compliance_accuracy':
      formatted = formatPercent(value);
      break;
    case 'time_saved':
      formatted = formatHours(value);
      break;
    case 'agents_deployed':
      formatted = formatCount(value);
      break;
  }

  return {
    value,
    delta,
    formatted,
    deltaFormatted: formatDelta(delta, type),
    loading: isLoading,
    error: error as Error | null,
  };
};
