import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { RBACProvider } from "@/contexts/RBACContext";
import { CoPilotProvider } from "@/contexts/CoPilotContext";
import { CoPilotCommandProvider } from "@/contexts/CoPilotCommandContext";
import { ActiveTwinProvider } from "@/context/ActiveTwinContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { useAutoLogout } from "@/hooks/useAutoLogout";
import { initChangeLogMiddleware } from "@/stores/dcBuilderChangeLogMiddleware";
import { TourProvider } from "@/context/TourContext";
import { TourRenderer } from "@/tours/TourRenderer";
import Dashboard from "./pages/Dashboard";
import Builder from "./pages/Builder";
import Deploy from "./pages/Deploy";
import DeploymentHistory from "./pages/DeploymentHistory";
import IntelligenceDashboard from "./pages/IntelligenceDashboard";
import Integrations from "./pages/Integrations";
import Compliance from "./pages/Compliance";
import Teams from "./pages/Teams";
import Marketplace from "./pages/Marketplace";

import Help from "./pages/Help";
import ConnectMonitor from "./pages/ConnectMonitor";
import ConnectHealth from "./pages/ConnectHealth";
import Search from "./pages/Search";
import UniversalSearch from "./pages/UniversalSearch";
import AISettings from "./pages/AISettings";
import Auth from "./pages/Auth";
import { SignIn, SignUp, SignOut, ForgotPassword, MFA } from "./pages/auth/index";
import NotFound from "./pages/NotFound";
import AgentWorkspace from "./pages/AgentWorkspace";
import AgentChat from "./pages/AgentChat";
import Playbook from "./pages/Playbook";
import Pilot from "./pages/Pilot";
import FundingIntakeDemo from "./pages/FundingIntakeDemo";
import ManageAgents from "./pages/ManageAgents";
import SystemManage from "./pages/SystemManage";
import TwinManage from "./pages/TwinManage";
import DataCentreTwin from "./pages/DataCentreTwin";
import Blueprint from "./pages/Blueprint";
import BlueprintPreview from "./pages/BlueprintPreview";
import SimulationPreview from "./pages/SimulationPreview";
import InfrastructurePage from "./pages/InfrastructurePage";
import DataCentreTwinLanding from "./pages/DataCentreTwinLanding";
import OmniverseScene from "./pages/OmniverseScene";
import Onboarding from "./pages/Onboarding";
import OnboardingSubmissions from "./pages/OnboardingSubmissions";
import AgentDetail from "./pages/AgentDetail";
import TwinDebug from "./pages/TwinDebug";
import Profile from "./pages/account/Profile";
import Settings from "./pages/account/Settings";
import AccessControl from "./pages/account/AccessControl";
import PendingApproval from "./pages/PendingApproval";
import AdminUserApproval from "./pages/AdminUserApproval";
import AdminSignupsDashboard from "./pages/AdminSignupsDashboard";
// PR-0.1 Checkpoint B7.4E - Controlled approved-user pilot shell.
// Imported at module scope so lint can enforce the pilot module's
// isolation, but only mounted for /pilot/* routes below.
import PilotShell from "./pilot/PilotShell";
// PR-0.1 Checkpoint B: test-only route removed from the production bundle.
// OverlayFixtures is loaded lazily and only when import.meta.env.DEV is true,
// so it never ships in the production tree.
import { lazy } from "react";
const OverlayFixtures = import.meta.env.DEV
  ? lazy(() => import("./pages/test/OverlayFixtures"))
  : null;

// Initialize changelog middleware for builder store
initChangeLogMiddleware();

// Redirect components for legacy routes
function AgentOperationsRedirect() {
  const { agentId } = useParams();
  return <Navigate to={`/app/agents/${agentId}/manage`} replace />;
}

function TwinManageRedirect() {
  const { instanceId } = useParams();
  return <Navigate to={`/app/agents/${instanceId}/manage`} replace />;
}

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
      <Route
        path="*"
        element={
          <ApprovedUserLayout>
            <ApprovedUserRoutes />
          </ApprovedUserLayout>
        }
      />
    </Routes>
  );
}

function ApprovedUserLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout>
      <TourRenderer />
      {children}
    </Layout>
  );
}

function ApprovedUserRoutes() {
  return (
    <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/builder" element={<Builder />} />
        <Route path="/deploy" element={<Deploy />} />
        <Route path="/deployments" element={<DeploymentHistory />} />
        <Route path="/agent/:id" element={<AgentWorkspace />} />
        <Route path="/agents/:id/chat" element={<AgentChat />} />
        <Route path="/agent-chat" element={<AgentChat />} />
        <Route path="/analytics" element={<IntelligenceDashboard />} />
        <Route path="/operations" element={<IntelligenceDashboard />} />
        <Route path="/intelligence" element={<IntelligenceDashboard />} />
        <Route path="/account/profile" element={<Profile />} />
        <Route path="/account/settings" element={<Settings />} />
        <Route path="/account/access-control" element={<AccessControl />} />
        <Route path="/admin/onboarding-submissions" element={<OnboardingSubmissions />} />
         <Route path="/admin/user-approvals" element={<AdminUserApproval />} />
                <Route path="/admin/signups-dashboard" element={<AdminSignupsDashboard />} />
        <Route path="/integrations" element={<Navigate to="/marketplace?tab=integrations" replace />} />
        <Route path="/marketplace/integrations" element={<Marketplace />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/marketplace" element={<Marketplace />} />
        {/* Unified Agent Management Routes */}
        <Route path="/app/agents" element={<ManageAgents />} />
        <Route path="/agents" element={<Navigate to="/app/agents" replace />} />
        <Route path="/subsystem-agents" element={<Navigate to="/app/agents" replace />} />
        <Route path="/app/agents/:slug/detail" element={<AgentDetail />} />
        <Route path="/app/agents/:agentId/manage" element={<TwinManage />} />
        {/* Legacy route redirects */}
        <Route path="/app/agents/:agentId/operations" element={<AgentOperationsRedirect />} />
        <Route path="/twins/:instanceId/manage" element={<TwinManageRedirect />} />
        <Route path="/studio/systems/:systemId/manage" element={<SystemManage />} />
        
        {/* Blueprint Routes */}
        <Route path="/data-centre-twin/:id/blueprint" element={<Blueprint />} />
        <Route path="/blueprint/:id" element={<Blueprint />} />
        <Route path="/blueprint/preview" element={<BlueprintPreview />} />
        <Route path="/simulation/preview" element={<SimulationPreview />} />
        <Route path="/help" element={<Help />} />
        <Route path="/connect/monitor" element={<ConnectMonitor />} />
        <Route path="/connect/health" element={<ConnectHealth />} />
        <Route path="/search" element={<Search />} />
        <Route path="/universal-search" element={<UniversalSearch />} />
        <Route path="/settings/ai" element={<AISettings />} />
        <Route path="/auth" element={<Navigate to="/" replace />} />
        <Route path="/sign-in" element={<Navigate to="/" replace />} />
        <Route path="/sign-up" element={<Navigate to="/" replace />} />
        <Route path="/sign-out" element={<SignOut />} />
        <Route path="/forgot-password" element={<Navigate to="/" replace />} />
        <Route path="/mfa" element={<Navigate to="/" replace />} />
        <Route path="/playbook" element={<Playbook />} />
        <Route path="/pilot" element={<Pilot />} />
        {/* Data Centre Twin */}
        <Route path="/data-centre-twin" element={<DataCentreTwin />} />
        <Route path="/data-centre-twin/:id" element={<DataCentreTwin />} />
        {/* Omniverse Live Scene */}
        <Route path="/omniverse-scene" element={<OmniverseScene />} />
        {/* Public Landing Page (also accessible when authenticated) */}
        <Route path="/twin-datacentre" element={<DataCentreTwinLanding />} />
        {/* Twin Debug Page */}
        <Route path="/twin-debug" element={<TwinDebug />} />
        {/* Redirect old digital-twins routes to dashboard */}
        <Route path="/digital-twins" element={<Navigate to="/" replace />} />
        <Route path="/digital-twins/:slug" element={<Navigate to="/" replace />} />
        <Route path="/digital-twins-demo/funding-intake" element={<FundingIntakeDemo />} />
        <Route path="/infrastructure" element={<InfrastructurePage />} />
        {import.meta.env.DEV && OverlayFixtures ? <Route path="/dev-overlays" element={<OverlayFixtures />} /> : null}
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
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
                <TourProvider>
                  <CoPilotProvider>
                    <CoPilotCommandProvider>
                      <Toaster />
                      <Sonner />
                      <AuthenticatedApp />
                      {/* PerformancePanel hidden */}
                    </CoPilotCommandProvider>
                  </CoPilotProvider>
                </TourProvider>
              </ActiveTwinProvider>
            </BrowserRouter>
          </RBACProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
