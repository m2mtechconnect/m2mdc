import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const publicRoutes = read('src/PublicAppRoutes.tsx');
const facilities = read('src/pages/manage/Facilities.tsx');
const builder = read('src/pages/Builder.tsx');
const connections = read('src/connections/api.ts');
const aiSettings = read('src/pages/AISettings.tsx');
const simulationPreview = read('src/pages/SimulationPreview.tsx');
const runLifecycle = read('supabase/functions/run-lifecycle/index.ts');
const decisionPersistence = read('src/workspace/decisionPersistence.ts');
const deploy = read('src/pages/Deploy.tsx');
const deploymentRecords = read('src/workspace/deploymentRecords.ts');
const deploymentHistory = read('src/pages/DeploymentHistory.tsx');
const navigation = read('src/config/appNavigation.ts');

describe('Phase 8 AURA golden journey', () => {
  it('starts with account creation instead of a browser-local questionnaire gate', () => {
    expect(publicRoutes).toContain('<Route path="/sign-up" element={withPublicRouteFallback(<SignUp />)} />');
    expect(publicRoutes).toContain('<Route path="/onboarding" element={<Navigate to="/sign-up" replace />} />');
    expect(publicRoutes).not.toContain('onboarding_completed');
  });

  it('creates one explicit tenant-bound facility identity before Build begins', () => {
    expect(facilities).toContain("callRpc('create_facility_setup'");
    expect(facilities).toContain('supabase.rpc(fn as never, args as never)');
    expect(facilities).not.toContain('const callRpc = supabase.rpc as unknown as');
    expect(facilities).toContain("toast.error('Enter a facility name.')");
    expect(facilities).toContain("toast.error('Select the facility region.')");
    expect(facilities).toContain("toast.error('Select the facility tier.')");
    expect(facilities).toContain("toast.error('Enter a design capacity greater than 0 kW.')");
    expect(facilities).toContain("twin.metadata?.provisioned !== 'default_starter_twin'");
    expect(facilities).toContain("navigate(`/builder?new=true&twin=${encodeURIComponent(row.twin_id)}&source=facility&type=3d_twin`");
  });

  it('keeps Builder bound to the same facility and fails closed when the binding is missing', () => {
    expect(builder).toContain('Create your first facility');
    expect(builder).toContain("window.location.assign('/manage/facilities?create=true&next=builder')");
    expect(builder).toContain('builder.config?.twin_id');
    expect(builder).toContain('This build is not bound to a facility');
    expect(builder).toContain('The bound facility is no longer available');
    expect(builder).toContain("nextLabel={effectiveCurrentStep === 5 ? 'Activate configuration' : undefined}");
  });

  it('binds Connections to the canonical active organization instead of a platform-wide browser scope', () => {
    expect(connections).toContain("active_org_id");
    expect(connections).toContain('useCurrentTenantId');
    expect(connections).not.toContain('Platform-wide (no tenant)');
  });

  it('keeps AI provider and model authority on the server', () => {
    expect(aiSettings).toContain("runtimeControl: 'server_owned';");
    expect(aiSettings).toContain("invokeEdgeFunction('ai-config', {})");
    expect(aiSettings).toContain("invokeEdgeFunction('copilot-health', {})");
    expect(aiSettings).not.toContain('DEFAULT_EXTERNAL_MODEL');
    expect(aiSettings).not.toContain('localStorage');
  });

  it('uses one canonical Simulation workspace and active-organization run tenancy', () => {
    expect(simulationPreview).toContain('return <Navigate to={`/simulation${suffix}`} replace />;');
    expect(runLifecycle).toContain('supabase.rpc("active_org_id")');
    expect(runLifecycle).toContain('supabase.rpc("org_has_role"');
    expect(runLifecycle).toContain('twin.org_id !== activeOrgId');
    expect(runLifecycle).toContain('client-generated-unverified');
    expect(runLifecycle).toContain('"preview"');
  });

  it('persists review decisions to the server evidence boundary before local presentation state', () => {
    expect(decisionPersistence).toContain("supabase.functions.invoke('record-decision'");
    expect(decisionPersistence).toContain('if (!input.run.serverId)');
    expect(decisionPersistence).toContain('idempotencyKey');
    expect(decisionPersistence).toContain('recommendationId');
    expect(decisionPersistence).toContain('rationale');
  });

  it('activates configuration truthfully without claiming external runtime deployment', () => {
    expect(deploy).toContain('Activate in AURA');
    expect(deploy).toContain('external_runtime_provisioned: false');
    expect(deploy).toContain('runtime_verified: false');
    expect(deploy).toContain('runtimeUrl: null');
    expect(deploy).toContain('health: null');
    expect(deploy).not.toContain('Deploy to Production');
    expect(deploy).not.toContain('AWS Recommendations');
  });

  it('promotes runtime state only from retained URL and positive health evidence', () => {
    expect(deploymentRecords).toContain("if (hasRuntime && VERIFIED_HEALTH.has(health)) return 'runtime_verified';");
    expect(deploymentRecords).toContain("return 'configuration_active';");
    expect(deploymentHistory).toContain('Activation & Runtime Evidence');
    expect(deploymentHistory).toContain('classifyDeploymentTruth');
    expect(deploymentHistory).not.toContain('Running systems');
  });

  it('exposes the product lifecycle as Build, Operate, Simulation and Evidence rather than internal routes', () => {
    expect(navigation).toContain("fullName: 'Build & Configure'");
    expect(navigation).toContain("fullName: 'Operate'");
    expect(navigation).toContain("fullName: 'Simulation'");
    expect(navigation).toContain("fullName: 'Evidence'");
    expect(navigation).toContain("fullName: 'Activation & Runtime Evidence'");
  });
});
