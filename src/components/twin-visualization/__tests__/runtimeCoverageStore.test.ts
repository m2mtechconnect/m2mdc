/**
 * Coverage ownership model.
 *
 * The defect this suite locks down: two owners reporting into the same scene
 * used to overwrite each other, so a fully mounted facility read as zero.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  useRuntimeCoverageStore,
  coverageTotals,
  preparingRoles,
  previewLabel,
  type RoleCoverage,
} from '../runtimeCoverageStore';
import { coverageSessionId } from '../coverageSession';

const SESSION_A = coverageSessionId({ facilityKey: 'twin-a', geometry: 'nvidia-reference' });
const SESSION_B = coverageSessionId({ facilityKey: 'twin-b', geometry: 'nvidia-reference' });
const SESSION_AURA = coverageSessionId({ facilityKey: 'twin-a', geometry: 'aura-model' });

function role(overrides: Partial<RoleCoverage> & { role: string }): RoleCoverage {
  return {
    state: 'openusd-derived',
    assetId: 'asset-1',
    quality: null,
    mountedObjects: 1,
    glbInstances: 1,
    derivativeUrl: 'https://cdn/asset-1.glb',
    proceduralObjects: 0,
    triangles: 100,
    drawCalls: 1,
    stage: 'visible',
    visible: true,
    ...overrides,
  } as RoleCoverage;
}

const store = () => useRuntimeCoverageStore.getState();

beforeEach(() => {
  useRuntimeCoverageStore.setState({
    sessionId: 'initial',
    expectedRoles: [],
    expectedMounts: 0,
    owners: {},
    roles: {},
    rackMounts: {},
    procedural: {},
  });
});

describe('runtime coverage ownership', () => {
  it('keeps rows from two owners reporting concurrently', () => {
    store().beginSession(SESSION_A);
    store().reportRole(SESSION_A, 'facility', role({ role: 'facility-shell' }));
    store().reportRole(SESSION_A, 'equipment', role({ role: 'server-1u', mountedObjects: 48 }));
    expect(Object.keys(store().roles).sort()).toEqual(['facility-shell', 'server-1u']);
    expect(coverageTotals(store().roles).mountedObjects).toBe(49);
  });

  it('is order independent', () => {
    store().beginSession(SESSION_A);
    store().reportRole(SESSION_A, 'equipment', role({ role: 'server-1u' }));
    store().reportRole(SESSION_A, 'facility', role({ role: 'facility-shell' }));
    const first = { ...store().roles };
    useRuntimeCoverageStore.setState({ owners: {}, roles: {}, rackMounts: {} });
    store().reportRole(SESSION_A, 'facility', role({ role: 'facility-shell' }));
    store().reportRole(SESSION_A, 'equipment', role({ role: 'server-1u' }));
    expect(Object.keys(store().roles).sort()).toEqual(Object.keys(first).sort());
  });

  it('treats duplicate reports as idempotent', () => {
    store().beginSession(SESSION_A);
    store().reportRole(SESSION_A, 'equipment', role({ role: 'server-1u' }));
    const before = store().roles;
    store().reportRole(SESSION_A, 'equipment', role({ role: 'server-1u' }));
    expect(store().roles).toBe(before);
  });

  it('removes only the unregistered owner rows', () => {
    store().beginSession(SESSION_A);
    store().reportRole(SESSION_A, 'facility', role({ role: 'facility-shell' }));
    store().reportRole(SESSION_A, 'equipment', role({ role: 'server-1u' }));
    store().unregisterOwner(SESSION_A, 'equipment');
    expect(Object.keys(store().roles)).toEqual(['facility-shell']);
  });

  it('ignores reports from a stale session', () => {
    store().beginSession(SESSION_A);
    store().reportRole(SESSION_A, 'equipment', role({ role: 'server-1u' }));
    store().beginSession(SESSION_B);
    store().reportRole(SESSION_A, 'equipment', role({ role: 'server-2u' }));
    expect(store().roles).toEqual({});
  });

  it('clears coverage when geometry changes', () => {
    store().beginSession(SESSION_A);
    store().reportRole(SESSION_A, 'equipment', role({ role: 'server-1u' }));
    store().beginSession(SESSION_AURA);
    expect(store().roles).toEqual({});
    expect(store().sessionId).toBe(SESSION_AURA);
  });

  it('clears coverage when the facility changes', () => {
    store().beginSession(SESSION_A);
    store().reportMount(SESSION_A, 'racks', 'rack-1', { mounted: true, assetId: 'a', url: 'u' });
    store().beginSession(SESSION_B);
    expect(store().rackMounts).toEqual({});
  });

  it('survives a StrictMode mount/unmount/mount cycle', () => {
    store().beginSession(SESSION_A);
    store().registerOwner(SESSION_A, 'facility');
    store().unregisterOwner(SESSION_A, 'facility');
    store().registerOwner(SESSION_A, 'facility');
    store().reportRole(SESSION_A, 'facility', role({ role: 'facility-shell' }));
    store().beginSession(SESSION_A); // re-entering the same session keeps rows
    expect(store().roles['facility-shell'].mountedObjects).toBe(1);
  });

  it('records partial failure and a later retry', () => {
    store().beginSession(SESSION_A);
    store().reportRole(
      SESSION_A,
      'equipment',
      role({ role: 'cable-tray', state: 'blocked', mountedObjects: 0, stage: 'failed', visible: false }),
    );
    expect(store().roles['cable-tray'].state).toBe('blocked');
    store().reportRole(SESSION_A, 'equipment', role({ role: 'cable-tray', mountedObjects: 12 }));
    expect(store().roles['cable-tray'].state).toBe('openusd-derived');
    expect(store().roles['cable-tray'].mountedObjects).toBe(12);
  });

  it('aggregates role and rack totals across owners', () => {
    store().beginSession(SESSION_A, { expectedRoles: ['server-1u', 'server-2u'], expectedMounts: 2 });
    store().reportRole(SESSION_A, 'equipment', role({ role: 'server-1u', mountedObjects: 6 }));
    store().reportMount(SESSION_A, 'racks', 'rack-1', { mounted: true, assetId: 'a', url: 'u' });
    store().reportMount(SESSION_A, 'racks', 'rack-2', { mounted: false, assetId: null, url: null });
    expect(coverageTotals(store().roles).mountedObjects).toBe(6);
    expect(Object.values(store().rackMounts).filter((m) => m.mounted)).toHaveLength(1);
    expect(preparingRoles(store())).toEqual(['server-2u']);
  });

  it('ends a session by clearing its coverage', () => {
    store().beginSession(SESSION_A);
    store().reportRole(SESSION_A, 'equipment', role({ role: 'server-1u' }));
    store().endSession(SESSION_A);
    expect(store().roles).toEqual({});
  });
});

describe('truthful preview labels', () => {
  it('never claims NVIDIA runtime from GLB mounting', () => {
    expect(previewLabel({ derivedObjects: 10, proceduralObjects: 0, lineageVerified: true })).toBe(
      'Browser GLB preview - NVIDIA-derived assets',
    );
    expect(previewLabel({ derivedObjects: 10, proceduralObjects: 0, lineageVerified: false })).toBe(
      'Browser GLB preview',
    );
    expect(previewLabel({ derivedObjects: 4, proceduralObjects: 9, lineageVerified: true })).toBe(
      'Mixed browser preview',
    );
    expect(previewLabel({ derivedObjects: 0, proceduralObjects: 9, lineageVerified: true })).toBe(
      'Procedural 3D preview',
    );
    expect(previewLabel({ derivedObjects: 0, proceduralObjects: 0, lineageVerified: true })).toBe(
      'Unavailable',
    );
  });
});
