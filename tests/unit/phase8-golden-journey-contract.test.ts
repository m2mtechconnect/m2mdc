import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const publicRoutes = read('src/PublicAppRoutes.tsx');
const shell = read('src/AuthenticatedShell.tsx');
const navigation = read('src/config/appNavigation.ts');
const facilities = read('src/pages/manage/Facilities.tsx');
const builder = read('src/pages/Builder.tsx');
const connections = read('src/connections/api.ts');
const aiSettings = read('src/pages/AISettings.tsx');
const simulationPreview = read('src/pages/SimulationPreview.tsx');
const decidePanel = read('src/workspace/panels/DecidePanel.tsx');
const deploy = read('src/pages/Deploy.tsx');
const history = read('src/pages/DeploymentHistory.tsx');
const analytics = read('src/pages/IntelligenceDashboard.tsx');

describe('Phase 8 AURA DC golden journey contract', () => {
  it('starts with account authentication and keeps product setup behind approval', () => {
    expect(publicRoutes).toContain('<Route path="/auth"');
    expect(publicRoutes).toContain('<Route path="/onboarding" element={<Navigate to="/auth" replace />} />');
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
    expect(builder).not.toContain('Start blank');
  });

  it('keeps Connections and AI authority server-owned and organization-scoped', () => {
    expect(connections).toContain('active_org_id');
    expect(connections).not.toContain('Platform-wide (no tenant)');
    expect(aiSettings).toContain("runtimeControl: 'server_owned'");
    expect(aiSettings).toContain('This browser does not configure the AI provider');
    expect(aiSettings).not.toContain('localStorage');
  });

  it('uses one canonical Simulation workspace and durable server-first decisions', () => {
    expect(shell).toContain('<Route path="/simulation" element={<AuraWorkspace />} />');
    expect(shell).toContain('<Route path="/simulation/preview" element={<SimulationPreview />} />');
    expect(simulationPreview).toContain('<Navigate to={`/simulation${suffix}`} replace />');
    expect(decidePanel).toContain('await persistDecision');
    expect(decidePanel).toContain("run.validationStatus === 'server-validated'");
    expect(decidePanel).toContain('it cannot be approved');
  });

  it('records configuration activation without fabricating external runtime deployment', () => {
    expect(deploy).toContain('Activate in AURA');
    expect(deploy).toContain('external_runtime_provisioned: false');
    expect(deploy).toContain('runtime_verified: false');
    expect(deploy).toContain('runtimeUrl: null');
    expect(deploy).toContain('health: null');
    expect(history).toContain('classifyDeploymentTruth');
    expect(history).toContain('Activation & Runtime Evidence');
    expect(history).not.toContain('Running systems');
    expect(history).not.toContain('Runtime Environments');
  });

  it('makes Build, Operate, Simulation and Evidence discoverable as one lifecycle', () => {
    expect(navigation).toContain("name: 'Build'");
    expect(navigation).toContain("href: '/builder'");
    expect(navigation).toContain("name: 'Operate'");
    expect(navigation).toContain("href: '/analytics'");
    expect(navigation).toContain("name: 'Simulation'");
    expect(navigation).toContain("name: 'Evidence'");
    expect(navigation).toContain("fullName: 'Activation & Runtime Evidence'");
  });

  it('hands the operator into truthful operations, evidence and governance surfaces', () => {
    expect(shell).toContain('<Route path="/analytics"');
    expect(shell).toContain('<Route path="/compliance"');
    expect(shell).toContain('<Route path="/teams"');
    expect(shell).toContain('<Route path="/evidence" element={<EvidenceBetaShell />}>');
    expect(shell).toContain('<Route path="overview" element={<OverviewWorkspace />} />');
    expect(analytics).toContain('unavailable');
    expect(analytics).toContain('dataTrust');
  });
});
