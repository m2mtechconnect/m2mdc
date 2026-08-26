/**
 * Route-level authorization for permission-bearing product routes.
 *
 * AdminRouteGuard covers the /admin/* plane and additionally requires
 * `resolution.status === 'internal'`. Product routes (/analytics, /deploy,
 * /manage/*, /app/agents, /settings/ai, /teams/access-control) are legitimately
 * reachable by tenant members, so they need the permission check WITHOUT the
 * internal-plane requirement.
 *
 * Before this guard, those routes were mounted unconditionally and only the
 * navigation hid the links. Menu hiding is not authorization: a signed-in user
 * who typed the URL reached the mounted page and its queries. Several of the
 * pages (AISettings, ManageAgents) perform no in-component check at all.
 *
 * Fails closed:
 *   - loading -> render a status region, never the protected page. The wait is
 *     time-boxed; a stalled authorization chain surfaces a recoverable state
 *     instead of an indefinite spinner.
 *   - unauthenticated -> redirect to sign-in
 *   - tenant-unresolved -> truthful access-denied with recovery guidance
 *   - pilot / missing permission -> redirect to /dashboard
 */

import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useRBAC } from '@/contexts/RBACContext';
import { useLoadingTimedOut } from '@/components/shared/BoundedLoading';
import type { Permission } from '@/auth/permissions';

export function PermissionRouteGuard({
  children,
  permission,
}: {
  children: ReactNode;
  /** The canonical permission declared for this destination in appNavigation.ts. */
  permission: Permission;
}) {
  const { resolution, can } = useRBAC();
  const stalled = useLoadingTimedOut(resolution.status === 'loading');

  if (resolution.status === 'loading') {
    if (stalled) {
      return (
        <div role="alert" className="space-y-3 p-6 text-sm">
          <p className="font-medium text-foreground">
            Permissions could not be confirmed.
          </p>
          <p className="text-muted-foreground">
            Access is withheld until authorization resolves. This page was not loaded.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              className="text-primary underline underline-offset-4"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
            <Link to="/sign-out" className="text-primary underline underline-offset-4">
              Sign out
            </Link>
          </div>
        </div>
      );
    }
    return (
      <div role="status" aria-live="polite" className="p-6 text-sm text-muted-foreground">
        Checking permissions...
      </div>
    );
  }

  if (resolution.status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  // Authenticated, but no organization could be verified as active. Say so
  // rather than bouncing silently: no tenant permission can be granted here.
  if (resolution.status === 'tenant-unresolved') {
    return (
      <div role="alert" className="space-y-3 p-6 text-sm">
        <p className="font-medium text-foreground">Access unavailable</p>
        <p className="text-muted-foreground">
          Your active organization is not resolved, so this page cannot be authorized.
        </p>
        <Link to="/account/settings" className="text-primary underline underline-offset-4">
          Resolve your organization
        </Link>
      </div>
    );
  }

  if (resolution.status === 'pilot' || !can(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}


export default PermissionRouteGuard;
