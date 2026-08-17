import { describe, expect, it } from 'vitest';
import {
  DSX_CAPABILITIES,
  DSX_STATUSES,
  canSetStatus,
  capabilitiesForRoute,
  capabilityCountsByStatus,
  getCapability,
  validateCapability,
  validateRegistry,
  type DsxCapability,
} from '../dsxCapabilityRegistry';
import { PAGE_POSITIONING } from '../pagePositioning';

const base = (over: Partial<DsxCapability> = {}): DsxCapability => ({
  id: 'x',
  name: 'X',
  route: '/x',
  dsxArea: 'Data lake',
  owner: 'AURA',
  status: 'AURA_NATIVE',
  runtimeEvidence: 'src/x.ts',
  dataSource: 'AURA',
  lastValidatedAt: '2026-08-17',
  validationMethod: 'unit-test',
  limitations: [],
  blockers: [],
  nvidiaReference: null,
  nvidiaCodeOrServiceIntegrated: false,
  openUsdCanonical: false,
  simReadyValidated: false,
  auraRuntime: true,
  safeOutsideAdmin: true,
  ...over,
});

describe('DSX capability registry', () => {
  it('uses exactly the seven approved status levels', () => {
    expect(DSX_STATUSES).toEqual([
      'AURA_NATIVE',
      'DSX_ALIGNED',
      'NVIDIA_INTEGRATED',
      'SIMREADY_VALIDATED',
      'PLANNED',
      'BLOCKED',
      'UNAVAILABLE',
    ]);
  });

  it('has unique, stable capability ids', () => {
    const ids = DSX_CAPABILITIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ships with no evidence violations', () => {
    expect(validateRegistry()).toEqual({});
  });

  it('claims no NVIDIA-integrated and no SimReady-validated capability today', () => {
    const counts = capabilityCountsByStatus();
    expect(counts.NVIDIA_INTEGRATED).toBe(0);
    expect(counts.SIMREADY_VALIDATED).toBe(0);
    expect(DSX_CAPABILITIES.some((c) => c.simReadyValidated)).toBe(false);
    expect(DSX_CAPABILITIES.some((c) => c.nvidiaCodeOrServiceIntegrated)).toBe(false);
  });

  it('refuses NVIDIA_INTEGRATED without runtime evidence of NVIDIA code', () => {
    const problems = validateCapability(
      base({ status: 'NVIDIA_INTEGRATED', nvidiaCodeOrServiceIntegrated: false }),
    );
    expect(problems.join(' ')).toContain('nvidiaCodeOrServiceIntegrated');
  });

  it('refuses SIMREADY_VALIDATED without validated metadata and an OpenUSD master', () => {
    const problems = validateCapability(base({ status: 'SIMREADY_VALIDATED' }));
    expect(problems.join(' ')).toContain('SimReady metadata');
    expect(problems.join(' ')).toContain('canonical OpenUSD source');
  });

  it('refuses BLOCKED without a documented blocker', () => {
    expect(validateCapability(base({ status: 'BLOCKED', blockers: [] }))).toHaveLength(1);
  });

  it('distinguishes the OpenUSD master from the browser derivative', () => {
    const pipeline = getCapability('openusd-asset-pipeline')!;
    expect(pipeline.openUsdCanonical).toBe(true);
    expect(pipeline.limitations.join(' ')).toContain('never replace the OpenUSD master');
  });

  it('keeps the AURA Web Runtime distinct from an Omniverse Kit session', () => {
    const runtime = getCapability('runtime-environments')!;
    const kit = getCapability('omniverse-kit-session')!;
    expect(runtime.auraRuntime).toBe(true);
    expect(runtime.limitations.join(' ')).toContain('not Omniverse Kit');
    expect(kit.status).toBe('UNAVAILABLE');
  });

  it('keeps Brev and AWS honestly planned', () => {
    expect(getCapability('brev-gpu-lane')!.status).toBe('PLANNED');
    expect(getCapability('aws-production-lane')!.status).toBe('PLANNED');
  });

  it('reports the integration boundary as aligned, never connected', () => {
    const integrations = getCapability('integrations')!;
    expect(integrations.status).toBe('DSX_ALIGNED');
    expect(integrations.blockers.length).toBeGreaterThan(0);
  });

  it('separates live from simulated data on the telemetry capability', () => {
    const ops = getCapability('operations-telemetry')!;
    expect(ops.limitations.join(' ')).toContain('Live telemetry sources: 0');
  });

  it('never lets a non-admin set a claim-bearing status', () => {
    expect(canSetStatus('NVIDIA_INTEGRATED', false)).toBe(false);
    expect(canSetStatus('SIMREADY_VALIDATED', false)).toBe(false);
    expect(canSetStatus('AURA_NATIVE', false)).toBe(false);
    expect(canSetStatus('NVIDIA_INTEGRATED', true)).toBe(true);
  });

  it('binds every positioned page to a real capability', () => {
    for (const page of PAGE_POSITIONING) {
      expect(getCapability(page.capabilityId), page.route).toBeDefined();
    }
  });

  it('resolves capabilities by route', () => {
    expect(capabilitiesForRoute('/simulation').map((c) => c.id)).toEqual(['simulation-studio']);
  });
});