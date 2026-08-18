/**
 * OAuth callback landing route.
 *
 * The Supabase client parses the redirect fragment and hydrates the session.
 * Once App re-renders with a session this route is no longer reachable; if the
 * provider returned an error we surface it instead of silently looping.
 */

import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import BoundedLoading from '@/components/shared/BoundedLoading';

export default function AuthCallback() {
  const [params] = useSearchParams();
  const providerError = params.get('error_description') ?? params.get('error');
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), 8000);
    return () => window.clearTimeout(timer);
  }, []);

  if (providerError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md space-y-3 text-center">
          <h1 className="text-lg font-semibold text-foreground">Sign-in was not completed</h1>
          <p className="text-sm text-muted-foreground">{providerError}</p>
          <a href="/login" className="inline-block text-sm text-primary hover:underline">
            Return to sign in
          </a>
        </div>
      </div>
    );
  }

  if (timedOut) {
    return <Navigate to="/login" replace />;
  }

  return <BoundedLoading stage="session" />;
}
