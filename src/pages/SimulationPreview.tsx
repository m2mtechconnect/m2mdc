import { Navigate, useLocation } from 'react-router-dom';

/**
 * Compatibility route for the retired recommendation-only simulation preview.
 * AURA now has one simulation product surface. Old deep links are preserved by
 * forwarding query and hash to the canonical Simulation workspace.
 */
export default function SimulationPreview() {
  const location = useLocation();
  const suffix = `${location.search}${location.hash}`;
  return <Navigate to={`/simulation${suffix}`} replace />;
}
