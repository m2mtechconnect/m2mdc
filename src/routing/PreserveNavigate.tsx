/**
 * Stage 6F - redirect element that preserves deep-link context.
 *
 * React Router's <Navigate to="/x" /> discards the incoming query string
 * and hash, so an alias such as /intelligence?tab=thermal used to land on
 * a context-free /analytics. This wrapper carries `?search` across and
 * keeps the destination's own hash when it declares one.
 *
 * A destination may also declare its own query string (for example
 * `/manage/integrations?tab=activity`, so a retired monitoring route lands
 * on the equivalent view rather than a generic overview). Destination
 * parameters are defaults only: any key the incoming URL supplies wins, so
 * an existing deep link never loses its own context.
 *
 * Always redirects with `replace` so aliases never accumulate history
 * entries (a redirect loop would otherwise be indistinguishable from
 * normal back-navigation).
 */
import { Navigate, useLocation } from 'react-router-dom';

export function PreserveNavigate({ to }: { to: string }) {
  const location = useLocation();
  const [beforeHash, targetHash] = to.split('#');
  const [targetPath, targetQuery] = beforeHash.split('?');

  const merged = new URLSearchParams(targetQuery ?? '');
  // Incoming parameters override the destination's defaults.
  for (const [key, value] of new URLSearchParams(location.search ?? '')) {
    merged.set(key, value);
  }
  const mergedString = merged.toString();
  const search = mergedString ? `?${mergedString}` : '';
  const hash = targetHash ? `#${targetHash}` : (location.hash ?? '');
  return <Navigate to={`${targetPath}${search}${hash}`} replace />;
}

export default PreserveNavigate;
