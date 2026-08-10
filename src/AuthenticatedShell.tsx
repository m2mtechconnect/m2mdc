/**
 * PR-0.1 Checkpoint B7.4F - Legacy authenticated shell isolated behind a
 * lazy boundary so that the controlled approved-user pilot at /pilot/*
 * does NOT pull the shared <Layout>, Co-Pilot, health-badge, token-refresh,
 * global search-suggestions, or any blocked-function-consumer code into
 * its initial dependency graph.
 *
 * Everything imported in this file (pages, providers, Layout, CoPilot*,
 * HealthBadges, GlobalSearchBar, etc.) becomes part of the lazy chunk
 * produced by React.lazy(() => import("./AuthenticatedShell")) in App.tsx.
 * Do NOT import this module statically from App.tsx or from any file that
 * the /pilot/* route graph can reach.
 */
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { CoPilotProvider } from "@/contexts/CoPilotContext";
import { CoPilotCommandProvider } from "@/contexts/CoPilotCommandContext";
import { TourProvider } from "@/context/TourContext";
import { TourRenderer } from "@/tours/TourRenderer";
import Dashboard from "./pages/Dashboard";
import Builder from "./pages/Builder";
import Deploy from "./pages/Deploy";
import DeploymentHistory from "./pages/DeploymentHistory";
import IntelligenceDashboard from "./pages/IntelligenceDashboard";
import Compliance from "./pages/Compliance";
import Teams from "./pages/Teams";
import Marketplace from "./pages/Marketplace";
import Help from "./pages/Help";
import ConnectMonitor from "./pages/ConnectMonitor";
import ConnectHealth from "./pages/ConnectHealth";
import Search from "./pages/Search";
import UniversalSearch from "./pages/UniversalSearch";
import AISettings from "./pages/AISettings";
import NvidiaDsxReadiness from "./pages/settings/NvidiaDsxReadiness";
import Integrations from "./pages/Integrations";
import { SignOut } from "./pages/auth/index";
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
import AuraWorkspace from "./workspace/AuraWorkspace";
import InfrastructurePage from "./pages/InfrastructurePage";
import DataCentreTwinLanding from "./pages/DataCentreTwinLanding";
import OmniverseScene from "./pages/OmniverseScene";
import OnboardingSubmissions from "./pages/OnboardingSubmissions";
import AgentDetail from "./pages/AgentDetail";
import TwinDebug from "./pages/TwinDebug";
import Profile from "./pages/account/Profile";
import Settings from "./pages/account/Settings";
import AccessControl from "./pages/account/AccessControl";
import AdminUserApproval from "./pages/AdminUserApproval";
import AdminSignupsDashboard from "./pages/AdminSignupsDashboard";
import { lazy } from "react";
const EvidenceBetaShell = lazy(() => import("./pages/dsx/EvidenceBetaShell"));
import {
  OverviewWorkspace, SimulationsWorkspace, ThermalWorkspace, PowerWorkspace, CoolingWorkspace, NetworkWorkspace,
  FacilityWorkspace, WorkloadWorkspace, SovereigntyWorkspace, CarbonWorkspace,
  FinancialWorkspace, EvidenceWorkspace,
} from "./pages/dsx/workspaces";
const OverlayFixtures = import.meta.env.DEV
  ? lazy(() => import("./pages/test/OverlayFixtures"))
  : null;

function AgentOperationsRedirect() {
  const { agentId } = useParams();
  return <Navigate to={`/app/agents/${agentId}/manage`} replace />;
}
function TwinManageRedirect() {
  const { instanceId } = useParams();
  return <Navigate to={`/app/agents/${instanceId}/manage`} replace />;
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
      {/* Canonical integrations destination. */}
      <Route path="/integrations" element={<Integrations />} />
      <Route path="/marketplace/integrations" element={<Navigate to="/integrations" replace />} />
      <Route path="/compliance" element={<Compliance />} />
      <Route path="/teams" element={<Teams />} />
      <Route path="/marketplace" element={<Marketplace />} />
      <Route path="/app/agents" element={<ManageAgents />} />
      <Route path="/agents" element={<Navigate to="/app/agents" replace />} />
      <Route path="/subsystem-agents" element={<Navigate to="/app/agents" replace />} />
      <Route path="/app/agents/:slug/detail" element={<AgentDetail />} />
      <Route path="/app/agents/:agentId/manage" element={<TwinManage />} />
      <Route path="/app/agents/:agentId/operations" element={<AgentOperationsRedirect />} />
      <Route path="/twins/:instanceId/manage" element={<TwinManageRedirect />} />
      <Route path="/studio/systems/:systemId/manage" element={<SystemManage />} />
      <Route path="/data-centre-twin/:id/blueprint" element={<Blueprint />} />
      <Route path="/blueprint/:id" element={<Blueprint />} />
      <Route path="/blueprint" element={<Navigate to="/blueprint/default" replace />} />
      <Route path="/blueprint/preview" element={<BlueprintPreview />} />
      <Route path="/simulation" element={<AuraWorkspace />} />
      <Route path="/simulation/preview" element={<SimulationPreview />} />
      <Route path="/help" element={<Help />} />
      <Route path="/connect/monitor" element={<ConnectMonitor />} />
      <Route path="/connect/health" element={<ConnectHealth />} />
      <Route path="/search" element={<Search />} />
      <Route path="/universal-search" element={<UniversalSearch />} />
      <Route path="/settings/ai" element={<AISettings />} />
      <Route path="/settings/integrations/nvidia-dsx" element={<Navigate to="/integrations#nvidia-dsx" replace />} />
      <Route path="/auth" element={<Navigate to="/" replace />} />
      <Route path="/sign-in" element={<Navigate to="/" replace />} />
      <Route path="/sign-up" element={<Navigate to="/" replace />} />
      <Route path="/sign-out" element={<SignOut />} />
      <Route path="/forgot-password" element={<Navigate to="/" replace />} />
      <Route path="/mfa" element={<Navigate to="/" replace />} />
      <Route path="/playbook" element={<Playbook />} />
      <Route path="/pilot" element={<Pilot />} />
      <Route path="/data-centre-twin" element={<DataCentreTwin />} />
      <Route path="/data-centre-twin/:id" element={<DataCentreTwin />} />
      <Route path="/omniverse-scene" element={<OmniverseScene />} />
      <Route path="/twin-datacentre" element={<DataCentreTwinLanding />} />
      <Route path="/twin-debug" element={<TwinDebug />} />
      <Route path="/digital-twins" element={<Navigate to="/" replace />} />
      <Route path="/digital-twins/:slug" element={<Navigate to="/" replace />} />
      <Route path="/digital-twins-demo/funding-intake" element={<FundingIntakeDemo />} />
      <Route path="/infrastructure" element={<InfrastructurePage />} />
      <Route path="/dsx/evidence-beta" element={<EvidenceBetaShell />}>
        <Route index element={<OverviewWorkspace />} />
        <Route path="overview" element={<OverviewWorkspace />} />
        <Route path="thermal" element={<ThermalWorkspace />} />
        <Route path="power" element={<PowerWorkspace />} />
        <Route path="cooling" element={<CoolingWorkspace />} />
        <Route path="network" element={<NetworkWorkspace />} />
        <Route path="facility" element={<FacilityWorkspace />} />
        <Route path="workload" element={<WorkloadWorkspace />} />
        <Route path="simulations" element={<SimulationsWorkspace />} />
        <Route path="sovereignty" element={<SovereigntyWorkspace />} />
        <Route path="carbon" element={<CarbonWorkspace />} />
        <Route path="financials" element={<FinancialWorkspace />} />
        <Route path="evidence" element={<EvidenceWorkspace />} />
      </Route>
      {import.meta.env.DEV && OverlayFixtures ? (
        <Route path="/dev-overlays" element={<OverlayFixtures />} />
      ) : null}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function AuthenticatedShell() {
  return (
    <TourProvider>
      <CoPilotProvider>
        <CoPilotCommandProvider>
          <Layout>
            <TourRenderer />
            <ApprovedUserRoutes />
          </Layout>
        </CoPilotCommandProvider>
      </CoPilotProvider>
    </TourProvider>
  );
}