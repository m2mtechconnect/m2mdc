import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { TourId } from '@/tours/tourRegistry';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

interface TourState {
  seen: boolean;
  completedAt?: string;
}

interface TourStateMap {
  [key: string]: TourState;
}

interface TourContextValue {
  tourState: TourStateMap;
  activeTourId: TourId | null;
  stepIndex: number;
  isLoading: boolean;
  startTour: (tourId: TourId) => void;
  completeTour: (tourId: TourId) => void;
  markSeen: (tourId: TourId) => void;
  resetTour: (tourId: TourId) => void;
  resetAllTours: () => void;
  isTourSeen: (tourId: TourId) => boolean;
  setActiveTourId: (id: TourId | null) => void;
  setStepIndex: (index: number) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

const LOCAL_STORAGE_KEY = 'm2m_tour_state_v1';

function getLocalTourState(): TourStateMap {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setLocalTourState(state: TourStateMap) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore localStorage errors
  }
}

// Type guard to validate tour state structure
function isValidTourStateMap(value: unknown): value is TourStateMap {
  if (typeof value !== 'object' || value === null) return false;
  return Object.values(value).every(
    (item) => typeof item === 'object' && item !== null && 'seen' in item
  );
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tourState, setTourState] = useState<TourStateMap>({});
  const [activeTourId, setActiveTourId] = useState<TourId | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Listen to auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load tour state from Supabase or localStorage
  useEffect(() => {
    async function loadTourState() {
      if (authLoading) return;

      if (user) {
        try {
          const { data, error } = await supabase
            .from('user_preferences')
            .select('tour_state')
            .eq('user_id', user.id)
            .maybeSingle();

          if (error) throw error;

          if (data?.tour_state && isValidTourStateMap(data.tour_state)) {
            const state = data.tour_state;
            setTourState(state);
            setLocalTourState(state); // Mirror to localStorage
          } else {
            // User exists but no preferences yet - use localStorage as fallback
            const localState = getLocalTourState();
            setTourState(localState);
          }
        } catch (error) {
          console.warn('Failed to load tour state from Supabase, using localStorage:', error);
          setTourState(getLocalTourState());
        }
      } else {
        // Not logged in - use localStorage
        setTourState(getLocalTourState());
      }

      setIsLoading(false);
    }

    loadTourState();
  }, [user, authLoading]);

  // Debounced save to Supabase
  const persistTourState = useCallback((newState: TourStateMap) => {
    // Always update localStorage immediately
    setLocalTourState(newState);

    if (!user) return;

    // Debounce Supabase writes
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        // Check if record exists first
        const { data: existing } = await supabase
          .from('user_preferences')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from('user_preferences')
            .update({
              tour_state: newState as unknown as Json,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);

          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase
            .from('user_preferences')
            .insert({
              user_id: user.id,
              tour_state: newState as unknown as Json,
            });

          if (error) throw error;
        }
      } catch (error) {
        console.warn('Failed to persist tour state to Supabase:', error);
      }
    }, 500);
  }, [user]);

  const startTour = useCallback((tourId: TourId) => {
    setStepIndex(0);
    setActiveTourId(tourId);
  }, []);

  const completeTour = useCallback((tourId: TourId) => {
    setTourState((prev) => {
      const newState = {
        ...prev,
        [tourId]: {
          seen: true,
          completedAt: new Date().toISOString(),
        },
      };
      persistTourState(newState);
      return newState;
    });
  }, [persistTourState]);

  const markSeen = useCallback((tourId: TourId) => {
    setTourState((prev) => {
      if (prev[tourId]?.seen) return prev;
      const newState = {
        ...prev,
        [tourId]: {
          seen: true,
        },
      };
      persistTourState(newState);
      return newState;
    });
  }, [persistTourState]);

  const resetTour = useCallback((tourId: TourId) => {
    setTourState((prev) => {
      const newState = { ...prev };
      delete newState[tourId];
      persistTourState(newState);
      return newState;
    });
    toast.success(`${tourId === 'studioIntro' ? 'Studio Intro' : tourId.charAt(0).toUpperCase() + tourId.slice(1)} tour reset`);
  }, [persistTourState]);

  const resetAllTours = useCallback(() => {
    setTourState({});
    persistTourState({});
    toast.success('All tours reset. They will start automatically on relevant pages.');
  }, [persistTourState]);

  const isTourSeen = useCallback((tourId: TourId) => {
    return tourState[tourId]?.seen === true;
  }, [tourState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <TourContext.Provider
      value={{
        tourState,
        activeTourId,
        stepIndex,
        isLoading,
        startTour,
        completeTour,
        markSeen,
        resetTour,
        resetAllTours,
        isTourSeen,
        setActiveTourId,
        setStepIndex,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
