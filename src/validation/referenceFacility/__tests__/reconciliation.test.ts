import { describe, expect, it } from 'vitest';
import {
  REFERENCE_ROLES,
  reconcileReferenceFacility,
} from '../spec';
import { evaluateFacilityRun } from '../report';
import type { RoleCoverage } from '@/components/twin-visualization/runtimeCoverageStore';
import type { RendererReport } from '@/validation/gpuAcceptance/renderer';
import { summariseFrames } from '@/validation/gpuAcceptance/benchmark';

const hardware: RendererReport = {
  classification: 'hardware',
  webglVersion: 'webgl2',
  webgl2Available: true,
  vendor: 'NVIDIA',
  renderer: 'NVIDIA GeForce RTX',
  unmaskedAvailable: true,
  browser: 'Google Chrome',
  operatingSystem: 'Windows',
  canvasResolution: { width: 1920, height: 1080 },
  devicePixelRatio: 1,
  qualityProfile: 'balanced',
  highPerformanceRequested: true,
  note: '',
};

const software: RendererReport = { ...hardware, classification: 'software', renderer: 'SwiftShader' };

const stableFrames = summariseFrames(Array.from({ length: 600 }, () => 16));
const stability = { longTasks: { count: 0, longestMs: 0 }, webglWarnings: [], contextLossEvents: 0 };

function coverage(role: string, patch: Partial<RoleCoverage> = {}): Record<string, RoleCoverage> {
  return {
    [role]: {
      role: role as RoleCoverage['role'],
      state: 'openusd-derived',
      assetId: 'asset.a',
      quality: 'operations',
      mountedObjects: 6,
      glbInstances: 6,
      derivativeUrl: 'https://cdn/asset.glb',
      proceduralObjects: 0,
      triangles: 100,
      drawCalls: 6,
      ...patch,
    },
  };
}

describe('reference facility reconciliation', () => {
  it('reports one row per expected role', () => {
    const result = reconcileReferenceFacility({});
    expect(result.rows).toHaveLength(REFERENCE_ROLES.length);
  });

  it('never claims a role the runtime did not mount', () => {
    const result = reconcileReferenceFacility({});
    expect(result.mountedObjects).toBe(0);
    expect(result.rolesDerived).toBe(0);
    expect(result.rows.every((r) => r.verdict !== 'openusd-derived')).toBe(true);
  });

  it('counts mounted objects from runtime coverage only', () => {
    const result = reconcileReferenceFacility(coverage('server-1u'));
    const row = result.rows.find((r) => r.role === 'server-1u');
    expect(row?.mountedObjects).toBe(6);
    expect(row?.verdict).toBe('openusd-derived');
    expect(result.uniqueDerivatives).toBe(1);
  });

  it('surfaces a blocked derivative as blocked, not procedural', () => {
    const result = reconcileReferenceFacility(
      coverage('server-1u', { state: 'blocked', mountedObjects: 0, glbInstances: 0 }),
    );
    expect(result.rows.find((r) => r.role === 'server-1u')?.verdict).toBe('blocked');
  });
});

describe('facility acceptance evaluation', () => {
  const base = {
    frames: stableFrames,
    stability,
    reconciliation: reconcileReferenceFacility({}),
    guidedViews: [],
    visualChecks: [],
  };

  it('fails immediately on a software renderer', () => {
    const outcome = evaluateFacilityRun({ ...base, renderer: software });
    expect(outcome.result).toBe('fail');
    expect(outcome.verdict).toBe('AURA_NVIDIA_REFERENCE_FACILITY_HARDWARE_VALIDATION_FAILED');
  });

  it('requires visual remediation when a human marks a check failed', () => {
    const outcome = evaluateFacilityRun({
      ...base,
      renderer: hardware,
      visualChecks: [{ id: 'scale', label: 'Scale', verdict: 'fail' }],
    });
    expect(outcome.verdict).toBe('AURA_NVIDIA_REFERENCE_FACILITY_VISUAL_REMEDIATION_REQUIRED');
  });

  it('reports a context loss as a failure', () => {
    const outcome = evaluateFacilityRun({
      ...base,
      renderer: hardware,
      stability: { ...stability, contextLossEvents: 1 },
    });
    expect(outcome.result).toBe('fail');
  });
});
