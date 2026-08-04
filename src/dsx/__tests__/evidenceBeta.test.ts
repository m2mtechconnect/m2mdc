import { describe, it, expect } from 'vitest';
import { createSimulatedSource } from '../adapters/simulatedAdapter';
import { createReplaySource } from '../adapters/replayAdapter';
import { createLiveDsxSource } from '../adapters/liveDisabledAdapter';
import { resolveSource } from '../adapters';
import { computeKpiBundle } from '../metrics/computeKpis';
import { evaluateScenario } from '../scenario/degradationEngine';
import { PHYSICAL_CONTROL_ENABLED } from '../contracts/recommendation';
import { LIVE_MODE_ENABLED, resolveMode } from '../modes';
import { TIMELINE_START_ISO, TICK_MS } from '../fixtures/timelines';

const START = '2026-03-02T08:00:00.000Z';
const nowAt = (tick: number) => Date.parse(TIMELINE_START_ISO) + tick * TICK_MS + 2_000;

describe('Evidence Beta determinism', () => {
  it('produces byte-identical snapshots for the same seed and tick', () => {
    const a = createSimulatedSource('cooling_degradation', START).snapshotAt(20, nowAt(20));
    const b = createSimulatedSource('cooling_degradation', START).snapshotAt(20, nowAt(20));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('computes identical KPI bundles across runs', () => {
    const s = createSimulatedSource('cooling_degradation', START);
    expect(JSON.stringify(computeKpiBundle(s.snapshotAt(18, nowAt(18)), nowAt(18)))).toBe(
      JSON.stringify(computeKpiBundle(s.snapshotAt(18, nowAt(18)), nowAt(18))),
    );
  });
});

describe('ingestion boundary', () => {
  const snap = createSimulatedSource('cooling_degradation', START).snapshotAt(29, nowAt(29));

  it('quarantines every adversarial fixture with a distinct reason', () => {
    const reasons = new Set(snap.rejected.map((r) => r.reason));
    for (const expected of ['duplicate', 'stale', 'unit_invalid', 'unknown_mapping', 'missing_value']) {
      expect(reasons).toContain(expected);
    }
  });

  it('never accepts an event without an approved mapping', () => {
    expect(snap.accepted.every((a) => a.mapping.approval_status === 'approved')).toBe(true);
  });

  it('records a payload hash for every quarantined record', () => {
    expect(snap.rejected.every((r) => r.payload_hash.startsWith('fnv1a32:'))).toBe(true);
  });
});

describe('metric truthfulness', () => {
  const snap = createSimulatedSource('cooling_degradation', START).snapshotAt(25, nowAt(25));
  const bundle = computeKpiBundle(snap, nowAt(25));

  it('marks KPIs without instrumentation as unavailable and names missing inputs', () => {
    expect(bundle.metrics.wue.value).toBeNull();
    expect(bundle.metrics.wue.data_mode).toBe('UNAVAILABLE');
    expect(bundle.metrics.wue.missing_inputs).toContain('water_consumption_l');
    expect(bundle.metrics.cue.value).toBeNull();
  });

  it('never labels a simulated KPI as live', () => {
    for (const m of Object.values(bundle.metrics)) {
      expect(m.data_mode).not.toBe('LIVE');
    }
  });

  it('carries formula, version and evidence for computed values', () => {
    const pue = bundle.metrics.pue;
    expect(pue.value).not.toBeNull();
    expect(pue.formula).toContain('it_power_total');
    expect(pue.formula_version).toBeTruthy();
    expect(pue.source_event_ids.length).toBeGreaterThan(0);
  });

  it('leaves a dropped sensor reading unavailable rather than substituting a value', () => {
    const snap12 = createSimulatedSource('cooling_degradation', START).snapshotAt(12, nowAt(12));
    const b12 = computeKpiBundle(snap12, nowAt(12));
    expect(b12.racks.some((r) => r.inlet_c !== null)).toBe(true);
    expect(snap12.rejected.some((r) => r.reason === 'missing_value')).toBe(true);
  });
});

describe('mode safety', () => {
  it('keeps live mode disabled and fails closed to UNAVAILABLE', () => {
    expect(LIVE_MODE_ENABLED).toBe(false);
    expect(resolveMode('LIVE', { liveVerified: true })).toBe('UNAVAILABLE');
    expect(createLiveDsxSource().snapshotAt(0, Date.now()).data_mode).toBe('UNAVAILABLE');
    expect(resolveSource({ mode: 'LIVE' }).mode).toBe('UNAVAILABLE');
  });

  it('never falls back from replay to simulated data', () => {
    const s = createReplaySource(null, null);
    const snap = s.snapshotAt(0, Date.now());
    expect(snap.data_mode).toBe('UNAVAILABLE');
    expect(snap.accepted).toHaveLength(0);
  });
});

describe('recommendations and control safety', () => {
  it('exposes no physical control dispatch', () => {
    expect(PHYSICAL_CONTROL_ENABLED).toBe(false);
  });

  it('raises an evidence-linked recommendation that requires a human decision', () => {
    const snap = createSimulatedSource('cooling_degradation', START).snapshotAt(28, nowAt(28));
    const bundle = computeKpiBundle(snap, nowAt(28));
    const scenario = evaluateScenario(bundle, snap, '2026-03-02T08:28:02.000Z');
    expect(scenario.phase).not.toBe('nominal');
    const rec = scenario.recommendations[0];
    expect(rec.requires_human_decision).toBe(true);
    expect(rec.data_mode).toBe('SIMULATED');
    expect(rec.evidence.metric_names.length).toBeGreaterThan(0);
    expect(rec.limitations.join(' ')).toContain('NOT FOR PHYSICAL CONTROL');
  });

  it('raises no recommendation while the facility is nominal', () => {
    const snap = createSimulatedSource('normal', START).snapshotAt(10, nowAt(10));
    const bundle = computeKpiBundle(snap, nowAt(10));
    expect(evaluateScenario(bundle, snap, '2026-03-02T08:10:02.000Z').recommendations).toHaveLength(0);
  });
});