import { useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useTour } from '@/context/TourContext';
import { useActiveTwin } from '@/context/ActiveTwinContext';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { TourId } from './tourRegistry';
import { toast } from 'sonner';

interface AutoStartOptions {
  enabled?: boolean;
}

/**
 * Hook to auto-start tours based on route, tab, and user state.
 * 
 * Rules:
 * - Studio Intro: On first login when studioIntro.seen !== true
 * - Overview: On dashboard/overview route when not seen AND (activeTwin exists OR demo mode)
 * - Simulation: On simulation route when not seen AND (activeTwin exists OR demo mode)
 * - Blueprint: On blueprint/builder route when not seen AND (activeTwin exists OR preview mode)
 */
export function useTourAutoStart(options: AutoStartOptions = {}) {
  const { enabled = true } = options;
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const { isTourSeen, startTour, activeTourId, isLoading } = useTour();
  const { twin: activeTwin, isLoading: twinLoading } = useActiveTwin();
  
  const hasStartedRef = useRef<Set<TourId>>(new Set());
  const isDemo = searchParams.get('demo') === 'true';
  const isPreview = searchParams.get('preview') === 'true';

  // Get user state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!enabled || isLoading || twinLoading || activeTourId) return;
    if (!user) return; // Only auto-start for logged-in users

    const path = location.pathname;
    const hasContext = activeTwin || isDemo || isPreview;

    // Helper to start a tour only once per session
    const tryStartTour = (tourId: TourId, requiresContext: boolean = true) => {
      if (hasStartedRef.current.has(tourId)) return false;
      if (isTourSeen(tourId)) return false;
      
      if (requiresContext && !hasContext) {
        // Show toast only once
        if (!hasStartedRef.current.has('noContext' as TourId)) {
          toast.info('Select a Data Centre in the header to begin the tour.');
          hasStartedRef.current.add('noContext' as TourId);
        }
        return false;
      }

      hasStartedRef.current.add(tourId);
      startTour(tourId);
      return true;
    };

    // Studio Intro - check on any authenticated route (only once)
    if (!isTourSeen('studioIntro') && !hasStartedRef.current.has('studioIntro')) {
      // Delay slightly to let the UI settle
      const timer = setTimeout(() => {
        tryStartTour('studioIntro', false);
      }, 1500);
      return () => clearTimeout(timer);
    }

    // Overview Tour - dashboard or root routes
    if (path === '/' || path === '/dashboard' || path.includes('/data-centre-twin')) {
      // Check for overview tab or default view
      const tab = searchParams.get('tab');
      if (!tab || tab === 'overview') {
        tryStartTour('overview');
      }
    }

    // Simulation Tour
    if (path.includes('/simulation') || searchParams.get('tab') === 'simulation') {
      tryStartTour('simulation');
    }

    // Blueprint Tour
    if (path.includes('/blueprint') || path.includes('/builder')) {
      tryStartTour('blueprint');
    }

  }, [
    enabled,
    isLoading,
    twinLoading,
    activeTourId,
    user,
    location.pathname,
    searchParams,
    activeTwin,
    isDemo,
    isPreview,
    isTourSeen,
    startTour,
  ]);
}

/**
 * Hook to check if a specific tour should be available
 */
export function useTourAvailability(tourId: TourId): boolean {
  const { twin: activeTwin } = useActiveTwin();
  const [searchParams] = useSearchParams();
  
  const isDemo = searchParams.get('demo') === 'true';
  const isPreview = searchParams.get('preview') === 'true';

  // Studio intro is always available
  if (tourId === 'studioIntro') return true;

  // Other tours require context
  return !!(activeTwin || isDemo || isPreview);
}
