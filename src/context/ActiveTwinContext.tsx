/**
 * Active Twin Context - Global state for multi-tenant DC studio
 * Provides location/twin selection that scopes all views
 * 
 * IMPORTANT: This is the SINGLE SOURCE OF TRUTH for active twin selection.
 * URL scans and recommendations are preview-only and do NOT affect this context.
 * The dropdown selector controls the entire studio context.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { useRecommendationStore } from '@/stores/recommendationStore';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';

// Types
export interface DataCentreLocation {
  id: string;
  name: string;
  city: string;
  province: string | null;
  country: string;
  cloud_region: string | null;
  provider_type: string;
  industry: string;
  capacity_kw: number;
  tier: string;
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DataCentreTwin {
  id: string;
  location_id: string | null;
  name: string;
  city: string;
  region_code: string;
  tier: string;
  capacity_kw: number;
  industry: string | null;
  sovereignty_level: string | null;
  pue_target: number | null;
  renewable_target_pct: number | null;
  carbon_intensity: number | null;
  metadata: Record<string, unknown> | null;
  blueprint_id: string | null;
  created_by_user: string;
  created_at: string;
  updated_at: string;
}

export interface ActiveTwinContextValue {
  // Current selection
  activeLocationId: string | null;
  activeTwinId: string | null;
  location: DataCentreLocation | null;
  twin: DataCentreTwin | null;
  
  // All available locations/twins for the user
  locations: DataCentreLocation[];
  twins: DataCentreTwin[];
  
  // Loading states
  isLoading: boolean;
  isInitialized: boolean;
  
  // Actions
  setActiveLocation: (locationId: string | null) => void;
  setActiveTwin: (twinId: string) => void;
  refreshLocations: () => Promise<void>;
  refreshTwins: () => Promise<void>;
  createLocation: (data: Partial<DataCentreLocation>) => Promise<DataCentreLocation | null>;
  createTwin: (locationId: string | null, data: Partial<DataCentreTwin>) => Promise<DataCentreTwin | null>;
  deleteTwin: (twinId: string) => Promise<boolean>;
  clearActiveTwin: () => void;
}

const STORAGE_KEY_LOCATION = 'dc_active_location_id';
const STORAGE_KEY_TWIN = 'dc_active_twin_id';

const ActiveTwinContext = createContext<ActiveTwinContextValue | undefined>(undefined);

export function ActiveTwinProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Lifecycle tracking. `mountedRef` is cleared on provider unmount so
  // late resolutions from disposed fetches do not update state or log
  // errors. `fetchGenRef` tracks the currently-authoritative request per
  // resource; older generations are treated as superseded.
  const mountedRef = useRef(true);
  const locationGenRef = useRef(0);
  const twinGenRef = useRef(0);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  
  // State
  const [activeLocationId, setActiveLocationIdState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_LOCATION);
  });
  const [activeTwinId, setActiveTwinIdState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_TWIN);
  });
  
  const [location, setLocation] = useState<DataCentreLocation | null>(null);
  const [twin, setTwin] = useState<DataCentreTwin | null>(null);
  const [locations, setLocations] = useState<DataCentreLocation[]>([]);
  const [twins, setTwins] = useState<DataCentreTwin[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Get user on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // Fetch all locations for the user
  const refreshLocations = useCallback(async () => {
    if (!user) {
      setLocations([]);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('data_centre_locations')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setLocations((data || []) as DataCentreLocation[]);
    } catch (err) {
      console.error('Failed to fetch locations:', err);
      setLocations([]);
    }
  }, [user]);

  // Fetch all twins for the user
  const refreshTwins = useCallback(async () => {
    if (!user) {
      setTwins([]);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('data_centre_twins')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setTwins((data || []) as DataCentreTwin[]);
    } catch (err) {
      console.error('Failed to fetch twins:', err);
      setTwins([]);
    }
  }, [user]);

  // Lifecycle-aware cancellation. A rejection is treated as an expected
  // cancellation ONLY when we can prove the request is obsolete via
  // explicit lifecycle state (provider unmounted OR a newer generation
  // has been issued). Message-text inspection alone is NOT sufficient —
  // a genuine offline / CORS / DNS failure on a live request must still
  // surface as an error so operators see it.
  const isSupersededOrDisposed = (
    genRef: React.MutableRefObject<number>,
    localGen: number,
  ): boolean => !mountedRef.current || genRef.current !== localGen;

  const fetchLocation = useCallback(async (locationId: string) => {
    const gen = ++locationGenRef.current;
    try {
      const { data, error } = await supabase
        .from('data_centre_locations')
        .select('*')
        .eq('id', locationId)
        .maybeSingle();

      if (isSupersededOrDisposed(locationGenRef, gen)) return null;

      if (error) {
        if ((error as { code?: string }).code === 'PGRST116') return null;
        console.error('Failed to fetch location:', error);
        return null;
      }
      return (data as DataCentreLocation | null) ?? null;
    } catch (err) {
      // Only swallow when the request is provably obsolete. A genuine
      // transport failure on a live/current request still logs.
      if (isSupersededOrDisposed(locationGenRef, gen)) return null;
      console.error('Failed to fetch location:', err);
      return null;
    }
  }, []);

  const fetchTwin = useCallback(async (twinId: string) => {
    const gen = ++twinGenRef.current;
    try {
      const { data, error } = await supabase
        .from('data_centre_twins')
        .select('*')
        .eq('id', twinId)
        .maybeSingle();

      if (isSupersededOrDisposed(twinGenRef, gen)) return null;

      if (error) {
        if ((error as { code?: string }).code === 'PGRST116') return null;
        console.error('Failed to fetch twin:', error);
        return null;
      }
      return (data as DataCentreTwin | null) ?? null;
    } catch (err) {
      if (isSupersededOrDisposed(twinGenRef, gen)) return null;
      console.error('Failed to fetch twin:', err);
      return null;
    }
  }, []);

  // Set active location (and auto-select first twin for that location)
  const setActiveLocation = useCallback(async (locationId: string | null) => {
    setActiveLocationIdState(locationId);
    
    if (locationId) {
      localStorage.setItem(STORAGE_KEY_LOCATION, locationId);
      const loc = await fetchLocation(locationId);
      setLocation(loc);
      
      // Auto-select first twin for this location
      const locationTwins = twins.filter(t => t.location_id === locationId);
      if (locationTwins.length > 0) {
        setActiveTwin(locationTwins[0].id);
      } else {
        // No twins for this location
        setActiveTwinIdState(null);
        localStorage.removeItem(STORAGE_KEY_TWIN);
        setTwin(null);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY_LOCATION);
      setLocation(null);
      setActiveTwinIdState(null);
      localStorage.removeItem(STORAGE_KEY_TWIN);
      setTwin(null);
    }
  }, [twins, fetchLocation]);

  // Set active twin
  const setActiveTwin = useCallback(async (twinId: string) => {
    console.log('[ActiveTwinContext] Setting active twin:', twinId);
    setActiveTwinIdState(twinId);
    localStorage.setItem(STORAGE_KEY_TWIN, twinId);
    
    // CRITICAL: Clear any active recommendation when switching twins
    // This ensures recommendations don't leak into real twin views
    const { clearRecommendation } = useRecommendationStore.getState();
    clearRecommendation();
    
    // CRITICAL: Reset builder store when switching to a real twin
    // This prevents builder state from leaking into real twin views
    const { reset } = useDCTwinBuilderStore.getState();
    reset();
    
    const t = await fetchTwin(twinId);
    setTwin(t);
    
    // If twin has a location_id, also set that
    if (t?.location_id && t.location_id !== activeLocationId) {
      setActiveLocationIdState(t.location_id);
      localStorage.setItem(STORAGE_KEY_LOCATION, t.location_id);
      const loc = await fetchLocation(t.location_id);
      setLocation(loc);
    }
  }, [activeLocationId, fetchTwin, fetchLocation]);

  // Create a new location
  const createLocation = useCallback(async (data: Partial<DataCentreLocation>): Promise<DataCentreLocation | null> => {
    if (!user) return null;
    
    try {
      const { data: newLocation, error } = await supabase
        .from('data_centre_locations')
        .insert({
          name: data.name || 'New Data Centre',
          city: data.city || 'Unknown',
          province: data.province,
          country: data.country || 'Canada',
          cloud_region: data.cloud_region,
          provider_type: data.provider_type || 'On-prem',
          industry: data.industry || 'cloud_saas',
          capacity_kw: data.capacity_kw || 5000,
          tier: data.tier || 'Tier III',
          tags: data.tags || [],
          created_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      await refreshLocations();
      return newLocation as DataCentreLocation;
    } catch (err) {
      console.error('Failed to create location:', err);
      return null;
    }
  }, [user, refreshLocations]);

  // Create a new twin for a location (locationId can be null for legacy twins)
  const createTwin = useCallback(async (locationId: string | null, data: Partial<DataCentreTwin>): Promise<DataCentreTwin | null> => {
    if (!user) return null;
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insertPayload: any = {
        name: data.name || 'New Digital Twin',
        city: data.city || 'Unknown',
        region_code: data.region_code || 'ca-central-1',
        tier: data.tier || 'Tier III',
        capacity_kw: data.capacity_kw || 5000,
        industry: data.industry,
        sovereignty_level: data.sovereignty_level || 'standard',
        pue_target: data.pue_target || 1.3,
        renewable_target_pct: data.renewable_target_pct || 80,
        carbon_intensity: data.carbon_intensity || 30,
        metadata: data.metadata || {},
        created_by_user: user.id,
      };
      
      if (locationId) {
        insertPayload.location_id = locationId;
      }
      
      const { data: newTwin, error } = await supabase
        .from('data_centre_twins')
        .insert(insertPayload)
        .select()
        .single();
      
      await refreshTwins();
      return newTwin as DataCentreTwin;
    } catch (err) {
      console.error('Failed to create twin:', err);
      return null;
    }
  }, [user, refreshTwins]);

  // Delete a twin
  const deleteTwin = useCallback(async (twinId: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('data_centre_twins')
        .delete()
        .eq('id', twinId);
      
      if (error) throw error;
      
      // Clear active twin if it was the deleted one
      if (activeTwinId === twinId) {
        clearActiveTwin();
      }
      
      await refreshTwins();
      return true;
    } catch (err) {
      console.error('Failed to delete twin:', err);
      return false;
    }
  }, [user, activeTwinId, refreshTwins]);

  // Clear active twin selection
  const clearActiveTwin = useCallback(() => {
    setActiveTwinIdState(null);
    setTwin(null);
    localStorage.removeItem(STORAGE_KEY_TWIN);
    
    // Also clear location
    setActiveLocationIdState(null);
    setLocation(null);
    localStorage.removeItem(STORAGE_KEY_LOCATION);
  }, []);

  // Initialize on mount and user change
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      
      if (user) {
        await Promise.all([refreshLocations(), refreshTwins()]);
      }
      
      setIsLoading(false);
      setIsInitialized(true);
    };
    
    initialize();
  }, [user, refreshLocations, refreshTwins]);

  // Load active location/twin from storage after twins are loaded
  useEffect(() => {
    const loadFromStorage = async () => {
      if (!isInitialized || twins.length === 0) return;
      
      const storedTwinId = localStorage.getItem(STORAGE_KEY_TWIN);
      const storedLocationId = localStorage.getItem(STORAGE_KEY_LOCATION);
      
      // Try to load stored twin
      if (storedTwinId) {
        const t = twins.find(tw => tw.id === storedTwinId);
        if (t) {
          setTwin(t as DataCentreTwin);
          setActiveTwinIdState(storedTwinId);
          
          if (t.location_id) {
            setActiveLocationIdState(t.location_id);
            const loc = await fetchLocation(t.location_id);
            setLocation(loc);
          }
          return;
        }
      }
      
      // Try to load stored location
      if (storedLocationId) {
        const loc = locations.find(l => l.id === storedLocationId);
        if (loc) {
          setLocation(loc);
          setActiveLocationIdState(storedLocationId);
          
          // Auto-select first twin for this location
          const locationTwins = twins.filter(t => t.location_id === storedLocationId);
          if (locationTwins.length > 0) {
            setTwin(locationTwins[0] as DataCentreTwin);
            setActiveTwinIdState(locationTwins[0].id);
            localStorage.setItem(STORAGE_KEY_TWIN, locationTwins[0].id);
          }
          return;
        }
      }
      
      // No stored selection - auto-select first twin if available
      if (twins.length > 0) {
        const firstTwin = twins[0];
        setTwin(firstTwin as DataCentreTwin);
        setActiveTwinIdState(firstTwin.id);
        localStorage.setItem(STORAGE_KEY_TWIN, firstTwin.id);
        
        if (firstTwin.location_id) {
          setActiveLocationIdState(firstTwin.location_id);
          localStorage.setItem(STORAGE_KEY_LOCATION, firstTwin.location_id);
          const loc = await fetchLocation(firstTwin.location_id);
          setLocation(loc);
        }
      }
    };
    
    loadFromStorage();
  }, [isInitialized, twins, locations, fetchLocation]);

  const value: ActiveTwinContextValue = {
    activeLocationId,
    activeTwinId,
    location,
    twin,
    locations,
    twins,
    isLoading,
    isInitialized,
    setActiveLocation,
    setActiveTwin,
    refreshLocations,
    refreshTwins,
    createLocation,
    createTwin,
    deleteTwin,
    clearActiveTwin,
  };

  return (
    <ActiveTwinContext.Provider value={value}>
      {children}
    </ActiveTwinContext.Provider>
  );
}

export function useActiveTwin(): ActiveTwinContextValue {
  const context = useContext(ActiveTwinContext);
  if (context === undefined) {
    throw new Error('useActiveTwin must be used within an ActiveTwinProvider');
  }
  return context;
}
