/**
 * Route-level authorization for every /admin/* destination.
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
/*
 * Phase 1 (authorization consolidation). The guard previously hardcoded
 * `['admin','security_admin']` while `src/auth/permissions.ts` - the declared
 * canonical model - grants `platform.view_admin_console` to admin,
 * security_admin AND tenant `owner`, and two admin pages independently
 * admitted `executive` and `manager`. Three sources of truth answered one
 * question. The decision now runs through the canonical permission; role
 * labels are no longer compared here.
 */

import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useRBAC } from '@/contexts/RBACContext';
import type { Permission } from '@/auth/permissions';

/** The single permission that admits a caller to the administration console. */
export const ADMIN_CONSOLE_PERMISSION: Permission = 'platform.view_admin_console';

export function AdminRouteGuard({
  children,
  permission = ADMIN_CONSOLE_PERMISSION,
}: {
  children: ReactNode;
  /** Override only for a route that needs a narrower permission. */
  permission?: Permission;
}) {
  const { resolution, can } = useRBAC();

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

  if (resolution.status !== 'internal' || !can(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default AdminRouteGuard;
