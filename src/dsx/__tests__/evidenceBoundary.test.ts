/**
 * Evidence boundary guarantees for the assurance domains.
 * A claim may only be evidenced when a real source backs it, and an
 * unbacked claim must name its blocker and its missing inputs.
 */
import { describe, it, expect } from 'vitest';
import {
  assertionsFor, carbonAssertions, domainVerdict, financialAssertions,
  sovereigntyAssertions, summarise, type EvidenceAssertion,
} from '../workspaces/evidenceBoundary';
import { resolveSource } from '../adapters';
import { computeKpiBundle } from '../metrics/computeKpis';
import { TICK_MS, TIMELINE_START_ISO } from '../fixtures/timelines';
import { capability } from '../workspaces/availability';

function stateAt(tick: number, timeline: 'normal' | 'cooling_degradation' = 'normal') {
  const source = resolveSource({ mode: 'SIMULATED', timeline, startedAtIso: TIMELINE_START_ISO });
  const nowMs = Date.parse(TIMELINE_START_ISO) + tick * TICK_MS + 2_000;
  const snapshot = source.snapshotAt(tick, nowMs);
  return { snapshot, bundle: computeKpiBundle(snapshot, nowMs) };
}

const DOMAINS = ['sovereignty', 'carbon', 'financial'] as const;

function allAssertions(tick = 3): EvidenceAssertion[] {
  const { bundle, snapshot } = stateAt(tick);
  return DOMAINS.flatMap((d) => assertionsFor(d, bundle, snapshot));
}

describe('assertion shape', () => {
  it('gives every assertion a stable unique id and a next step', () => {
    const a = allAssertions();
    expect(new Set(a.map((x) => x.id)).size).toBe(a.length);
    for (const x of a) {
      expect(x.claim.length).toBeGreaterThan(10);
      expect(x.next_step.length).toBeGreaterThan(10);
    }
  });

  it('never lets an evidenced claim carry a blocker, or a blocked claim carry a basis', () => {
    for (const x of allAssertions()) {
      if (x.status === 'evidenced') {
        expect(x.basis).toBeTruthy();
        expect(x.blocking_capability).toBeNull();
        expect(x.missing_inputs).toHaveLength(0);
      } else {
        expect(x.basis).toBeNull();
        expect(x.blocking_capability).not.toBeNull();
        expect(x.evidence_event_ids).toHaveLength(0);
        expect(x.missing_inputs.length).toBeGreaterThan(0);
      }
    }
  });

  it('only cites capabilities that exist in the registry and are not operational', () => {
    for (const x of allAssertions()) {
      if (!x.blocking_capability) continue;
      expect(() => capability(x.blocking_capability!.id)).not.toThrow();
      expect(x.blocking_capability.state).not.toBe('operational');
    }
  });
});

describe('sovereignty boundary', () => {
  it('makes no residency, jurisdiction, custody or attestation claim', () => {
    const { bundle, snapshot } = stateAt(3);
    const byId = Object.fromEntries(sovereigntyAssertions(bundle, snapshot).map((a) => [a.id, a]));
    for (const id of ['facility_jurisdiction', 'data_residency', 'workload_residency', 'node_attestation', 'key_custody']) {
      expect(byId[id].status).toBe('not_evidenced');
    }
  });

  it('evidences only what the local runtime can actually prove', () => {
    const { bundle, snapshot } = stateAt(3);
    const evidenced = sovereigntyAssertions(bundle, snapshot).filter((a) => a.status === 'evidenced');
    expect(evidenced.map((a) => a.id).sort()).toEqual(['identity_chain', 'telemetry_confinement']);
  });

  it('never reports the domain as assured', () => {
    const { bundle, snapshot } = stateAt(3);
    expect(domainVerdict(sovereigntyAssertions(bundle, snapshot))).toBe('unverified');
  });
});

describe('carbon boundary', () => {
  it('evidences metered power but never emissions, CUE, WUE or renewable share', () => {
    const { bundle } = stateAt(3);
    const byId = Object.fromEntries(carbonAssertions(bundle).map((a) => [a.id, a]));
    expect(byId.facility_power_draw.status).toBe('evidenced');
    expect(byId.efficiency_ratio.status).toBe('evidenced');
    for (const id of ['energy_consumed', 'operational_emissions', 'carbon_usage_effectiveness', 'water_usage_effectiveness', 'renewable_share', 'heat_reuse']) {
      expect(byId[id].status).toBe('not_evidenced');
    }
  });

  it('keeps WUE and CUE metrics unavailable', () => {
    const { bundle } = stateAt(3);
    expect(bundle.metrics.wue.value).toBeNull();
    expect(bundle.metrics.cue.value).toBeNull();
  });
});

describe('financial boundary', () => {
  it('evidences physical drivers only and never a monetary value', () => {
    const { bundle } = stateAt(3);
    const byId = Object.fromEntries(financialAssertions(bundle).map((a) => [a.id, a]));
    expect(byId.load_driver.status).toBe('evidenced');
    expect(byId.capacity_driver.status).toBe('evidenced');
    for (const id of ['energy_cost', 'demand_charge', 'operating_cost', 'sla_exposure', 'avoided_cost']) {
      expect(byId[id].status).toBe('not_evidenced');
    }
  });
});

describe('degradation to unavailable', () => {
  it('demotes a numeric claim to not evidenced when its metric loses inputs', () => {
    const emptySnapshot = {
      run_id: 'test-run',
      data_mode: 'SIMULATED' as const,
      connection_state: 'connected' as const,
      accepted: [],
      rejected: [],
      last_observed_at: null,
    };
    const bundle = computeKpiBundle(emptySnapshot as never, Date.parse(TIMELINE_START_ISO));
    const carbon = Object.fromEntries(carbonAssertions(bundle).map((a) => [a.id, a]));
    expect(carbon.facility_power_draw.status).toBe('not_evidenced');
    expect(carbon.facility_power_draw.missing_inputs).toContain('it_power_total');

    const financial = Object.fromEntries(financialAssertions(bundle).map((a) => [a.id, a]));
    expect(financial.load_driver.status).toBe('not_evidenced');
    expect(financial.capacity_driver.status).toBe('not_evidenced');
  });
});

describe('summary', () => {
  it('counts claims and deduplicates the required inputs', () => {
    const { bundle } = stateAt(3);
    const s = summarise(carbonAssertions(bundle));
    expect(s.total).toBe(s.evidenced + s.not_evidenced);
    expect(s.not_evidenced).toBeGreaterThan(0);
    expect(s.required_inputs).toEqual([...new Set(s.required_inputs)].sort());
    expect(s.blocking_capabilities).toContain('grid_carbon_intensity');
    expect(s.blocking_capabilities).toContain('water_metering');
  });
});

describe('identity_chain provenance', () => {
  it('cites at least one event id per mapped source, with no duplicates', () => {
    const { bundle, snapshot } = stateAt(3);
    const claim = sovereigntyAssertions(bundle, snapshot).find((a) => a.id === 'identity_chain');
    expect(claim?.status).toBe('evidenced');
    const ids = claim?.event_ids ?? [];
    const mappedSources = new Set(snapshot.accepted.map((a) => a.mapping.source_asset_id));
    expect(ids.length).toBe(mappedSources.size);
    expect(new Set(ids).size).toBe(ids.length);
    const known = new Set(snapshot.accepted.map((a) => a.envelope.event_id));
    for (const id of ids) expect(known.has(id)).toBe(true);
  });

  it('never reports an evidenced identity chain with zero event ids', () => {
    for (const tick of [0, 1, 2, 3, 4]) {
      const { bundle, snapshot } = stateAt(tick, 'cooling_degradation');
      const claim = sovereigntyAssertions(bundle, snapshot).find((a) => a.id === 'identity_chain');
      if (claim?.status === 'evidenced') expect(claim.event_ids.length).toBeGreaterThan(0);
    }
  });
});
