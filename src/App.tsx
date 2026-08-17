import { useState, useEffect, lazy, Suspense } from "react";
import { boundedRetryDelay, retryUnlessTerminal } from '@/lib/queryRetry';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RBACProvider, useRBAC } from "@/contexts/RBACContext";
import { ActiveTwinProvider } from "@/context/ActiveTwinContext";
import { CoPilotProvider } from "@/contexts/CoPilotContext";
import { CoPilotCommandProvider } from "@/contexts/CoPilotCommandContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfileFields } from "@/lib/auth/profileQuery";
import type { Session, User } from "@supabase/supabase-js";
import { useAutoLogout } from "@/hooks/useAutoLogout";
import { initChangeLogMiddleware } from "@/stores/dcBuilderChangeLogMiddleware";
import { SignIn, SignUp, SignOut, ForgotPassword, MFA } from "./pages/auth/index";
import DataCentreTwin from "./pages/DataCentreTwin";
import DataCentreTwinLanding from "./pages/DataCentreTwinLanding";
import OmniverseScene from "./pages/OmniverseScene";
import Onboarding from "./pages/Onboarding";
import PendingApproval from "./pages/PendingApproval";
// PR-0.1 Checkpoint B7.4F - Pilot shell imported statically because it is
// the only authenticated surface allowed to render on /pilot/*. It has no
// blocked-consumer imports (verified by scripts/pilot-bundle-canary.mjs).
import PilotShell from "./pilot/PilotShell";
import AuthorizationError from "./pages/AuthorizationError";
import BoundedLoading from "@/components/shared/BoundedLoading";
import ManagedUserReturn from '@/pages/oauth/ManagedUserReturn';
import { MANAGED_USER_RETURN_PATH } from '@/connections/managedUserBinding';
// Role-Aware Application Routing - Approved *internal* users (users with
// an explicit row in public.user_roles) receive the full AURA DC
// application via the legacy AuthenticatedShell, loaded lazily so that
// pilot users' bundle graph is unaffected. Approved users *without* a
// user_roles row remain sealed inside /pilot/*.
const AuthenticatedShell = lazy(() => import("./AuthenticatedShell"));
const OverlayFixtures = import.meta.env.DEV
  ? lazy(() => import("./pages/test/OverlayFixtures"))
  : null;

// Initialize changelog middleware for builder store
initChangeLogMiddleware();

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

  if (loading || approvalLoading) {
    return <BoundedLoading stage={loading ? 'session' : 'approval'} />;
  }

  // If not authenticated, show only Auth pages and public landing pages
  // Auth pages are gated behind onboarding completion
  const onboardingDone = localStorage.getItem("onboarding_completed") === "true";

  if (!session || !user) {
    return (
      <Routes>
        <Route path="/" element={<DataCentreTwinLanding />} />
        <Route path="/auth" element={onboardingDone ? <SignIn /> : <Navigate to="/onboarding" replace />} />
        <Route path="/login" element={<SignIn />} />
        <Route path="/sign-in" element={onboardingDone ? <SignIn /> : <Navigate to="/onboarding" replace />} />
        <Route path="/sign-up" element={onboardingDone ? <SignUp /> : <Navigate to="/onboarding" replace />} />
        <Route path="/sign-out" element={<SignOut />} />
        <Route path="/forgot-password" element={onboardingDone ? <ForgotPassword /> : <Navigate to="/onboarding" replace />} />
        <Route path="/mfa" element={onboardingDone ? <MFA /> : <Navigate to="/onboarding" replace />} />
        <Route path="/twin-datacentre" element={<DataCentreTwinLanding />} />
        <Route
          path="/data-centre-twin"
          element={(
            <CoPilotProvider>
              <CoPilotCommandProvider>
                <DataCentreTwin />
              </CoPilotCommandProvider>
            </CoPilotProvider>
          )}
        />
        <Route path="/omniverse-scene" element={<OmniverseScene />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path={MANAGED_USER_RETURN_PATH} element={<ManagedUserReturn />} />
        {import.meta.env.DEV && OverlayFixtures ? <Route path="/dev-overlays" element={<OverlayFixtures />} /> : null}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // If authenticated but not approved, show pending approval page
  if (!isApproved) {
    return (
      <Routes>
        <Route path="/sign-out" element={<SignOut />} />
        <Route path="*" element={<PendingApproval />} />
      </Routes>
    );
  }

  // Approved user: branch on server-backed internal vs pilot classification.
  return <ApprovedUserRouter />;
}

function LoadingScreen() {
  return <BoundedLoading stage="authorization" />;
}

function ApprovedUserRouter() {
  const { resolution } = useRBAC();

  // Wait for RBAC to resolve before rendering any privileged shell.
  if (resolution.status === 'loading') {
    return <LoadingScreen />;
  }

  // Lookup FAILURE must not silently downgrade to the pilot shell.
  if (resolution.status === 'error') {
    return (
      <Routes>
        <Route path="/sign-out" element={<SignOut />} />
        <Route path="*" element={<AuthorizationError />} />
      </Routes>
    );
  }

  if (resolution.status === 'internal') {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/pilot/*" element={<PilotShell />} />
          <Route path="/sign-out" element={<SignOut />} />
          <Route path={MANAGED_USER_RETURN_PATH} element={<ManagedUserReturn />} />
          <Route path="/*" element={<AuthenticatedShell />} />
        </Routes>
      </Suspense>
    );
  }

  // Restricted pilot / customer user - sealed inside /pilot/*.
  return (
    <Routes>
      <Route path="/pilot/*" element={<PilotShell />} />
      <Route path="/sign-out" element={<SignOut />} />
      <Route path={MANAGED_USER_RETURN_PATH} element={<ManagedUserReturn />} />
      <Route path="*" element={<Navigate to="/pilot/overview" replace />} />
    </Routes>
  );
}

// Performance panel hidden - use Ctrl+Shift+P to toggle if needed
// import { PerformancePanel } from '@/components/debug/PerformancePanel';

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <RBACProvider>
            <BrowserRouter future={{ v7_relativeSplatPath: true }}>
              <ActiveTwinProvider>
                      <Toaster />
                      <Sonner />
                      <AuthenticatedApp />
                      {/* PerformancePanel hidden */}
              </ActiveTwinProvider>
            </BrowserRouter>
          </RBACProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
