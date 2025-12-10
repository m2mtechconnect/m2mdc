/**
 * TwinContext - Global Data Centre Twin Context Provider
 * Provides multi-tenant isolation for the entire application
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DataCentreTwin {
  id: string;
  name: string;
  city: string;
  region_code: string;
  tier: string;
  capacity_kw: number;
  blueprint_id: string | null;
  created_by_user: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
  industry: string;
  pue_target: number;
  renewable_target_pct: number;
  carbon_intensity: number;
  sovereignty_level: string;
}

interface TwinContextType {
  twinId: string | null;
  setTwinId: (id: string | null) => void;
  twin: DataCentreTwin | null;
  twins: DataCentreTwin[];
  isLoading: boolean;
  error: string | null;
  refreshTwins: () => Promise<void>;
  createTwin: (data: Partial<DataCentreTwin>) => Promise<DataCentreTwin | null>;
  updateTwin: (id: string, data: Partial<DataCentreTwin>) => Promise<void>;
  deleteTwin: (id: string) => Promise<void>;
  hydrateDashboard: () => void;
  hydrateBlueprint: () => void;
  hydrateSimulation: () => void;
  hydrateAgents: () => void;
  hydrateSovereignty: () => void;
  hydrateCarbon: () => void;
  hydrateFinancial: () => void;
}

const TwinContext = createContext<TwinContextType>({
  twinId: null,
  setTwinId: () => {},
  twin: null,
  twins: [],
  isLoading: false,
  error: null,
  refreshTwins: async () => {},
  createTwin: async () => null,
  updateTwin: async () => {},
  deleteTwin: async () => {},
  hydrateDashboard: () => {},
  hydrateBlueprint: () => {},
  hydrateSimulation: () => {},
  hydrateAgents: () => {},
  hydrateSovereignty: () => {},
  hydrateCarbon: () => {},
  hydrateFinancial: () => {},
});

// Hydration event emitter for cross-component updates
const hydrationEvents = new EventTarget();

export const HYDRATION_EVENTS = {
  DASHBOARD: 'hydrate:dashboard',
  BLUEPRINT: 'hydrate:blueprint',
  SIMULATION: 'hydrate:simulation',
  AGENTS: 'hydrate:agents',
  SOVEREIGNTY: 'hydrate:sovereignty',
  CARBON: 'hydrate:carbon',
  FINANCIAL: 'hydrate:financial',
  ALL: 'hydrate:all',
} as const;

export function useTwinHydration(event: string, callback: () => void) {
  useEffect(() => {
    hydrationEvents.addEventListener(event, callback);
    return () => hydrationEvents.removeEventListener(event, callback);
  }, [event, callback]);
}

interface TwinProviderProps {
  children: ReactNode;
}

export function TwinProvider({ children }: TwinProviderProps) {
  const [userId, setUserId] = useState<string | null>(null);
  
  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const [twinId, setTwinIdState] = useState<string | null>(() => {
    // Restore from localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedTwinId');
    }
    return null;
  });
  const [twin, setTwin] = useState<DataCentreTwin | null>(null);
  const [twins, setTwins] = useState<DataCentreTwin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set twin ID and persist to localStorage
  const setTwinId = useCallback((id: string | null) => {
    setTwinIdState(id);
    if (id) {
      localStorage.setItem('selectedTwinId', id);
    } else {
      localStorage.removeItem('selectedTwinId');
    }
    // Trigger global hydration
    hydrationEvents.dispatchEvent(new Event(HYDRATION_EVENTS.ALL));
  }, []);

  // Fetch all twins for the current user
  const refreshTwins = useCallback(async () => {
    if (!userId) {
      setTwins([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('data_centre_twins')
        .select('*')
        .eq('created_by_user', userId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setTwins((data as DataCentreTwin[]) || []);
    } catch (err) {
      console.error('Failed to fetch twins:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch twins');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Fetch current twin details when twinId changes
  useEffect(() => {
    const fetchTwin = async () => {
      if (!twinId) {
        setTwin(null);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('data_centre_twins')
          .select('*')
          .eq('id', twinId)
          .maybeSingle();

        if (fetchError) throw fetchError;
        setTwin(data as DataCentreTwin | null);
      } catch (err) {
        console.error('Failed to fetch twin:', err);
        setTwin(null);
      }
    };

    fetchTwin();
  }, [twinId]);

  // Initial fetch when user changes
  useEffect(() => {
    refreshTwins();
  }, [refreshTwins]);

  // Auto-select first twin if none selected
  useEffect(() => {
    if (!twinId && twins.length > 0) {
      setTwinId(twins[0].id);
    }
  }, [twins, twinId, setTwinId]);

  // Create a new twin
  const createTwin = useCallback(async (data: Partial<DataCentreTwin>): Promise<DataCentreTwin | null> => {
    if (!userId) return null;

    try {
      const insertData = {
        name: data.name || 'New Twin',
        city: data.city || 'Unknown',
        region_code: data.region_code || 'ca-central-1',
        tier: data.tier || 'III',
        capacity_kw: data.capacity_kw || 1000,
        created_by_user: userId,
        industry: data.industry || 'technology',
        pue_target: data.pue_target || 1.4,
        renewable_target_pct: data.renewable_target_pct || 50,
        carbon_intensity: data.carbon_intensity || 30,
        sovereignty_level: data.sovereignty_level || 'standard',
        metadata: data.metadata || {},
      };

      const { data: newTwin, error: createError } = await supabase
        .from('data_centre_twins')
        .insert(insertData)
        .select()
        .single();

      if (createError) throw createError;
      
      await refreshTwins();
      setTwinId(newTwin.id);
      
      return newTwin as DataCentreTwin;
    } catch (err) {
      console.error('Failed to create twin:', err);
      throw err;
    }
  }, [userId, refreshTwins, setTwinId]);

  // Update a twin
  const updateTwin = useCallback(async (id: string, data: Partial<DataCentreTwin>) => {
    try {
      const { error: updateError } = await supabase
        .from('data_centre_twins')
        .update(data)
        .eq('id', id);

      if (updateError) throw updateError;
      
      await refreshTwins();
      hydrationEvents.dispatchEvent(new Event(HYDRATION_EVENTS.ALL));
    } catch (err) {
      console.error('Failed to update twin:', err);
      throw err;
    }
  }, [refreshTwins]);

  // Delete a twin
  const deleteTwin = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('data_centre_twins')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      if (twinId === id) {
        setTwinId(null);
      }
      
      await refreshTwins();
    } catch (err) {
      console.error('Failed to delete twin:', err);
      throw err;
    }
  }, [twinId, refreshTwins, setTwinId]);

  // Hydration functions
  const hydrateDashboard = useCallback(() => {
    hydrationEvents.dispatchEvent(new Event(HYDRATION_EVENTS.DASHBOARD));
  }, []);

  const hydrateBlueprint = useCallback(() => {
    hydrationEvents.dispatchEvent(new Event(HYDRATION_EVENTS.BLUEPRINT));
  }, []);

  const hydrateSimulation = useCallback(() => {
    hydrationEvents.dispatchEvent(new Event(HYDRATION_EVENTS.SIMULATION));
  }, []);

  const hydrateAgents = useCallback(() => {
    hydrationEvents.dispatchEvent(new Event(HYDRATION_EVENTS.AGENTS));
  }, []);

  const hydrateSovereignty = useCallback(() => {
    hydrationEvents.dispatchEvent(new Event(HYDRATION_EVENTS.SOVEREIGNTY));
  }, []);

  const hydrateCarbon = useCallback(() => {
    hydrationEvents.dispatchEvent(new Event(HYDRATION_EVENTS.CARBON));
  }, []);

  const hydrateFinancial = useCallback(() => {
    hydrationEvents.dispatchEvent(new Event(HYDRATION_EVENTS.FINANCIAL));
  }, []);

  const value: TwinContextType = {
    twinId,
    setTwinId,
    twin,
    twins,
    isLoading,
    error,
    refreshTwins,
    createTwin,
    updateTwin,
    deleteTwin,
    hydrateDashboard,
    hydrateBlueprint,
    hydrateSimulation,
    hydrateAgents,
    hydrateSovereignty,
    hydrateCarbon,
    hydrateFinancial,
  };

  return (
    <TwinContext.Provider value={value}>
      {children}
    </TwinContext.Provider>
  );
}

export function useTwinContext() {
  const context = useContext(TwinContext);
  if (!context) {
    throw new Error('useTwinContext must be used within a TwinProvider');
  }
  return context;
}

// Hook for getting twin-scoped query filters
export function useTwinQuery() {
  const { twinId } = useTwinContext();
  
  return {
    twinId,
    withTwinFilter: <T extends Record<string, any>>(query: T) => ({
      ...query,
      twin_id: twinId,
    }),
    hasTwin: !!twinId,
  };
}

export { TwinContext };
