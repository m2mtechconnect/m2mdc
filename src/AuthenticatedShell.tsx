/** Authenticated AURA application shell and canonical route table. */
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { AuthenticatedEntryRedirect } from "@/routing/AuthenticatedEntryRedirect";
import { Layout } from "@/components/Layout";
import { PreserveNavigate } from "@/routing/PreserveNavigate";
import { ROUTE_ALIASES } from "@/config/routeAliases";
import { EVIDENCE_ROOT } from "@/config/evidenceRoutes";
import { CoPilotProvider } from "@/contexts/CoPilotContext";
import { CoPilotCommandProvider } from "@/contexts/CoPilotCommandContext";
import { TourProvider } from "@/context/TourContext";
import { LazyTourRenderer } from "@/tours/LazyTourRenderer";
import { lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import { RouteLoadRecovery } from "@/routing/RouteLoadRecovery";
import { DatasetProvider } from '@/data/dataset/DatasetProvider';
import DatasetCanaryBanner from '@/components/dataset/DatasetCanaryBanner';
import ReferenceRouteGate from '@/components/dataset/ReferenceRouteGate';
import { AdminRouteGuard } from '@/routing/AdminRouteGuard';
import { PermissionRouteGuard } from '@/routing/PermissionRouteGuard';
import NotFound from "./pages/NotFound";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Builder = lazy(() => import("./pages/Builder"));
const Deploy = lazy(() => import("./pages/Deploy"));
const DeploymentHistory = lazy(() => import("./pages/DeploymentHistory"));
const IntelligenceDashboard = lazy(() => import("./pages/IntelligenceDashboard"));
const Compliance = lazy(() => import("./pages/Compliance"));
// Legacy static reference page. Its operational figures are illustrative mock
// data with no navigation entry point, so it is compiled and routed in
// development builds only; production direct URLs fall through to NotFound.
const InfrastructurePage = import.meta.env.DEV
  ? lazy(() => import("./pages/InfrastructurePage"))
  : null;
const DataCentreTwin = lazy(() => import("./pages/DataCentreTwin"));
const Teams = lazy(() => import("./pages/Teams"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const Help = lazy(() => import("./pages/Help"));
const Search = lazy(() => import("./pages/Search"));
const AISettings = lazy(() => import("./pages/AISettings"));
const Connections = lazy(() => import("./pages/Connections"));
const ManageFacilities = lazy(() => import("./pages/manage/Facilities"));
const SignOut = lazy(() => import("./pages/auth/index").then((m) => ({ default: m.SignOut })));
const AgentWorkspace = lazy(() => import("./pages/AgentWorkspace"));
const AgentChat = lazy(() => import("./pages/AgentChat"));
// Demo-only intake surface. Development builds only, so production emits no chunk.
const FundingIntakeDemo = import.meta.env.DEV
  ? lazy(() => import("./pages/FundingIntakeDemo"))
  : null;
const ManageAgents = lazy(() => import("./pages/ManageAgents"));
const SystemManage = lazy(() => import("./pages/SystemManage"));
const TwinManage = lazy(() => import("./pages/TwinManage"));
const Blueprint = lazy(() => import("./pages/Blueprint"));
const BlueprintPreview = lazy(() => import("./pages/BlueprintPreview"));
const SimulationPreview = lazy(() => import("./pages/SimulationPreview"));
const AuraWorkspace = lazy(() => import("./workspace/AuraWorkspace"));
const TwinPreview = lazy(() => import("./pages/TwinPreview"));
const TwinDebug = lazy(() => import("./pages/TwinDebug"));
const AgentDetail = lazy(() => import("./pages/AgentDetail"));
const Profile = lazy(() => import("./pages/account/Profile"));
const Settings = lazy(() => import("./pages/account/Settings"));
const AccessControl = lazy(() => import("./pages/account/AccessControl"));
const PeopleAccessLayout = lazy(() => import("./pages/people/PeopleAccessLayout"));
const AdminConsoleLayout = lazy(() => import("./pages/admin/AdminConsoleLayout"));

const Customers = lazy(() => import("./pages/admin/Customers"));
const OnboardingSubmissions = lazy(() => import("./pages/OnboardingSubmissions"));
const PlatformReadiness = lazy(() => import("./pages/admin/PlatformReadiness"));
const AssetPreview = lazy(() => import("@/pages/admin/AssetPreview"));
const AssetPipeline = lazy(() => import("@/pages/admin/AssetPipeline"));
const AssetValidation = lazy(() => import("@/pages/admin/AssetValidation"));
const ReferenceFacilityValidation = lazy(() => import("@/pages/admin/ReferenceFacilityValidation"));
const DsxCapabilityRegistryPage = lazy(() => import("@/pages/admin/DsxCapabilityRegistryPage"));
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
const OverlayFixtures = import.meta.env.DEV ? lazy(() => import("./pages/test/OverlayFixtures")) : null;

function AgentOperationsRedirect() {
  const { agentId } = useParams();
  return <Navigate to={`/app/agents/${agentId}/manage`} replace />;
}
function TwinManageRedirect() {
  const { instanceId } = useParams();
  return <Navigate to={`/app/agents/${instanceId}/manage`} replace />;
}

/**
 * Single compatibility hop from the retired implementation-named Evidence
 * family onto the neutral `/evidence` family. `PreserveNavigate` carries the
 * query string and hash across, so an old shared deep link keeps its context.
 */
function LegacyEvidenceRedirect() {
  const params = useParams();
  const splat = params['*'] ?? '';
  return <PreserveNavigate to={splat ? `${EVIDENCE_ROOT}/${splat}` : `${EVIDENCE_ROOT}/overview`} />;
}

function ApprovedUserRoutes() {
  return (
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/login" element={<AuthenticatedEntryRedirect />} />
      <Route path="/onboarding" element={<AuthenticatedEntryRedirect />} />
      <Route path="/builder" element={<PermissionRouteGuard permission="twin.edit"><Builder /></PermissionRouteGuard>} />
      <Route path="/deploy" element={<PermissionRouteGuard permission="deployment.execute"><Deploy /></PermissionRouteGuard>} />
      <Route path="/deployments" element={<PermissionRouteGuard permission="deployment.view"><DeploymentHistory /></PermissionRouteGuard>} />
      <Route path="/agent/:id" element={<AgentWorkspace />} />
      <Route path="/agents/:id/chat" element={<AgentChat />} />
      <Route path="/analytics" element={<PermissionRouteGuard permission="analytics.view"><IntelligenceDashboard /></PermissionRouteGuard>} />
      {/* Sovereignty / compliance evidence is a read-only reporting surface in
          the same family as /analytics and the Evidence workspaces, so it is
          gated on the same least-privileged read permission. Previously it was
          mounted unguarded, which let any authenticated caller (including a
          pilot-plane caller) reach the page and its queries. */}
      <Route path="/compliance" element={<PermissionRouteGuard permission="analytics.view"><Compliance /></PermissionRouteGuard>} />
      {import.meta.env.DEV && InfrastructurePage && (
        <Route path="/infrastructure" element={<InfrastructurePage />} />
      )}
      <Route path="/account/profile" element={<Profile />} />
      <Route path="/account/settings" element={<Settings />} />

      <Route path="/teams" element={<PermissionRouteGuard permission="tenant.view_members"><PeopleAccessLayout><Teams /></PeopleAccessLayout></PermissionRouteGuard>} />
      <Route path="/teams/access-control" element={<PermissionRouteGuard permission="authz.view_assignments"><PeopleAccessLayout><AccessControl /></PeopleAccessLayout></PermissionRouteGuard>} />
      <Route
        path="/teams/onboarding"
        element={<AdminRouteGuard><PeopleAccessLayout><OnboardingSubmissions /></PeopleAccessLayout></AdminRouteGuard>}
      />

      <Route path="/admin/customers" element={<AdminRouteGuard permission="platform.manage_customers"><AdminConsoleLayout><Customers /></AdminConsoleLayout></AdminRouteGuard>} />
      <Route path="/admin/asset-preview" element={<AdminRouteGuard><AdminConsoleLayout><AssetPreview /></AdminConsoleLayout></AdminRouteGuard>} />
      <Route path="/admin/asset-pipeline" element={<AdminRouteGuard><AdminConsoleLayout><AssetPipeline /></AdminConsoleLayout></AdminRouteGuard>} />
      <Route path="/admin/asset-validation/:assetId" element={<AdminRouteGuard><AdminConsoleLayout><AssetValidation /></AdminConsoleLayout></AdminRouteGuard>} />
      <Route path="/admin/reference-facility-validation" element={<AdminRouteGuard><AdminConsoleLayout><ReferenceFacilityValidation /></AdminConsoleLayout></AdminRouteGuard>} />
      <Route path="/admin/accelerated-ai-capabilities" element={<AdminRouteGuard><AdminConsoleLayout><DsxCapabilityRegistryPage /></AdminConsoleLayout></AdminRouteGuard>} />
      <Route path="/admin/dataset-registry" element={<AdminRouteGuard><AdminConsoleLayout><DatasetRegistryPage /></AdminConsoleLayout></AdminRouteGuard>} />
      <Route path="/admin/platform-readiness" element={<AdminRouteGuard><AdminConsoleLayout><PlatformReadiness /></AdminConsoleLayout></AdminRouteGuard>} />

      <Route path="/manage/integrations" element={<PermissionRouteGuard permission="twin.edit"><Connections /></PermissionRouteGuard>} />
      <Route path="/manage/facilities" element={<PermissionRouteGuard permission="twin.edit"><ManageFacilities /></PermissionRouteGuard>} />
      <Route path="/marketplace" element={<Marketplace />} />
      <Route path="/app/agents" element={<PermissionRouteGuard permission="agent.view"><ManageAgents /></PermissionRouteGuard>} />
      <Route path="/app/agents/:slug/detail" element={<PermissionRouteGuard permission="agent.view"><AgentDetail /></PermissionRouteGuard>} />
      <Route path="/app/agents/:agentId/manage" element={<PermissionRouteGuard permission="agent.view"><TwinManage /></PermissionRouteGuard>} />
      <Route path="/app/agents/:agentId/operations" element={<AgentOperationsRedirect />} />
      <Route path="/twins/:instanceId/manage" element={<TwinManageRedirect />} />
      <Route path="/studio/systems/:systemId/manage" element={<PermissionRouteGuard permission="twin.edit"><SystemManage /></PermissionRouteGuard>} />
      <Route path="/data-centre-twin" element={<DataCentreTwin />} />
      <Route path="/data-centre-twin/:id" element={<DataCentreTwin />} />
      <Route path="/data-centre-twin/:id/blueprint" element={<Blueprint />} />
      <Route path="/blueprint/preview" element={<BlueprintPreview />} />
      <Route path="/blueprint/:id" element={<Blueprint />} />
      <Route path="/simulation" element={<AuraWorkspace />} />
      <Route path="/simulation/preview" element={<SimulationPreview />} />
      <Route path="/help" element={<Help />} />
      <Route path="/search" element={<Search />} />
      <Route path="/settings/ai" element={<PermissionRouteGuard permission="agent.administer"><AISettings /></PermissionRouteGuard>} />
      <Route path="/sign-out" element={<SignOut />} />
      <Route path="/twin-preview" element={<TwinPreview />} />
      <Route path="/twin-debug" element={<AdminRouteGuard><AdminConsoleLayout><TwinDebug /></AdminConsoleLayout></AdminRouteGuard>} />
      {/* Demo-only intake surface. Not a supported production feature, so it is
          reachable in development builds only. */}
      {import.meta.env.DEV && FundingIntakeDemo && (
        <Route path="/digital-twins-demo/funding-intake" element={<FundingIntakeDemo />} />
      )}

      {ROUTE_ALIASES.map((alias) => (
        <Route key={alias.from} path={alias.from} element={<PreserveNavigate to={alias.to} />} />
      ))}

      {/* Neutral canonical Evidence family. The same shell and workspaces as
          before; only the URL vocabulary changed. */}
      <Route path="/evidence" element={<EvidenceBetaShell />}>
        <Route index element={<PreserveNavigate to="/evidence/overview" />} />
        <Route path="overview" element={<OverviewWorkspace />} />
        <Route path="operations" element={<PreserveNavigate to="/evidence/operations/thermal" />} />
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
      </Route>
      {/* Pre-consolidation flat paths, still accepted as deep links. */}
      <Route path="/evidence/thermal" element={<PreserveNavigate to="/evidence/operations/thermal" />} />
      <Route path="/evidence/power" element={<PreserveNavigate to="/evidence/operations/power" />} />
      <Route path="/evidence/cooling" element={<PreserveNavigate to="/evidence/operations/cooling" />} />
      <Route path="/evidence/network" element={<PreserveNavigate to="/evidence/operations/compute" />} />
      <Route path="/evidence/workload" element={<PreserveNavigate to="/evidence/operations/workload" />} />
      <Route path="/evidence/facility" element={<PreserveNavigate to="/evidence/assets" />} />
      <Route path="/evidence/simulations" element={<PreserveNavigate to="/evidence/decisions" />} />
      <Route path="/evidence/evidence" element={<PreserveNavigate to="/evidence/decisions/log" />} />
      <Route path="/evidence/carbon" element={<PreserveNavigate to="/evidence/sustainability" />} />
      <Route path="/evidence/financials" element={<PreserveNavigate to="/evidence/sustainability/financial" />} />
      <Route path="/evidence/sovereignty" element={<PreserveNavigate to="/evidence/sustainability/sovereignty" />} />
      {/* Compatibility only: the retired implementation-named family maps onto
          the neutral one in a single hop, preserving query and hash. */}
      <Route path="/dsx/evidence-beta/*" element={<LegacyEvidenceRedirect />} />
      {import.meta.env.DEV && OverlayFixtures ? <Route path="/dev-overlays" element={<OverlayFixtures />} /> : null}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function AuthenticatedShell() {
  const location = useLocation();
  return (
    <TourProvider>
      <CoPilotProvider>
        <CoPilotCommandProvider>
          <DatasetProvider>
            <Layout>
              <DatasetCanaryBanner />
              <LazyTourRenderer />
              <ReferenceRouteGate>
                <RouteLoadRecovery resetKey={location.pathname}>
                  <Suspense
                    fallback={
                      <div role="status" aria-live="polite" className="p-6 text-sm text-muted-foreground">
                        Loading workspace...
                      </div>
                    }
                  >
                    <ApprovedUserRoutes />
                  </Suspense>
                </RouteLoadRecovery>
              </ReferenceRouteGate>
            </Layout>
          </DatasetProvider>
        </CoPilotCommandProvider>
      </CoPilotProvider>
    </TourProvider>
  );
}
