import { ReactNode } from 'react';
import { useRBAC, AppRole } from '@/contexts/RBACContext';
import type { Permission } from '@/auth/permissions';
import { Card } from '@/components/ui/card';
import { Shield, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  /**
   * Legacy role gate. Prefer `requiredPermissions`: permissions, not role
   * labels, are the canonical authorization unit (B-01).
   */
  allowedRoles?: AppRole[];
  /** Caller must hold every listed permission. */
  requiredPermissions?: Permission[];
  fallback?: ReactNode;
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  requiredPermissions,
  fallback,
}: ProtectedRouteProps) {
  const { hasAccess, loading, role, can } = useRBAC();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const permissionOk = requiredPermissions
    ? requiredPermissions.every((permission) => can(permission))
    : true;
  const roleOk = allowedRoles ? hasAccess(allowedRoles) : true;
  // Default-deny: with neither gate specified, nothing is granted.
  const granted = (!!requiredPermissions || !!allowedRoles) && permissionOk && roleOk;

  if (!granted) {
    return fallback || (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="glass-panel p-8 max-w-md text-center">
          <div className="mb-4 p-4 rounded-full bg-muted/30 w-16 h-16 flex items-center justify-center mx-auto">
            <Shield className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-display font-bold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-muted-foreground">
            Your role: <span className="font-semibold">{role || 'None'}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Required:{' '}
            <span className="font-semibold">
              {requiredPermissions?.join(', ') || allowedRoles?.join(', ') || 'unspecified'}
            </span>
          </p>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
