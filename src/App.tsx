import { useState, useEffect, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RBACProvider } from "@/contexts/RBACContext";
import { ActiveTwinProvider } from "@/context/ActiveTwinContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
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
// PR-0.1 Checkpoint B7.4G - Legacy AuthenticatedShell is no longer
// mounted at any approved-user route. It remains in the source tree so
// the codebase can be revived in later phases, but must never be
// re-imported here (statically or lazily) without a new checkpoint
// authorization. Approved users see only /pilot/*.
const OverlayFixtures = import.meta.env.DEV
  ? lazy(() => import("./pages/test/OverlayFixtures"))
  : null;

// Initialize changelog middleware for builder store
initChangeLogMiddleware();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
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
      
      const { data, error } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking approval:', error);
        setIsApproved(false);
      } else {
        setIsApproved(data?.is_approved ?? false);
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
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
        <Route path="/data-centre-twin" element={<DataCentreTwin />} />
        <Route path="/omniverse-scene" element={<OmniverseScene />} />
        <Route path="/onboarding" element={<Onboarding />} />
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

  // If authenticated and approved, show all protected routes
  return (
    <Routes>
      <Route path="/pilot/*" element={<PilotShell />} />
      {/*
       * PR-0.1 Checkpoint B7.4G - Sealed approved-user surface.
       * The controlled pilot is /pilot/*. Approved users may also sign
       * out; every other path redirects to the pilot overview. This
       * prevents production-blocked legacy routes (/dashboard, /builder,
       * /operations, etc.) from mounting AuthenticatedShell at runtime.
       */}
      <Route path="/sign-out" element={<SignOut />} />
      <Route
        path="*"
        element={<Navigate to="/pilot/overview" replace />}
      />
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
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
