import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { evaluateBuilderActivationReadiness } from '../../supabase/functions/_shared/builderActivationReadiness';

const readyConfig = {
  goal: 'Reduce facility risk',
  industry: 'Data Centres',
  department: 'Operations',
  type: '3d_twin',
  twin_id: '11111111-1111-4111-8111-111111111111',
  workflow: { actions: ['inspect'], integrations: ['dcim'] },
  model_config: { response_profile: 'balanced' },
  kpis: [{ id: 'pue', name: 'PUE' }],
  governance: { auditEnabled: true, tags: ['production'] },
};

describe('builder activation readiness', () => {
  it('blocks the original zero-simulation and zero-KPI failure', () => {
    const result = evaluateBuilderActivationReadiness(
      { ...readyConfig, kpis: [] },
      { verifiedSimulationCount: 0, versionCount: 0, facilityAvailable: true },
    );

    expect(result.isReady).toBe(false);
    expect(result.blockers.map((item) => item.id)).toEqual(
      expect.arrayContaining(['kpis', 'verified-simulation']),
    );
  });

  it('allows activation only when persisted blocking evidence is complete', () => {
    const result = evaluateBuilderActivationReadiness(readyConfig, {
      verifiedSimulationCount: 1,
      versionCount: 1,
      facilityAvailable: true,
    });

    expect(result.isReady).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it('ignores stale or forged client readiness flags', () => {
    const result = evaluateBuilderActivationReadiness(
      { ...readyConfig, clientReady: true, readinessScore: 100 },
      { verifiedSimulationCount: 0, versionCount: 1, facilityAvailable: true },
    );

    expect(result.isReady).toBe(false);
    expect(result.blockers.map((item) => item.id)).toContain('verified-simulation');
  });

  it('fails closed when persisted evidence cannot be read', () => {
    const result = evaluateBuilderActivationReadiness(readyConfig, {
      verifiedSimulationCount: 1,
      versionCount: 1,
      facilityAvailable: true,
      evidenceError: 'read failed',
    });

    expect(result.isReady).toBe(false);
    expect(result.blockers.map((item) => item.id)).toContain('evidence-read');
  });
});

describe('activation boundary contracts', () => {
  it('recomputes readiness at the Edge Function before updating status', () => {
    const source = readFileSync(resolve('supabase/functions/builders-deploy/index.ts'), 'utf8');
    const decision = source.indexOf('evaluateBuilderActivationReadiness');
    const rejection = source.indexOf('if (!readiness.isReady)');
    const update = source.indexOf("status: 'active'");

    expect(decision).toBeGreaterThanOrEqual(0);
    expect(rejection).toBeGreaterThan(decision);
    expect(update).toBeGreaterThan(rejection);
    expect(source).toContain(".eq('verification_level', 'server-validated')");
  });

  it('does not retain the direct browser update bypass', () => {
    const source = readFileSync(resolve('src/pages/Deploy.tsx'), 'utf8');
    expect(source).toContain('await builderService.deploy(systemId)');
    expect(source).not.toContain(".update({ status: 'active'");
  });
});
