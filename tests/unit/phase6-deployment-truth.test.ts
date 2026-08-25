import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { classifyDeploymentTruth, deploymentTruthLabel } from '../../src/workspace/deploymentRecords';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Phase 6 deployment truth', () => {
  it('never promotes configuration activation into runtime verification', () => {
    expect(classifyDeploymentTruth({ status: 'active', runtime_url: null, health: null })).toBe('configuration_active');
    expect(classifyDeploymentTruth({ status: 'active', runtime_url: 'https://runtime.example', health: 'DEGRADED' })).toBe('runtime_connected');
    expect(classifyDeploymentTruth({ status: 'active', runtime_url: 'https://runtime.example', health: 'OK' })).toBe('runtime_verified');
    expect(classifyDeploymentTruth({ status: 'failed', runtime_url: null, health: null })).toBe('failed');
    expect(deploymentTruthLabel('configuration_active')).toBe('Configuration active');
  });

  it('presents deployment execution as AURA configuration activation', () => {
    const deploy = read('src/pages/Deploy.tsx');
    expect(deploy).toContain('Activate in AURA');
    expect(deploy).toContain('external_runtime_provisioned: false');
    expect(deploy).toContain('runtime_verified: false');
    expect(deploy).toContain('runtimeUrl: null');
    expect(deploy).toContain('health: null');
    expect(deploy).not.toContain('Deploy to Production');
    expect(deploy).not.toContain('Provision runtime');
    expect(deploy).not.toContain('Register webhooks');
    expect(deploy).not.toContain('Warm model');
    expect(deploy).not.toContain('AWS Recommendations');
    expect(deploy).not.toContain('Azure Recommendations');
    expect(deploy).not.toContain('GCP Recommendations');
  });

  it('uses the canonical evidence classifier in history', () => {
    const history = read('src/pages/DeploymentHistory.tsx');
    expect(history).toContain('Activation & Runtime Evidence');
    expect(history).toContain('classifyDeploymentTruth');
    expect(history).toContain('Runtime verified');
    expect(history).toContain('Configuration active');
    expect(history).not.toContain('Running systems');
    expect(history).not.toContain('Runtime Environments');
  });
});
