import { useState, useEffect, lazy, Suspense, type ReactNode } from "react";
import { boundedRetryDelay, retryUnlessTerminal } from '@/lib/queryRetry';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfileFields } from "@/lib/auth/profileQuery";
import type { Session, User } from "@supabase/supabase-js";
import { useAutoLogout } from "@/hooks/useAutoLogout";
import DataCentreTwinLanding from "./pages/DataCentreTwinLanding";
import BoundedLoading from "@/components/shared/BoundedLoading";
import { MANAGED_USER_RETURN_PATH } from '@/connections/managedUserBinding';

const OverlayFixtures = import.meta.env.DEV
  ? lazy(() => import("./pages/test/OverlayFixtures"))
  : null;
const PublicDataCentreTwin = lazy(() => import("./pages/PublicDataCentreTwin"));
const TwinPreview = lazy(() => import("./pages/TwinPreview"));
// Keep the authenticated shell synchronous *inside* its own lazy bundle while
// excluding RBAC and active-twin providers from the anonymous landing route.
const ApprovedUserRouter = lazy(() => import("./ApprovedUserRouter"));

const loadAuthPages = () => import("./pages/auth/index");
const SignIn = lazy(() => loadAuthPages().then((module) => ({ default: module.SignIn })));
const SignUp = lazy(() => loadAuthPages().then((module) => ({ default: module.SignUp })));
const SignOut = lazy(() => loadAuthPages().then((module) => ({ default: module.SignOut })));
const ForgotPassword = lazy(() => loadAuthPages().then((module) => ({ default: module.ForgotPassword })));
const MFA = lazy(() => loadAuthPages().then((module) => ({ default: module.MFA })));
const AuthCallback = lazy(() => loadAuthPages().then((module) => ({ default: module.AuthCallback })));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const PendingApproval = lazy(() => import("./pages/PendingApproval"));
const ManagedUserReturn = lazy(() => import('@/pages/oauth/ManagedUserReturn'));
const InviteAccept = lazy(() => import('./pages/InviteAccept'));
const InviteSignInRedirect = lazy(() =>
  import('@/routing/InviteSignInRedirect').then((module) => ({ default: module.InviteSignInRedirect })),
);

const publicRouteFallback = (
  <div className="flex min-h-dvh items-center justify-center" role="status" aria-live="polite">
    <span className="text-sm text-muted-foreground">Loading experience…</span>
  </div>
);

const withPublicRouteFallback = (element: ReactNode) => (
  <Suspense fallback={publicRouteFallback}>{element}</Suspense>
);

// The changelog middleware imports the full DC builder stores. Keep it off the
// anonymous critical path and initialize it once, only after an approved user
// enters the authenticated application.
let changeLogMiddlewarePromise: Promise<void> | null = null;
function ensureChangeLogMiddleware(): Promise<void> {
  if (!changeLogMiddlewarePromise) {
    changeLogMiddlewarePromise = import('@/stores/dcBuilderChangeLogMiddleware')
      .then(({ initChangeLogMiddleware }) => {
        initChangeLogMiddleware();
      })
      .catch((error) => {
        changeLogMiddlewarePromise = null;
        throw error;
      });
  }
  return changeLogMiddlewarePromise;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A 400/404/406 about a missing or malformed identifier is terminal:
      // retrying it only produced a permanent spinner.
      retry: retryUnlessTerminal,
      retryDelay: boundedRetryDelay,
      staleTime: 5000,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthenticatedApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [approvalLoading, setApprovalLoading] = useState(true);

  // Auto-logout after 30 minutes of inactivity
  useAutoLogout(!!user);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check approval status when user is authenticated
  useEffect(() => {
    const checkApproval = async () => {
      if (!user) {
        setApprovalLoading(false);
        return;
      }

      // Guarded read: a session that has not resolved a real user id must not
      // issue `user_id=eq.` (finding PW-P2-02).
      const result = await fetchProfileFields(user.id, 'is_approved');
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

    if (user) {
      checkApproval();
    } else {
      setApprovalLoading(false);
    }
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

  // If not authenticated, show only Auth pages and public landing pages.
  const onboardingDone = localStorage.getItem("onboarding_completed") === "true";

  if (!session || !user) {
    return (
      <Routes>
        <Route path="/" element={<DataCentreTwinLanding />} />
        <Route path="/auth" element={onboardingDone ? withPublicRouteFallback(<SignIn />) : <Navigate to="/onboarding" replace />} />
        <Route path="/login" element={withPublicRouteFallback(<SignIn />)} />
        <Route path="/auth/callback" element={withPublicRouteFallback(<AuthCallback />)} />
        <Route path="/sign-in" element={onboardingDone ? withPublicRouteFallback(<SignIn />) : <Navigate to="/onboarding" replace />} />
        <Route path="/sign-up" element={onboardingDone ? withPublicRouteFallback(<SignUp />) : <Navigate to="/onboarding" replace />} />
        <Route path="/sign-out" element={withPublicRouteFallback(<SignOut />)} />
        <Route path="/forgot-password" element={onboardingDone ? withPublicRouteFallback(<ForgotPassword />) : <Navigate to="/onboarding" replace />} />
        <Route path="/mfa" element={onboardingDone ? withPublicRouteFallback(<MFA />) : <Navigate to="/onboarding" replace />} />
        <Route path="/twin-datacentre" element={<DataCentreTwinLanding />} />
        <Route
          path="/data-centre-twin"
          element={(
            <Suspense fallback={publicRouteFallback}>
              <PublicDataCentreTwin />
            </Suspense>
          )}
        />
        <Route
          path="/twin-preview"
          element={<Suspense fallback={publicRouteFallback}><TwinPreview /></Suspense>}
        />
        {/* Phase 5: AURA renders this preview; the legacy vendor-named path redirects. */}
        <Route path="/omniverse-scene" element={<Navigate to="/twin-preview" replace />} />
        <Route path="/onboarding" element={withPublicRouteFallback(<Onboarding />)} />
        <Route path={MANAGED_USER_RETURN_PATH} element={withPublicRouteFallback(<ManagedUserReturn />)} />
        <Route path="/invite/accept" element={withPublicRouteFallback(<InviteSignInRedirect />)} />
        {import.meta.env.DEV && OverlayFixtures ? <Route path="/dev-overlays" element={<OverlayFixtures />} /> : null}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // If authenticated but not approved, show pending approval page.
  if (!isApproved) {
    return (
      <Routes>
        <Route path="/sign-out" element={withPublicRouteFallback(<SignOut />)} />
        <Route path="/invite/accept" element={withPublicRouteFallback(<InviteAccept />)} />
        <Route path="*" element={withPublicRouteFallback(<PendingApproval />)} />
      </Routes>
    );
  }

  // Approved users load RBAC/twin state only after authentication + approval.
  return (
    <Suspense fallback={<BoundedLoading stage="authorization" />}>
      <ApprovedUserRouter />
    </Suspense>
  );
}

// Performance panel hidden - use Ctrl+Shift+P to toggle if needed
// import { PerformancePanel } from '@/components/debug/PerformancePanel';

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <Toaster />
            <Sonner />
            <AuthenticatedApp />
            {/* PerformancePanel hidden */}
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
