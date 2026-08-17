/**
 * Phase 11 - route-level authorization for every /admin/* destination.
 *
 * Before this guard, administration pages were mounted unconditionally by
 * AuthenticatedShell and relied on each page policing itself, while the nav
 * simply hid the links. Menu hiding is not authorization: a signed-in
 * non-admin who typed the URL reached the mounted page and its queries.
 *
 * This component fails closed:
 *   - loading  -> render nothing (never the protected page)
 *   - error    -> deny
 *   - pilot / non-internal / wrong role -> redirect to /dashboard
 */

import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useRBAC } from '@/contexts/RBACContext';
import type { AppRole } from '@/auth/permissions';

/** Roles permitted to reach an administration route. */
export const ADMIN_ROUTE_ROLES: AppRole[] = ['admin', 'super_admin'];

export function AdminRouteGuard({
  children,
  roles = ADMIN_ROUTE_ROLES,
}: {
  children: ReactNode;
  roles?: AppRole[];
}) {
  const { resolution, hasAccess } = useRBAC();

  if (resolution.status === 'loading') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="p-6 text-sm text-muted-foreground"
      >
        Checking administrator permissions...
      </div>
    );
  }

  if (resolution.status !== 'internal' || !hasAccess(roles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default AdminRouteGuard;
