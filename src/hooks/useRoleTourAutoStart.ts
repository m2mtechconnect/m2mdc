import { useEffect } from 'react';
import { useTour } from '@/context/TourContext';
import { useRBAC } from '@/contexts/RBACContext';
import type { TourId } from '@/tours/tourRegistry';
import type { AppRole } from '@/contexts/RBACContext';

const roleTourMap: Record<string, TourId> = {
  executive: 'role_executive',
  manager: 'role_manager',
  engineer: 'role_engineer',
  security_admin: 'role_security_admin',
};

/**
 * Auto-starts the role-specific dashboard tour on first visit.
 * Should be called from the Dashboard page.
 */
export function useRoleTourAutoStart() {
  const { role, loading: rbacLoading } = useRBAC();
  const { isTourSeen, startTour, activeTourId, isLoading: tourLoading } = useTour();

  useEffect(() => {
    if (rbacLoading || tourLoading || activeTourId) return;
    if (!role) return;

    const tourId = roleTourMap[role];
    if (!tourId) return;

    if (!isTourSeen(tourId)) {
      // Delay to let dashboard DOM render
      const timer = setTimeout(() => startTour(tourId), 600);
      return () => clearTimeout(timer);
    }
  }, [role, rbacLoading, tourLoading, activeTourId, isTourSeen, startTour]);
}
