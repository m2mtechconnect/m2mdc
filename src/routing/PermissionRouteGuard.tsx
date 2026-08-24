/**
 * Route-level permission boundary for platform and tenant application routes.
 *
 * Navigation visibility is a UX convenience, not authorization. This guard
 * prevents a signed-in user from bypassing the navigation permission by typing
 * a protected URL directly. Server-side RLS/RPC authorization remains the
 * authoritative security boundary.
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
  permission: Permission;
}) {
  const { resolution, can } = useRBAC();

  if (resolution.status === 'loading') {
    return (
      <div role="status" aria-live="polite" className="p-6 text-sm text-muted-foreground">
        Checking access permissions...
      </div>
    );
  }

  const admitted = resolution.status === 'internal' || resolution.status === 'tenant';
  if (!admitted || !can(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default PermissionRouteGuard;
