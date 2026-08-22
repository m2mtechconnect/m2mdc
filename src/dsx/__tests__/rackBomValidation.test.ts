import { describe, expect, it } from 'vitest';
import type { RoleCoverage } from '@/components/twin-visualization/runtimeCoverageStore';
import {
  DSX_RACK_BOM_REQUIREMENTS,
  reconcileDsxRackBom,
} from '../rackBomValidation';

function exactCoverage(
  role: RoleCoverage['role'],
  mountedObjects: number,
  state: RoleCoverage['state'] = 'openusd-derived',
): RoleCoverage {
  return {
    role,
    state,
    assetId: `asset:${role}`,
    quality: 'operations',
    mountedObjects,
    glbInstances: mountedObjects,
    derivativeUrl: `/assets/${role}.glb`,
    proceduralObjects: 0,
    triangles: 1,
    drawCalls: 1,
  };
}

const completeOneRack: Record<string, RoleCoverage> = {
  'dsx-compute-tray': exactCoverage('dsx-compute-tray', 18),
  'dsx-nvlink-switch-tray': exactCoverage('dsx-nvlink-switch-tray', 9),
  'dsx-power-shelf': exactCoverage('dsx-power-shelf', 8),
  'dsx-tor-oob-switch': exactCoverage('dsx-tor-oob-switch', 2),
};

describe('DSX NVL72 rack BOM validation', () => {
  it('locks all four quantity-aware roles', () => {
    expect(DSX_RACK_BOM_REQUIREMENTS.map((row) => [row.role, row.quantityPerRack])).toEqual([
      ['dsx-compute-tray', 18],
      ['dsx-nvlink-switch-tray', 9],
      ['dsx-power-shelf', 8],
      ['dsx-tor-oob-switch', 2],
    ]);
  });

  it('passes only when one rack mounts 18/9/8/2 exact-role objects', () => {
    const result = reconcileDsxRackBom(completeOneRack, 1);
    expect(result.complete).toBe(true);
    expect(result.expectedObjects).toBe(37);
    expect(result.mountedObjects).toBe(37);
    expect(result.rows.every((row) => row.verdict === 'pass')).toBe(true);
  });

  it('fails a 17/18 compute-tray rack even when the other roles are exact', () => {
    const result = reconcileDsxRackBom(
      {
        ...completeOneRack,
        'dsx-compute-tray': exactCoverage('dsx-compute-tray', 17),
      },
      1,
    );
    const compute = result.rows.find((row) => row.role === 'dsx-compute-tray');
    expect(result.complete).toBe(false);
    expect(compute?.verdict).toBe('missing');
    expect(compute?.detail).toContain('17/18');
  });

  it('fails excess quantities instead of silently accepting them', () => {
    const result = reconcileDsxRackBom(
      {
        ...completeOneRack,
        'dsx-power-shelf': exactCoverage('dsx-power-shelf', 9),
      },
      1,
    );
    expect(result.rows.find((row) => row.role === 'dsx-power-shelf')?.verdict).toBe('excess');
  });

  it('scales the BOM exactly with rack count', () => {
    const result = reconcileDsxRackBom(
      {
        'dsx-compute-tray': exactCoverage('dsx-compute-tray', 36),
        'dsx-nvlink-switch-tray': exactCoverage('dsx-nvlink-switch-tray', 18),
        'dsx-power-shelf': exactCoverage('dsx-power-shelf', 16),
        'dsx-tor-oob-switch': exactCoverage('dsx-tor-oob-switch', 4),
      },
      2,
    );
    expect(result.complete).toBe(true);
    expect(result.expectedObjects).toBe(74);
  });

  it('ignores generic approximation roles completely', () => {
    const result = reconcileDsxRackBom({
      'server-1u': exactCoverage('server-1u', 18),
      'network-switch': exactCoverage('network-switch', 9),
      'rack-pdu': exactCoverage('rack-pdu', 8),
    });
    expect(result.complete).toBe(false);
    expect(result.rows.every((row) => row.verdict === 'not-mounted')).toBe(true);
  });

  it('rejects invalid rack counts', () => {
    expect(() => reconcileDsxRackBom(completeOneRack, 0)).toThrow(/positive integer/);
    expect(() => reconcileDsxRackBom(completeOneRack, 1.5)).toThrow(/positive integer/);
  });
});
