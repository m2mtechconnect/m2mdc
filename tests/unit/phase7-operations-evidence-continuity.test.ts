import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const navigation = read('src/config/appNavigation.ts');
const shell = read('src/AuthenticatedShell.tsx');
const deploy = read('src/pages/Deploy.tsx');
const history = read('src/pages/DeploymentHistory.tsx');
const analytics = read('src/pages/IntelligenceDashboard.tsx');

describe('Phase 7 operations and evidence continuity', () => {
  it('keeps Operate and Evidence as first-class persistent lifecycle workspaces', () => {
    expect(navigation).toContain("fullName: 'Operate'");
    expect(navigation).toContain("href: '/analytics'");
    expect(navigation).toContain("fullName: 'Evidence'");
    expect(navigation).toContain("href: `${EVIDENCE_ROOT}/overview`");
  });

  it('routes canonical operations and evidence workspaces to real application surfaces', () => {
    expect(shell).toContain('<Route path="/analytics"');
    expect(shell).toContain('<Route path="/evidence" element={<EvidenceBetaShell />}>');
    expect(shell).toContain('<Route path="overview" element={<OverviewWorkspace />} />');
    expect(shell).toContain('IntelligenceDashboard');
    expect(shell).toContain('OverviewWorkspace');
  });

  it('hands activation into durable evidence before the operator continues', () => {
    expect(deploy).toContain('appendDeploymentEvent');
    expect(deploy).toContain('closeDeployment');
    expect(deploy).toContain("action: 'activate_configuration'");
    expect(deploy).toContain("navigate('/deployments')");
    expect(history).toContain('listDeploymentEvents');
    expect(history).toContain('Activation & Runtime Evidence');
  });

  it('keeps runtime truth separate from configuration activation in the operations handoff', () => {
    expect(deploy).toContain('external_runtime_provisioned: false');
    expect(deploy).toContain('runtime_verified: false');
    expect(history).toContain('classifyDeploymentTruth');
    expect(history).toContain('Configuration active');
    expect(history).toContain('Runtime verified');
    expect(history).not.toContain('Running systems');
  });

  it('fails closed when operations sources are unavailable instead of fabricating telemetry', () => {
    expect(analytics).toContain("return { unavailable: true, data: { overview: null } }");
    expect(analytics).toContain("return { unavailable: true, data: { systems: [], total: 0, page: 1, pageSize: 50 } }");
    expect(analytics).toContain('const dataTrust: DataTrustState | null = null');
  });
});
