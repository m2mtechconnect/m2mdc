import { useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useTour } from '@/context/TourContext';
import { useActiveTwin } from '@/context/ActiveTwinContext';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { TourId } from './tourRegistry';
import { toast } from 'sonner';

interface AutoStartOptions {
  enabled?: boolean;
}

/** Auto-start core tours only on their canonical AURA DC workspace routes. */
export function useTourAutoStart(options: AutoStartOptions = {}) {
  const { enabled = true } = options;
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const { isTourSeen, startTour, activeTourId, isLoading } = useTour();
  const { twin: activeTwin, isLoading: twinLoading } = useActiveTwin();

  const hasStartedRef = useRef<Set<TourId>>(new Set());
  const noContextToastShownRef = useRef(false);
  const isDemo = searchParams.get('demo') === 'true';
  const isPreview = searchParams.get('preview') === 'true';

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
    if (!user) return;

    const path = location.pathname;
    const hasContext = activeTwin || isDemo || isPreview;

    const tryStartTour = (tourId: TourId, requiresContext: boolean = true) => {
      if (hasStartedRef.current.has(tourId)) return false;
      if (isTourSeen(tourId)) return false;

      if (requiresContext && !hasContext) {
        if (!noContextToastShownRef.current) {
          toast.info('Select a facility to begin the guided tour.');
          noContextToastShownRef.current = true;
        }
        return false;
      }

      hasStartedRef.current.add(tourId);
      startTour(tourId);
      return true;
    };

    if (!isTourSeen('studioIntro') && !hasStartedRef.current.has('studioIntro')) {
      const timer = window.setTimeout(() => {
        tryStartTour('studioIntro', false);
      }, 1500);
      return () => window.clearTimeout(timer);
    }

    if (path === '/dashboard') {
      tryStartTour('overview');
    }

    if (path === '/simulation' || path.startsWith('/simulation/')) {
      tryStartTour('simulation');
    }

    if (path === '/blueprint' || path.startsWith('/blueprint/')) {
      tryStartTour('blueprint');
    }
  }, [
    enabled,
    isLoading,
    twinLoading,
    activeTourId,
    user,
    location.pathname,
    activeTwin,
    isDemo,
    isPreview,
    isTourSeen,
    startTour,
  ]);
}

export function useTourAvailability(tourId: TourId): boolean {
  const { twin: activeTwin } = useActiveTwin();
  const [searchParams] = useSearchParams();

  const isDemo = searchParams.get('demo') === 'true';
  const isPreview = searchParams.get('preview') === 'true';

  if (tourId === 'studioIntro') return true;
  return !!(activeTwin || isDemo || isPreview);
}
