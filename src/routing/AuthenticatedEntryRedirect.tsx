/**
 * Authenticated behaviour for the unauthenticated entry routes (PW-P2-05).
 *
 * `/login` and `/onboarding` only exist in the signed-out router, so a
 * signed-in user previously fell through to the 404 page. A signed-in user is
 * now sent to their authorized default workspace, or to a supplied return
 * path when that path is a safe, same-origin, in-app route.
 */
import { Navigate, useSearchParams } from 'react-router-dom';

export const DEFAULT_AUTHENTICATED_ROUTE = '/dashboard';

/**
 * A return path is safe only when it is an in-app absolute path. Anything
 * protocol-relative, absolute-URL or backslash-escaped is rejected so an
 * open redirect cannot be smuggled through the entry routes.
 */
export function safeReturnPath(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/')) return null;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return null;
  if (/^\/+[a-z][a-z0-9+.-]*:/i.test(raw)) return null;
  return raw;
}

export function AuthenticatedEntryRedirect() {
  const [searchParams] = useSearchParams();
  const target =
    safeReturnPath(searchParams.get('returnTo') ?? searchParams.get('redirect')) ??
    DEFAULT_AUTHENTICATED_ROUTE;
  return <Navigate to={target} replace />;
}