import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('Phase 9 - deployment records are event-driven, not timer-driven', () => {
  it('Deploy page advances no stage on a timer', () => {
    const source = read('src/pages/Deploy.tsx');
    expect(source).not.toMatch(/setTimeout\(resolve/);
    expect(source).not.toMatch(/setTimeout\(/);
  });

  it('Sovereign deployment steps no longer script phases on timers', () => {
    const source = read('src/twins/sovereignDataCenter/components/SovereignDCDeploymentSteps.tsx');
    expect(source).not.toMatch(/setTimeout/);
    expect(source).not.toMatch(/Simulate phased deployment/);
  });

  it('Deploy page writes through the canonical deployment model', () => {
    const source = read('src/pages/Deploy.tsx');
    expect(source).toContain('@/workspace/deploymentRecords');
    expect(source).toContain('appendDeploymentEvent');
    expect(source).toContain('closeDeployment');
  });

  it('the deprecated deployment_tracking table has no remaining writers', () => {
    const source = read('src/pages/Deploy.tsx');
    expect(source).not.toContain('deployment_tracking');
  });

  it('the event log module never updates or deletes recorded events', () => {
    const source = read('src/workspace/deploymentRecords.ts');
    const eventWrites = source.slice(source.indexOf('appendDeploymentEvent'));
    expect(eventWrites).not.toMatch(/from\('deployment_events'\)\s*\.\s*(update|delete)/);
  });
});
