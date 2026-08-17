/**
 * Takes over rendering for REFERENCE_DATA_CONSUMER routes while the admin
 * reference canary is active. The legacy page component is never mounted in
 * that case, which is what makes "zero runtime-reachable synthetic
 * dependencies" enforceable rather than aspirational.
 */
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useReferenceMode } from '@/data/dataset/DatasetProvider';
import { surfaceForPath } from '@/data/dataset/surfaceRegistry';
import ReferenceSurface from './ReferenceSurface';
import ReferenceUnavailableSurface from './ReferenceUnavailableSurface';

export function ReferenceRouteGate({ children }: { children: ReactNode }) {
  const referenceMode = useReferenceMode();
  const { pathname } = useLocation();
  const surface = surfaceForPath(pathname);

  if (referenceMode && surface) {
    if (surface.classification === 'REFERENCE_DATA_CONSUMER') {
      return <ReferenceSurface surface={surface} />;
    }
    // A route the reference dataset cannot source is never allowed to fall
    // through to its synthetic fixture implementation.
    if (surface.classification === 'REFERENCE_UNAVAILABLE') {
      return <ReferenceUnavailableSurface surface={surface} />;
    }
  }
  return <>{children}</>;
}

export default ReferenceRouteGate;