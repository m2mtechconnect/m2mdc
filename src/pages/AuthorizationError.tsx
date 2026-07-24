import { supabase } from '@/integrations/supabase/client';
import { useRBAC } from '@/contexts/RBACContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Neutral authorization-error screen shown when the server-backed role
 * lookup fails. Renders no data-bearing application shell — only a
 * concise message, a retry action, and sign out.
 */
export default function AuthorizationError() {
  const { retry } = useRBAC();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4" role="main">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4 mx-auto">
          <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">Authorization unavailable</h1>
        <p className="text-muted-foreground mb-6">
          We could not verify your access level. Please retry, or sign out and try again.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={retry} data-testid="authz-retry">Retry</Button>
          <Button variant="outline" onClick={handleSignOut} data-testid="authz-signout">
            Sign out
          </Button>
        </div>
      </Card>
    </div>
  );
}