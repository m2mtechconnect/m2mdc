import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useRBAC } from '@/contexts/RBACContext';

export function PlatformOwnerRouteGuard({ children }: { children: ReactNode }) {
  const { resolution, isPlatformOwner } = useRBAC();

  if (resolution.status === 'loading') {
    return (
      <div role="status" aria-live="polite" className="p-6 text-sm text-muted-foreground">
        Checking platform owner permissions...
      </div>
    );
  }

  if (resolution.status !== 'internal' || !isPlatformOwner) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default PlatformOwnerRouteGuard;
