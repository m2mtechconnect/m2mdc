import { ReactNode } from 'react';
import { useRBAC, AppRole } from '@/contexts/RBACContext';
import { Card } from '@/components/ui/card';
import { Shield, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: AppRole[];
  fallback?: ReactNode;
}

export default function ProtectedRoute({ children, allowedRoles, fallback }: ProtectedRouteProps) {
  const { hasAccess, loading, role } = useRBAC();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess(allowedRoles)) {
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
            Required: <span className="font-semibold">{allowedRoles.join(', ')}</span>
          </p>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
