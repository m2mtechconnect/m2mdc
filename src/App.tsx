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
import DataCentreTwinLanding from "./pages/DataCentreTwinLanding";
import AgentDetail from "./pages/AgentDetail";
import TwinDebug from "./pages/TwinDebug";
import Profile from "./pages/account/Profile";
import Settings from "./pages/account/Settings";
import AccessControl from "./pages/account/AccessControl";

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // TEMPORARILY BYPASSED FOR SCREENSHOTS - Remove this bypass after capturing screenshots
  // if (!session || !user) {
  //   return (
  //     <Routes>
  //       <Route path="/auth" element={<Auth />} />
  //       <Route path="/twin-datacentre" element={<DataCentreTwinLanding />} />
  //       <Route path="*" element={<Navigate to="/auth" replace />} />
  //     </Routes>
  //   );
  // }

  // If authenticated, show all protected routes
  return (
    <Layout>
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
        <Route path="/playbook" element={<Playbook />} />
        <Route path="/pilot" element={<Pilot />} />
        {/* Data Centre Twin */}
        <Route path="/data-centre-twin" element={<DataCentreTwin />} />
        <Route path="/data-centre-twin/:id" element={<DataCentreTwin />} />
        {/* Public Landing Page (also accessible when authenticated) */}
        <Route path="/twin-datacentre" element={<DataCentreTwinLanding />} />
        {/* Twin Debug Page */}
        <Route path="/twin-debug" element={<TwinDebug />} />
        {/* Redirect old digital-twins routes to dashboard */}
        <Route path="/digital-twins" element={<Navigate to="/" replace />} />
        <Route path="/digital-twins/:slug" element={<Navigate to="/" replace />} />
        <Route path="/digital-twins-demo/funding-intake" element={<FundingIntakeDemo />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

import { PerformancePanel } from '@/components/debug/PerformancePanel';

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <RBACProvider>
            <BrowserRouter>
              <ActiveTwinProvider>
                <CoPilotProvider>
                  <CoPilotCommandProvider>
                    <Toaster />
                    <Sonner />
                    <AuthenticatedApp />
                    <PerformancePanel />
                  </CoPilotCommandProvider>
                </CoPilotProvider>
              </ActiveTwinProvider>
            </BrowserRouter>
          </RBACProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
