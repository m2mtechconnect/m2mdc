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
import type {
  DecisionOutcome,
  DecisionRecord,
  DecisionEvidenceSnapshot,
  Recommendation,
} from '../contracts/recommendation';
import { validateDecisionInput } from '../contracts/recommendation';
import { payloadHash, stableUuid } from '../fixtures/determinism';
import { FIXTURE_DEMONSTRATION_NOTICE } from './evidenceFixturePolicy';

export interface DecisionInput {
  outcome: DecisionOutcome;
  rationale: string;
  approver: string;
  comment?: string;
  escalated_to?: string;
}

/**
 * Durability of the decision log for the current session.
 *
 * Phase 3: this hook is fixture-backed. A fixture-backed recommendation is not
 * a persisted canonical run, so its decisions are never appended to the
 * durable `decision_records` log; an authoritative approval requires a
 * persisted `simulation_runs.id` and is submitted through the server
 * boundary in `@/truth/canonicalDecisions`.
 */
export type DecisionPersistenceState = 'durable' | 'in-memory';

export const DECISION_DEMONSTRATION_REASON = FIXTURE_DEMONSTRATION_NOTICE;

const PLAY_INTERVAL_MS = 900;

export function useEvidenceBeta() {
  const [mode, setMode] = useState<DataMode>(DEFAULT_DATA_MODE);
  const [timeline, setTimeline] = useState<TimelineId>('cooling_degradation');
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [persistence] = useState<DecisionPersistenceState>('in-memory');
  const timer = useRef<number | null>(null);

  // No durable read: the durable decision log belongs to canonical persisted
  // runs and must not be mixed into this demonstration timeline.

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

  /**
   * Records a human decision plus an immutable snapshot of the evidence that
   * was on screen. Returns validation errors instead of recording when the
   * decision is incomplete: no recommendation may be closed without a rationale.
   */
  const recordDecision = useCallback(
    (recommendation: Recommendation, input: DecisionInput): { ok: boolean; errors: string[] } => {
      const { valid, errors } = validateDecisionInput(input);
      if (!valid) return { ok: false, errors };

      const metrics = recommendation.evidence.metric_names.map((name) => {
        const m = bundle.metrics[name];
        return { name, value: m?.value ?? null, unit: m?.unit ?? null };
      });

      const snapshotBody = {
        captured_at: nowIso,
        observation_tick: tick,
        data_mode: recommendation.data_mode,
        timeline_id: timeline,
        severity: recommendation.severity,
        recommendation_text: recommendation.text,
        expected_effect: recommendation.expected_effect,
        proposed_action: recommendation.proposed_action,
        confidence: recommendation.confidence,
        limitations: recommendation.limitations,
        evidence: recommendation.evidence,
        metrics,
      };
      const evidence_snapshot: DecisionEvidenceSnapshot = {
        ...snapshotBody,
        snapshot_hash: payloadHash(snapshotBody),
      };

      setDecisions((prev) => [
        ...prev.filter((d) => d.recommendation_id !== recommendation.recommendation_id),
        {
          decision_id: stableUuid(
            `decision:${recommendation.recommendation_id}:${input.outcome}:${prev.length}`,
          ),
          recommendation_id: recommendation.recommendation_id,
          outcome: input.outcome,
          rationale: input.rationale.trim(),
          approver: input.approver,
          comment: input.comment?.trim() ? input.comment.trim() : undefined,
          escalated_to: input.escalated_to?.trim() ? input.escalated_to.trim() : undefined,
          decided_at: nowIso,
          execution_status: input.outcome === 'approved' ? 'manual_execution_pending' : 'not_executed',
          evidence_snapshot,
        },
      ]);

      return { ok: true, errors: [] };
    },
    [bundle, nowIso, tick, timeline],
  );

  const pendingRecommendations = useMemo(
    () =>
      scenario.recommendations.filter(
        (r) => !decisions.some((d) => d.recommendation_id === r.recommendation_id),
      ),
    [scenario.recommendations, decisions],
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
    decisionPersistence: persistence,
    recordDecision,
    pendingRecommendations,
    nowIso,
  };
}

export type EvidenceBetaRuntime = ReturnType<typeof useEvidenceBeta>;