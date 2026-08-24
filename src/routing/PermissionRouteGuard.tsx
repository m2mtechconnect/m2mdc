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
 *   - loading -> render a status region, never the protected page
 *   - pilot / missing permission -> redirect to /dashboard
 */

import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useRBAC } from '@/contexts/RBACContext';
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

  if (resolution.status === 'loading') {
    return (
      <div role="status" aria-live="polite" className="p-6 text-sm text-muted-foreground">
        Checking permissions...
      </div>
    );
  }

  if (resolution.status === 'pilot' || !can(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default PermissionRouteGuard;
