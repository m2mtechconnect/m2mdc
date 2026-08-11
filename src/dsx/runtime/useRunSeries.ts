/**
 * Observation-step series for the current run.
 *
 * Values are recomputed from the same ingestion pipeline used by the tiles,
 * step by step, so a trend can never show a number the KPI layer would not
 * produce. A step with no accepted observation yields `null`, never zero.
 */
import { useMemo } from 'react';
import { computeKpiBundle } from '../metrics/computeKpis';
import { TICK_MS, TIMELINE_START_ISO } from '../fixtures/timelines';
import type { EvidenceBetaRuntime } from './useEvidenceBeta';

export interface RunSeriesPoint {
  tick: number;
  observed_at: string | null;
  max_inlet_c: number | null;
  it_load_kw: number | null;
  cooling_load_kw: number | null;
  pue: number | null;
}

export function useRunSeries(rt: EvidenceBetaRuntime): RunSeriesPoint[] {
  const { source, tick } = rt;
  return useMemo(() => {
    const points: RunSeriesPoint[] = [];
    for (let t = 0; t <= tick; t++) {
      const nowMs = Date.parse(TIMELINE_START_ISO) + t * TICK_MS + 2_000;
      const snapshot = source.snapshotAt(t, nowMs);
      const bundle = computeKpiBundle(snapshot, nowMs);
      points.push({
        tick: t,
        observed_at: snapshot.last_observed_at,
        max_inlet_c: bundle.metrics.max_rack_inlet?.value ?? null,
        it_load_kw: bundle.metrics.it_load?.value ?? null,
        cooling_load_kw: bundle.metrics.cooling_load?.value ?? null,
        pue: bundle.metrics.pue?.value ?? null,
      });
    }
    return points;
  }, [source, tick]);
}