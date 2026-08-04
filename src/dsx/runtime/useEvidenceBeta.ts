/**
 * Evidence Beta runtime state.
 *
 * The UI reads ONLY from this hook, which reads only from the adapter
 * interface. No component branches on "is this mock data".
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { resolveSource } from '../adapters';
import type { OperationalSource } from '../adapters/types';
import { computeKpiBundle } from '../metrics/computeKpis';
import { evaluateScenario } from '../scenario/degradationEngine';
import type { TimelineId } from '../fixtures/timelines';
import { TICK_MS, TIMELINE_START_ISO } from '../fixtures/timelines';
import type { DataMode } from '../modes';
import { DEFAULT_DATA_MODE } from '../modes';
import type { HumanDecision, DecisionOutcome } from '../contracts/recommendation';
import { stableUuid } from '../fixtures/determinism';

const PLAY_INTERVAL_MS = 900;

export function useEvidenceBeta() {
  const [mode, setMode] = useState<DataMode>(DEFAULT_DATA_MODE);
  const [timeline, setTimeline] = useState<TimelineId>('cooling_degradation');
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [decisions, setDecisions] = useState<HumanDecision[]>([]);
  const timer = useRef<number | null>(null);

  const source: OperationalSource = useMemo(
    () => resolveSource({ mode, timeline, startedAtIso: TIMELINE_START_ISO }),
    [mode, timeline],
  );

  // Deterministic clock: "now" is the simulated observation time, so
  // freshness is reproducible and never depends on wall-clock drift.
  const nowMs = Date.parse(TIMELINE_START_ISO) + tick * TICK_MS + 2_000;
  const nowIso = new Date(nowMs).toISOString();

  const snapshot = useMemo(() => source.snapshotAt(tick, nowMs), [source, tick, nowMs]);
  const bundle = useMemo(() => computeKpiBundle(snapshot, nowMs), [snapshot, nowMs]);
  const scenario = useMemo(() => evaluateScenario(bundle, snapshot, nowIso), [bundle, snapshot, nowIso]);

  useEffect(() => {
    if (!playing) return;
    timer.current = window.setInterval(() => {
      setTick((t) => (t >= source.maxTick ? (setPlaying(false), t) : t + 1));
    }, PLAY_INTERVAL_MS);
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
    };
  }, [playing, source.maxTick]);

  const reset = useCallback(() => {
    setPlaying(false);
    setTick(0);
    setDecisions([]);
  }, []);

  const recordDecision = useCallback(
    (recommendationId: string, outcome: DecisionOutcome, rationale: string, approver: string) => {
      setDecisions((prev) => [
        ...prev.filter((d) => d.recommendation_id !== recommendationId),
        {
          decision_id: stableUuid(`decision:${recommendationId}:${outcome}:${prev.length}`),
          recommendation_id: recommendationId,
          outcome,
          rationale,
          approver,
          decided_at: new Date().toISOString(),
          execution_status: outcome === 'approved' ? 'manual_execution_pending' : 'not_executed',
        },
      ]);
    },
    [],
  );

  return {
    mode,
    setMode,
    timeline,
    setTimeline: (t: TimelineId) => {
      setTimeline(t);
      setTick(0);
      setPlaying(false);
    },
    tick,
    setTick,
    maxTick: source.maxTick,
    playing,
    setPlaying,
    reset,
    source,
    snapshot,
    bundle,
    scenario,
    decisions,
    recordDecision,
    nowIso,
  };
}

export type EvidenceBetaRuntime = ReturnType<typeof useEvidenceBeta>;