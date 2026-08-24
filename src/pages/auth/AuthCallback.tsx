/**
 * OAuth callback landing route.
 *
 * The Supabase client parses the redirect fragment and hydrates the session.
 * Once a session exists we restore the sanitized deep link that was stashed
 * before the provider round trip (see `src/auth/returnPathHandoff.ts`) and
 * navigate there, preserving its query string and hash. Provider errors and
 * the hydration timeout both fail safe back to `/login`.
 */

import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import BoundedLoading from '@/components/shared/BoundedLoading';
import { supabase } from '@/integrations/supabase/client';
import { consumeReturnPath } from '@/auth/returnPathHandoff';
import { DEFAULT_AUTHENTICATED_ROUTE, safeReturnPath } from '@/routing/AuthenticatedEntryRedirect';

export default function AuthCallback() {
  const [params] = useSearchParams();
  const providerError = params.get('error_description') ?? params.get('error');
  const [timedOut, setTimedOut] = useState(false);
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), 8000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (providerError) return;
    let cancelled = false;

    // Consume exactly once, regardless of which signal resolves the session.
    let restored: string | null | undefined;
    const resolve = () => {
      if (cancelled) return;
      if (restored === undefined) restored = consumeReturnPath();
      setTarget(safeReturnPath(restored ?? null) ?? DEFAULT_AUTHENTICATED_ROUTE);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) resolve();
    });
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) resolve();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [providerError]);

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

  if (target) {
    return <Navigate to={target} replace />;
  }

  if (timedOut) {
    return <Navigate to="/login" replace />;
  }

  return <BoundedLoading stage="session" />;
}
