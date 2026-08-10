/**
 * Stage 6F - redirect element that preserves deep-link context.
 *
 * React Router's <Navigate to="/x" /> discards the incoming query string
 * and hash, so an alias such as /intelligence?tab=thermal used to land on
 * a context-free /analytics. This wrapper carries `?search` across and
 * keeps the destination's own hash when it declares one.
 *
 * Always redirects with `replace` so aliases never accumulate history
 * entries (a redirect loop would otherwise be indistinguishable from
 * normal back-navigation).
 */
import { Navigate, useLocation } from 'react-router-dom';

export function PreserveNavigate({ to }: { to: string }) {
  const location = useLocation();
  const [targetPath, targetHash] = to.split('#');
  const search = location.search ?? '';
  const hash = targetHash ? `#${targetHash}` : (location.hash ?? '');
  return <Navigate to={`${targetPath}${search}${hash}`} replace />;
}

export default PreserveNavigate;
