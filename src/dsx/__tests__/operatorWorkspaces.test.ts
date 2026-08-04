/**
 * Operator workspace guarantees: capability honesty, constraint truthfulness,
 * identity stability and dependency tracing.
 */
import { describe, it, expect } from 'vitest';
import { CAPABILITIES, SCENARIO_CATALOGUE, capability } from '../workspaces/availability';
import {
  ALL_RACK_IDENTITIES, OPENUSD_UNAVAILABLE, buildHierarchy, coolingTrace, dependentRacks,
  electricalTrace, identityBySourceId,
} from '../workspaces/facilityGraph';
import { buildConstraintStack } from '../workspaces/constraints';
import { resolveSource } from '../adapters';
import { computeKpiBundle } from '../metrics/computeKpis';
import { TICK_MS, TIMELINE_START_ISO } from '../fixtures/timelines';

function stateAt(tick: number, timeline: 'normal' | 'cooling_degradation' = 'cooling_degradation') {
  const source = resolveSource({ mode: 'SIMULATED', timeline, startedAtIso: TIMELINE_START_ISO });
  const nowMs = Date.parse(TIMELINE_START_ISO) + tick * TICK_MS + 2_000;
  const snapshot = source.snapshotAt(tick, nowMs);
  return { snapshot, bundle: computeKpiBundle(snapshot, nowMs), maxTick: source.maxTick };
}

describe('capability registry', () => {
  it('never reports a capability as operational without a stated reason', () => {
    for (const c of Object.values(CAPABILITIES)) {
      expect(c.reason.length).toBeGreaterThan(10);
      if (c.state !== 'operational') expect(c.state === 'unavailable' || c.state === 'planned').toBe(true);
    }
  });

  it('marks every unimplemented scenario as planned with no timeline', () => {
    for (const s of SCENARIO_CATALOGUE) {
      if (s.state === 'operational') expect(s.timeline).not.toBeNull();
      else expect(s.timeline).toBeNull();
    }
  });

  it('throws on an unknown capability rather than inventing one', () => {
    expect(() => capability('does_not_exist')).toThrow();
  });
});

describe('asset identity', () => {
  it('uses the stable AURA id, not the display name', () => {
    const rack = identityBySourceId('RACK-01');
    expect(rack).not.toBeNull();
    expect(rack!.stable_asset_id).not.toBe(rack!.name);
  });

  it('exposes no OpenUSD prim path when the mapping is not approved', () => {
    const unapproved = ALL_RACK_IDENTITIES.filter((a) => a.mapping_approval !== 'approved');
    for (const a of unapproved) expect(a.openusd_prim_path).toBeNull();
    expect(OPENUSD_UNAVAILABLE).toContain('unavailable');
  });

  it('builds a single-rooted facility hierarchy', () => {
    const roots = buildHierarchy();
    expect(roots).toHaveLength(1);
    expect(roots[0].children.length).toBeGreaterThan(0);
  });
});

describe('dependency tracing', () => {
  it('traces a rack to its remote power panel and UPS', () => {
    const trace = electricalTrace('RACK-01');
    expect(trace.map((h) => h.identity.asset_class)).toEqual(['ups', 'rpp', 'rack']);
  });

  it('traces a rack to its cooling unit and CDU', () => {
    const trace = coolingTrace('RACK-01');
    expect(trace.map((h) => h.identity.asset_class)).toEqual(['cdu', 'cooling_unit', 'rack']);
  });

  it('resolves dependent racks for supply equipment', () => {
    expect(dependentRacks('RPP-01').length).toBeGreaterThan(0);
    expect(dependentRacks('UPS-01').length).toBeGreaterThan(0);
    expect(dependentRacks('NOT-AN-ASSET')).toEqual([]);
  });
});

describe('constraint stack', () => {
  it('reports every domain, including the ones that cannot be assessed', () => {
    const { bundle, snapshot } = stateAt(0);
    const stack = buildConstraintStack(bundle, snapshot);
    expect(stack).toHaveLength(9);
    const unassessable = stack.filter((c) => c.status === 'unavailable');
    expect(unassessable.map((c) => c.domain)).toEqual(
      expect.arrayContaining(['network', 'workload', 'sovereignty', 'carbon', 'financial']),
    );
    for (const c of unassessable) {
      expect(c.blocking_capability).not.toBeNull();
      expect(c.evidence_events).toBe(0);
    }
  });

  it('never claims a domain is normal without evidence events', () => {
    const { bundle, snapshot } = stateAt(0);
    for (const c of buildConstraintStack(bundle, snapshot)) {
      if (c.status === 'normal') expect(c.evidence_events).toBeGreaterThan(0);
    }
  });

  it('escalates thermal to a violation when headroom is exhausted', () => {
    const { maxTick } = stateAt(0);
    const late = stateAt(maxTick);
    const thermal = buildConstraintStack(late.bundle, late.snapshot).find((c) => c.domain === 'thermal')!;
    const headroom = late.bundle.metrics.thermal_headroom.value;
    if (headroom !== null && headroom <= 0) {
      expect(thermal.status).toBe('violation');
      expect(thermal.affected_assets.length).toBeGreaterThan(0);
    } else {
      expect(['attention', 'normal']).toContain(thermal.status);
    }
  });

  it('is deterministic for the same tick', () => {
    const a = stateAt(4);
    const b = stateAt(4);
    expect(JSON.stringify(buildConstraintStack(a.bundle, a.snapshot)))
      .toBe(JSON.stringify(buildConstraintStack(b.bundle, b.snapshot)));
  });
});