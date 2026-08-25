import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const publicRoutes = read('src/PublicAppRoutes.tsx');
const shell = read('src/AuthenticatedShell.tsx');
const facilities = read('src/pages/manage/Facilities.tsx');
const builder = read('src/pages/Builder.tsx');
const connections = read('src/connections/api.ts');
const aiSettings = read('src/pages/AISettings.tsx');
const simulationPreview = read('src/pages/SimulationPreview.tsx');
const deploy = read('src/pages/Deploy.tsx');
const history = read('src/pages/DeploymentHistory.tsx');
const analytics = read('src/pages/IntelligenceDashboard.tsx');

describe('Phase 8 AURA DC golden journey contract', () => {
  it('starts with account creation and moves product setup behind authentication', () => {
    expect(publicRoutes).toContain('<Route path="/sign-up"');
    expect(publicRoutes).toContain('<Route path="/onboarding" element={<Navigate to="/sign-up" replace />} />');
    expect(shell).toContain('<Route path="/builder"');
  });

  it('creates one explicit facility identity before Builder and carries that exact twin forward', () => {
    expect(facilities).toContain("callRpc('create_facility_setup'");
    expect(facilities).toContain("nextStep === 'builder'");
    expect(facilities).toContain('/builder?new=true&twin=');
    expect(builder).toContain('Create your first facility');
    expect(builder).toContain("searchParams.get('twin')");
    expect(builder).toContain('builder.config?.twin_id');
    expect(builder).not.toContain("city: 'Montreal'");
  });

  it('keeps Connections and AI authority server-owned and organization-scoped', () => {
    expect(connections).toContain("active_org_id");
    expect(connections).not.toContain('Platform-wide (no tenant)');
    expect(aiSettings).toContain("runtimeControl: 'server_owned'");
    expect(aiSettings).toContain('This browser does not configure the AI provider');
    expect(aiSettings).not.toContain('localStorage');
  });

  it('uses one canonical simulation workspace and durable decision boundary', () => {
    expect(shell).toContain('<Route path="/simulation" element={<AuraWorkspace />} />');
    expect(shell).toContain('<Route path="/simulation/preview" element={<SimulationPreview />} />');
    expect(simulationPreview).toContain('/simulation');
    expect(shell).toContain('AuraWorkspace');
  });

  it('records configuration activation without fabricating runtime deployment', () => {
    expect(deploy).toContain('Activate in AURA');
    expect(deploy).toContain('external_runtime_provisioned: false');
    expect(deploy).toContain('runtime_verified: false');
    expect(deploy).toContain('runtimeUrl: null');
    expect(deploy).toContain('health: null');
    expect(history).toContain('classifyDeploymentTruth');
    expect(history).toContain('Activation & Runtime Evidence');
    expect(history).not.toContain('Running systems');
  });

  it('hands the operator into truthful operations, evidence and governance surfaces', () => {
    expect(shell).toContain('<Route path="/analytics"');
    expect(shell).toContain('<Route path="/compliance"');
    expect(shell).toContain('<Route path="/teams"');
    expect(shell).toContain('<Route path="/evidence" element={<EvidenceBetaShell />}>');
    expect(shell).toContain('<Route path="overview" element={<OverviewWorkspace />} />');
    expect(analytics).toContain("return { unavailable: true, data: { overview: null } }");
    expect(analytics).toContain('const dataTrust: DataTrustState | null = null');
  });
});
