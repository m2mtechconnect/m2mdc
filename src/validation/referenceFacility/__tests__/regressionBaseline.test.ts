import { describe, expect, it } from 'vitest';
import {
  BASELINE_AURA_FACILITY_OBJECTS,
  BASELINE_FACILITY_FAMILIES,
  BASELINE_NVIDIA_OBJECTS,
  BASELINE_RACK_CABINETS,
  evaluateRuntimeRegression,
  type RegressionInput,
} from '../regressionBaseline';
import type { RoleCoverage } from '@/components/twin-visualization/runtimeCoverageStore';
import type { FacilityFamily, FacilityFamilyState } from '@/components/twin-visualization/facilityDerivativeStore';

const AURA_IDS = new Set(['aura.facility']);

function role(name: string, mounted: number, assetId: string): RoleCoverage {
  return {
    role: name as RoleCoverage['role'],
    state: 'openusd-derived',
    assetId,
    quality: 'operations',
    mountedObjects: mounted,
    glbInstances: mounted,
    derivativeUrl: `https://cdn/${assetId}.glb`,
    proceduralObjects: 0,
    triangles: 10,
    drawCalls: 1,
  };
}

function healthyInput(): RegressionInput {
  const roles: Record<string, RoleCoverage> = {};
  // 7 NVIDIA roles carrying 138 equipment objects, plus 40 cabinets = 178.
  const split = [20, 20, 20, 20, 20, 20, 18];
  split.forEach((n, i) => {
    roles[`nvidia-${i}`] = role(`nvidia-${i}`, n, `nvidia.asset.${i}`);
  });
  roles.facility = role('facility', BASELINE_AURA_FACILITY_OBJECTS, 'aura.facility');

  const rackMounts: Record<string, { mounted: boolean }> = {};
  for (let i = 0; i < BASELINE_RACK_CABINETS; i += 1) rackMounts[`rack-${i}`] = { mounted: true };

  const families = Object.fromEntries(
    BASELINE_FACILITY_FAMILIES.map((f) => [f, 'mounted' as FacilityFamilyState]),
  ) as Record<FacilityFamily, FacilityFamilyState>;

  return { roles, rackMounts, families, isAuraAuthored: (id) => !!id && AURA_IDS.has(id) };
}

describe('reference facility runtime regression', () => {
  it('passes on the verified baseline evidence', () => {
    const result = evaluateRuntimeRegression(healthyInput());
    expect(result.nvidiaObjects).toBe(BASELINE_NVIDIA_OBJECTS);
    expect(result.cabinetsMounted).toBe(BASELINE_RACK_CABINETS);
    expect(result.auraFacilityObjects).toBe(BASELINE_AURA_FACILITY_OBJECTS);
    expect(result.nvidiaDerivedRoles).toBe(7);
    expect(result.passed).toBe(true);
  });

  it('fails when a single NVIDIA object silently disappears', () => {
    const input = healthyInput();
    input.roles['nvidia-0'] = role('nvidia-0', 19, 'nvidia.asset.0');
    const result = evaluateRuntimeRegression(input);
    expect(result.nvidiaObjects).toBe(BASELINE_NVIDIA_OBJECTS - 1);
    expect(result.checks.find((c) => c.id === 'nvidia-objects')?.ok).toBe(false);
    expect(result.passed).toBe(false);
  });

  it('fails when a cabinet falls back to procedural geometry', () => {
    const input = healthyInput();
    input.rackMounts['rack-0'] = { mounted: false };
    const result = evaluateRuntimeRegression(input);
    expect(result.cabinetsMounted).toBe(BASELINE_RACK_CABINETS - 1);
    expect(result.checks.find((c) => c.id === 'rack-cabinets')?.ok).toBe(false);
  });

  it('fails when an AURA facility family stops mounting', () => {
    const input = healthyInput();
    input.families['facility-shell'] = 'fallback';
    const result = evaluateRuntimeRegression(input);
    expect(result.missingFamilies).toEqual(['facility-shell']);
    expect(result.passed).toBe(false);
  });

  it('never counts AURA facility objects toward the NVIDIA claim', () => {
    const result = evaluateRuntimeRegression(healthyInput());
    expect(result.nvidiaObjects).not.toContain(BASELINE_AURA_FACILITY_OBJECTS);
    expect(result.nvidiaObjects + result.auraFacilityObjects).toBe(
      BASELINE_NVIDIA_OBJECTS + BASELINE_AURA_FACILITY_OBJECTS,
    );
  });

  it('allows growth above the baseline', () => {
    const input = healthyInput();
    input.rackMounts['rack-extra'] = { mounted: true };
    expect(evaluateRuntimeRegression(input).passed).toBe(true);
  });
});
