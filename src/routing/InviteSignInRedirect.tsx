/**
 * Unauthenticated landing for an invite link. The token is preserved through
 * sign-in so the invite is redeemed by the account that actually signs in.
 */
import { Navigate, useLocation } from 'react-router-dom';

export function InviteSignInRedirect() {
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}`;
  return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
}
