import { describe, expect, it } from 'vitest';
import { resolveSource } from '@/dsx/adapters';
import { computeKpiBundle } from '@/dsx/metrics/computeKpis';
import { buildConstraintStack } from '@/dsx/workspaces/constraints';
import { TIMELINE_START_ISO } from '@/dsx/fixtures/timelines';
import {
  metricDomainCoverage,
  metricEvidenceCounts,
  validationRationale,
} from '@/dsx/metrics/metricDrilldown';

function fixture() {
  const source = resolveSource({ mode: 'SIMULATED', timeline: 'cooling_degradation', startedAtIso: TIMELINE_START_ISO });
  const nowMs = Date.parse(TIMELINE_START_ISO) + 2000;
  const snapshot = source.snapshotAt(0, nowMs);
  const bundle = computeKpiBundle(snapshot, nowMs);
  return { snapshot, bundle, constraints: buildConstraintStack(bundle, snapshot) };
}

describe('metric drilldown', () => {
  it('counts only events the metric actually cites', () => {
    const { snapshot, bundle } = fixture();
    const c = metricEvidenceCounts(bundle.metrics.pue, snapshot);
    expect(c.source_events).toBe(bundle.metrics.pue.source_event_ids.length);
    expect(c.accepted_events + c.unmatched_events).toBe(c.source_events);
    expect(c.quarantined_events).toBe(snapshot.rejected.length);
  });

  it('reports declared and missing input counts truthfully', () => {
    const { snapshot, bundle } = fixture();
    const headroom = metricEvidenceCounts(bundle.metrics.thermal_headroom, snapshot);
    expect(headroom.declared_inputs).toBeGreaterThan(0);
    const wue = bundle.metrics.wue;
    if (wue) expect(metricEvidenceCounts(wue, snapshot).missing_inputs).toBeGreaterThan(0);
  });

  it('maps contributing domains and reports unassessable domains', () => {
    const { bundle, constraints } = fixture();
    const cov = metricDomainCoverage(bundle.metrics.pue, constraints);
    expect(cov.contributing.map((c) => c.domain)).toEqual(
      expect.arrayContaining(['power', 'cooling']),
    );
    expect(cov.total_domains).toBe(constraints.length);
    expect(cov.assessed_domains).toBe(constraints.length - cov.unassessable.length);
  });

  it('explains an unverified verdict without claiming verification', () => {
    const { bundle } = fixture();
    const r = validationRationale(bundle.metrics.pue);
    expect(r.verdict).toBe('Range-checked · unverified');
    expect(r.reasons.length).toBeGreaterThan(0);
    expect(r.to_verify.join(' ')).toContain('calibration');
  });

  it('explains an unavailable metric by naming its missing inputs', () => {
    const { bundle } = fixture();
    const wue = bundle.metrics.wue;
    if (!wue) return;
    const r = validationRationale(wue);
    expect(r.verdict).toBe('Unavailable');
    expect(r.reasons[0]).toContain('missing');
  });
});
