/**
 * Optional-feature boundary for the guided-tour overlay.
 *
 * react-joyride and the tour registry are only fetched once a tour is
 * actually started, keeping them out of the synchronous shell core. The
 * overlay is a sibling of the route outlet with its own boundary.
 */
import { Suspense, lazy } from 'react';
import { useTour } from '@/context/TourContext';

const TourRenderer = lazy(() =>
  import('@/tours/TourRenderer').then((m) => ({ default: m.TourRenderer })),
);

export function LazyTourRenderer() {
  const { activeTourId } = useTour();
  if (!activeTourId) return null;
  return (
    <Suspense fallback={null}>
      <TourRenderer />
    </Suspense>
  );
}

export default LazyTourRenderer;
