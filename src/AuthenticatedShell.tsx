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
import { AuthenticatedEntryRedirect } from "@/routing/AuthenticatedEntryRedirect";
import { Layout } from "@/components/Layout";
import { PreserveNavigate } from "@/routing/PreserveNavigate";
import { ROUTE_ALIASES } from "@/config/routeAliases";
import { CoPilotProvider } from "@/contexts/CoPilotContext";
import { CoPilotCommandProvider } from "@/contexts/CoPilotCommandContext";
import { TourProvider } from "@/context/TourContext";
import { TourRenderer } from "@/tours/TourRenderer";
import { lazy, Suspense } from "react";
import Dashboard from "./pages/Dashboard";
import { DatasetProvider } from '@/data/dataset/DatasetProvider';
import DatasetCanaryBanner from '@/components/dataset/DatasetCanaryBanner';
import ReferenceRouteGate from '@/components/dataset/ReferenceRouteGate';
import { AdminRouteGuard } from '@/routing/AdminRouteGuard';
import NotFound from "./pages/NotFound";

/**
 * Phase 11 - route-level code splitting.
 *
 * Every page below used to be a static import, so the single
 * AuthenticatedShell chunk (2.4 MB pre-split) had to download and parse
 * before the dashboard could paint - including the 3D twin stack, the admin
 * console and the Evidence workspaces that most sessions never open.
 *
 * Only Dashboard (the post-login landing route) and NotFound stay eager.
 * Everything else is fetched when its route is first visited.
 */
const Builder = lazy(() => import("./pages/Builder"));
const Deploy = lazy(() => import("./pages/Deploy"));
const DeploymentHistory = lazy(() => import("./pages/DeploymentHistory"));
const IntelligenceDashboard = lazy(() => import("./pages/IntelligenceDashboard"));
const Compliance = lazy(() => import("./pages/Compliance"));
const Teams = lazy(() => import("./pages/Teams"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const Help = lazy(() => import("./pages/Help"));
const Search = lazy(() => import("./pages/Search"));
const AISettings = lazy(() => import("./pages/AISettings"));
const Connections = lazy(() => import("./pages/Connections"));
const ManageFacilities = lazy(() => import("./pages/manage/Facilities"));
const SignOut = lazy(() =>
  import("./pages/auth/index").then((m) => ({ default: m.SignOut })),
);
const AgentWorkspace = lazy(() => import("./pages/AgentWorkspace"));
const AgentChat = lazy(() => import("./pages/AgentChat"));
const Playbook = lazy(() => import("./pages/Playbook"));
const FundingIntakeDemo = lazy(() => import("./pages/FundingIntakeDemo"));
const ManageAgents = lazy(() => import("./pages/ManageAgents"));
const SystemManage = lazy(() => import("./pages/SystemManage"));
const TwinManage = lazy(() => import("./pages/TwinManage"));
const DataCentreTwin = lazy(() => import("./pages/DataCentreTwin"));
const Blueprint = lazy(() => import("./pages/Blueprint"));
const BlueprintPreview = lazy(() => import("./pages/BlueprintPreview"));
const SimulationPreview = lazy(() => import("./pages/SimulationPreview"));
const AuraWorkspace = lazy(() => import("./workspace/AuraWorkspace"));
const InfrastructurePage = lazy(() => import("./pages/InfrastructurePage"));
const TwinPreview = lazy(() => import("./pages/TwinPreview"));
const TwinDebug = lazy(() => import("./pages/TwinDebug"));
const AgentDetail = lazy(() => import("./pages/AgentDetail"));
const Profile = lazy(() => import("./pages/account/Profile"));
const Settings = lazy(() => import("./pages/account/Settings"));
const AccessControl = lazy(() => import("./pages/account/AccessControl"));

/* Administration console - lazy AND permission-gated (AdminRouteGuard). */
const OnboardingSubmissions = lazy(() => import("./pages/OnboardingSubmissions"));
const AdminUserApproval = lazy(() => import("./pages/AdminUserApproval"));
const AdminSignupsDashboard = lazy(() => import("./pages/AdminSignupsDashboard"));
const PlatformReadiness = lazy(() => import("./pages/admin/PlatformReadiness"));
const AssetPreview = lazy(() => import("@/pages/admin/AssetPreview"));
const AssetPipeline = lazy(() => import("@/pages/admin/AssetPipeline"));
const AssetValidation = lazy(() => import("@/pages/admin/AssetValidation"));
const ReferenceFacilityValidation = lazy(
  () => import("@/pages/admin/ReferenceFacilityValidation"),
);
const DsxCapabilityRegistryPage = lazy(
  () => import("@/pages/admin/DsxCapabilityRegistryPage"),
);
const DatasetRegistryPage = lazy(() => import("@/pages/admin/DatasetRegistryPage"));

const EvidenceBetaShell = lazy(() => import("./pages/dsx/EvidenceBetaShell"));
const OverviewWorkspace = lazy(() => import("./pages/dsx/workspaces").then((m) => ({ default: m.OverviewWorkspace })));
const SimulationsWorkspace = lazy(() => import("./pages/dsx/workspaces").then((m) => ({ default: m.SimulationsWorkspace })));
const ThermalWorkspace = lazy(() => import("./pages/dsx/workspaces").then((m) => ({ default: m.ThermalWorkspace })));
const PowerWorkspace = lazy(() => import("./pages/dsx/workspaces").then((m) => ({ default: m.PowerWorkspace })));
const CoolingWorkspace = lazy(() => import("./pages/dsx/workspaces").then((m) => ({ default: m.CoolingWorkspace })));
const NetworkWorkspace = lazy(() => import("./pages/dsx/workspaces").then((m) => ({ default: m.NetworkWorkspace })));
const FacilityWorkspace = lazy(() => import("./pages/dsx/workspaces").then((m) => ({ default: m.FacilityWorkspace })));
const WorkloadWorkspace = lazy(() => import("./pages/dsx/workspaces").then((m) => ({ default: m.WorkloadWorkspace })));
const SovereigntyWorkspace = lazy(() => import("./pages/dsx/workspaces").then((m) => ({ default: m.SovereigntyWorkspace })));
const CarbonWorkspace = lazy(() => import("./pages/dsx/workspaces").then((m) => ({ default: m.CarbonWorkspace })));
const FinancialWorkspace = lazy(() => import("./pages/dsx/workspaces").then((m) => ({ default: m.FinancialWorkspace })));
const EvidenceWorkspace = lazy(() => import("./pages/dsx/workspaces").then((m) => ({ default: m.EvidenceWorkspace })));
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
      {/* Stage 6G: /dashboard is canonical; `/` redirects via ROUTE_ALIASES. */}
      <Route path="/dashboard" element={<Dashboard />} />
      {/* PW-P2-05: signed-in users must never see a 404 on an auth entry
          route. They are sent to their authorized default workspace, keeping
          a safe same-origin return path when one was supplied. */}
      <Route path="/login" element={<AuthenticatedEntryRedirect />} />
      <Route path="/onboarding" element={<AuthenticatedEntryRedirect />} />
      <Route path="/builder" element={<Builder />} />
      <Route path="/deploy" element={<Deploy />} />
      <Route path="/deployments" element={<DeploymentHistory />} />
      <Route path="/agent/:id" element={<AgentWorkspace />} />
      <Route path="/agents/:id/chat" element={<AgentChat />} />
      <Route path="/analytics" element={<IntelligenceDashboard />} />
      <Route path="/account/profile" element={<Profile />} />
      <Route path="/account/settings" element={<Settings />} />
      <Route path="/account/access-control" element={<AccessControl />} />
      <Route path="/admin/onboarding-submissions" element={<AdminRouteGuard><OnboardingSubmissions /></AdminRouteGuard>} />
      <Route path="/admin/user-approvals" element={<AdminRouteGuard><AdminUserApproval /></AdminRouteGuard>} />
      <Route path="/admin/asset-preview" element={<AdminRouteGuard><AssetPreview /></AdminRouteGuard>} />
      <Route path="/admin/asset-pipeline" element={<AdminRouteGuard><AssetPipeline /></AdminRouteGuard>} />
      <Route path="/admin/asset-validation/:assetId" element={<AdminRouteGuard><AssetValidation /></AdminRouteGuard>} />
      <Route
        path="/admin/reference-facility-validation"
        element={<AdminRouteGuard><ReferenceFacilityValidation /></AdminRouteGuard>}
      />
      <Route path="/admin/signups-dashboard" element={<AdminRouteGuard><AdminSignupsDashboard /></AdminRouteGuard>} />
      <Route path="/admin/dsx-capabilities" element={<AdminRouteGuard><DsxCapabilityRegistryPage /></AdminRouteGuard>} />
      <Route path="/admin/dataset-registry" element={<AdminRouteGuard><DatasetRegistryPage /></AdminRouteGuard>} />
      <Route path="/admin/platform-readiness" element={<AdminRouteGuard><PlatformReadiness /></AdminRouteGuard>} />
      {/* Canonical connections destination. /manage/connections, /connect/*
          and every legacy integrations path alias to it via ROUTE_ALIASES. */}
      <Route path="/manage/integrations" element={<Connections />} />
      <Route path="/manage/facilities" element={<ManageFacilities />} />
      <Route path="/compliance" element={<Compliance />} />
      <Route path="/teams" element={<Teams />} />
      <Route path="/marketplace" element={<Marketplace />} />
      <Route path="/app/agents" element={<ManageAgents />} />
      <Route path="/app/agents/:slug/detail" element={<AgentDetail />} />
      <Route path="/app/agents/:agentId/manage" element={<TwinManage />} />
      <Route path="/app/agents/:agentId/operations" element={<AgentOperationsRedirect />} />
      <Route path="/twins/:instanceId/manage" element={<TwinManageRedirect />} />
      <Route path="/studio/systems/:systemId/manage" element={<SystemManage />} />
      <Route path="/data-centre-twin/:id/blueprint" element={<Blueprint />} />
      {/* `/blueprint/preview` must precede `/blueprint/:id` or it is swallowed. */}
      <Route path="/blueprint/preview" element={<BlueprintPreview />} />
      <Route path="/blueprint/:id" element={<Blueprint />} />
      <Route path="/simulation" element={<AuraWorkspace />} />
      <Route path="/simulation/preview" element={<SimulationPreview />} />
      <Route path="/help" element={<Help />} />
      <Route path="/search" element={<Search />} />
      <Route path="/settings/ai" element={<AISettings />} />
      <Route path="/sign-out" element={<SignOut />} />
      <Route path="/playbook" element={<Playbook />} />
      <Route path="/data-centre-twin" element={<DataCentreTwin />} />
      <Route path="/data-centre-twin/:id" element={<DataCentreTwin />} />
      <Route path="/twin-preview" element={<TwinPreview />} />
      {/* Phase 2: tenant diagnostics expose twin ids, raw query state and
          telemetry sources, so this is an administration surface rather than
          a general internal one. */}
      <Route path="/twin-debug" element={<AdminRouteGuard><TwinDebug /></AdminRouteGuard>} />
      <Route path="/digital-twins-demo/funding-intake" element={<FundingIntakeDemo />} />
      <Route path="/infrastructure" element={<InfrastructurePage />} />
      {/* Stage 6F: every legacy alias resolves from one registry and keeps
          its query string, so deep links survive consolidation. */}
      {ROUTE_ALIASES.map((alias) => (
        <Route
          key={alias.from}
          path={alias.from}
          element={<PreserveNavigate to={alias.to} />}
        />
      ))}
      <Route path="/dsx/evidence-beta" element={<EvidenceBetaShell />}>
        <Route index element={<OverviewWorkspace />} />
        <Route path="overview" element={<OverviewWorkspace />} />
        {/* Canonical five-section Evidence IA (src/dsx/nav/evidenceNav.ts). */}
        <Route path="operations" element={<PreserveNavigate to="/dsx/evidence-beta/operations/thermal" />} />
        <Route path="operations/thermal" element={<ThermalWorkspace />} />
        <Route path="operations/power" element={<PowerWorkspace />} />
        <Route path="operations/cooling" element={<CoolingWorkspace />} />
        <Route path="operations/compute" element={<NetworkWorkspace />} />
        <Route path="operations/workload" element={<WorkloadWorkspace />} />
        <Route path="sustainability" element={<CarbonWorkspace />} />
        <Route path="sustainability/financial" element={<FinancialWorkspace />} />
        <Route path="sustainability/sovereignty" element={<SovereigntyWorkspace />} />
        <Route path="decisions" element={<SimulationsWorkspace />} />
        <Route path="decisions/log" element={<EvidenceWorkspace />} />
        <Route path="assets" element={<FacilityWorkspace />} />
        {/*
          AURA_IA_DUP_CLEANUP: these legacy children used to mount the same
          workspace components a second time, so every Evidence workspace had
          two live URLs and two entries in analytics, deep links and the
          dataset gate. They are now redirects: bookmarks keep working and the
          query string is preserved, but the canonical five-section IA above
          is the only address a workspace renders at.
        */}
        <Route path="thermal" element={<PreserveNavigate to="/dsx/evidence-beta/operations/thermal" />} />
        <Route path="power" element={<PreserveNavigate to="/dsx/evidence-beta/operations/power" />} />
        <Route path="cooling" element={<PreserveNavigate to="/dsx/evidence-beta/operations/cooling" />} />
        <Route path="network" element={<PreserveNavigate to="/dsx/evidence-beta/operations/compute" />} />
        <Route path="workload" element={<PreserveNavigate to="/dsx/evidence-beta/operations/workload" />} />
        <Route path="facility" element={<PreserveNavigate to="/dsx/evidence-beta/assets" />} />
        <Route path="simulations" element={<PreserveNavigate to="/dsx/evidence-beta/decisions" />} />
        <Route path="evidence" element={<PreserveNavigate to="/dsx/evidence-beta/decisions/log" />} />
        <Route path="carbon" element={<PreserveNavigate to="/dsx/evidence-beta/sustainability" />} />
        <Route path="financials" element={<PreserveNavigate to="/dsx/evidence-beta/sustainability/financial" />} />
        <Route path="sovereignty" element={<PreserveNavigate to="/dsx/evidence-beta/sustainability/sovereignty" />} />
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
          <DatasetProvider>
            <Layout>
              <DatasetCanaryBanner />
              <TourRenderer />
              <ReferenceRouteGate>
                <Suspense
                  fallback={
                    <div
                      role="status"
                      aria-live="polite"
                      className="p-6 text-sm text-muted-foreground"
                    >
                      Loading workspace...
                    </div>
                  }
                >
                  <ApprovedUserRoutes />
                </Suspense>
              </ReferenceRouteGate>
            </Layout>
          </DatasetProvider>
        </CoPilotCommandProvider>
      </CoPilotProvider>
    </TourProvider>
  );
}