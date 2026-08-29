import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { fetchProfileFields } from '@/lib/auth/profileQuery';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import BoundedLoading from '@/components/shared/BoundedLoading';
import PublicAppRoutes, { withPublicRouteFallback } from './PublicAppRoutes';

const loadApprovedUserRouter = () => import('./ApprovedUserRouter');
const ApprovedUserRouter = lazy(() => import('./ApprovedUserRouter'));
const PendingApproval = lazy(() => import('./pages/PendingApproval'));
const InviteAccept = lazy(() => import('./pages/InviteAccept'));
const loadAuthPages = () => import('./pages/auth/index');
const SignOut = lazy(() => loadAuthPages().then((module) => ({ default: module.SignOut })));

let changeLogMiddlewarePromise: Promise<void> | null = null;
function ensureChangeLogMiddleware(): Promise<void> {
  if (!changeLogMiddlewarePromise) {
    changeLogMiddlewarePromise = import('@/stores/dcBuilderChangeLogMiddleware')
      .then(({ initChangeLogMiddleware }) => initChangeLogMiddleware())
      .catch((error) => {
        changeLogMiddlewarePromise = null;
        throw error;
      });
  }
  return changeLogMiddlewarePromise;
}

interface AuthenticatedSessionAppProps {
  protectedEntry: boolean;
  returnTo: string;
}

/**
 * Session and approval resolution. This bundle is loaded only when a persisted
 * session could exist or a protected route explicitly requires authentication.
 * All security decisions still use Supabase + the existing fail-closed gates.
 */
export default function AuthenticatedSessionApp({
  protectedEntry,
  returnTo,
}: AuthenticatedSessionAppProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [approvalLoading, setApprovalLoading] = useState(true);

  useAutoLogout(!!user);

  useEffect(() => {
    // Protected routes must wait for auth/session hydration before any
    // redirect decision. The initial getSession() call is the hydration
    // boundary: until it resolves, no null-session event may tear down the
    // session or trigger a /login redirect.
    let hydrated = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (nextSession) {
        setSession(nextSession);
        setUser(nextSession.user);
        if (hydrated) setLoading(false);
        return;
      }
      if (!hydrated) return; // pre-hydration null events are not evidence
      // A null event after hydration can be a transient token-refresh
      // failure. Re-verify against the persisted store before tearing down;
      // only a confirmed null session may fail closed into a redirect.
      void supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
        } else {
          setSession(null);
          setUser(null);
        }
        setLoading(false);
      });
    });

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      hydrated = true;
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const checkApproval = async () => {
      if (!user) {
        if (!cancelled) {
          setIsApproved(null);
          setApprovalLoading(false);
        }
        return;
      }

      // Approval remains the fail-closed gate. Warming the approved-user
      // router in parallel only removes a post-approval chunk waterfall; the
      // module is not rendered until the server-owned approval result passes.
      void loadApprovedUserRouter().catch(() => undefined);
      const result = await fetchProfileFields(user.id, 'is_approved');
      if (cancelled) return;
      if (result.status === 'error') {
        console.error('Error checking approval:', result.message);
        setIsApproved(false);
      } else if (result.status === 'success') {
        setIsApproved(Boolean(result.data.is_approved));
      } else {
        setIsApproved(false);
      }
      setApprovalLoading(false);
    };

    setApprovalLoading(true);
    void checkApproval();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!session || !user || !isApproved) return;
    void ensureChangeLogMiddleware().catch((error) => {
      console.error('[ChangeLogMiddleware] Deferred initialization failed:', error);
    });
  }, [session, user, isApproved]);

  if (loading || approvalLoading) {
    return <BoundedLoading stage={loading ? 'session' : 'approval'} />;
  }

  if (!session || !user) {
    if (protectedEntry) {
      return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
    }
    return <PublicAppRoutes />;
  }

  if (!isApproved) {
    return (
      <Routes>
        <Route path="/sign-out" element={withPublicRouteFallback(<SignOut />)} />
        <Route path="/invite/accept" element={withPublicRouteFallback(<InviteAccept />)} />
        <Route path="*" element={withPublicRouteFallback(<PendingApproval />)} />
      </Routes>
    );
  }

  return (
    <Suspense fallback={<BoundedLoading stage="authorization" />}>
      <ApprovedUserRouter />
    </Suspense>
  );
}
