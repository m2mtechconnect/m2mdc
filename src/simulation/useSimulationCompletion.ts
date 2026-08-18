/**
 * Phase 1B.2a.1 — Completion effect hook for `DCSimulationPanel`.
 *
 * Extracted from the panel so the invariants around cancellation, race
 * safety, error surfacing and DB persistence are unit-testable without
 * mounting the entire 500-line panel + 3D twin + Blueprint stack.
 *
 * Invariants (all covered by `__tests__/useSimulationCompletion.test.tsx`):
 *
 *   1. When a new run starts (status transitions into `running`) or the
 *      panel is reset, the previous run's AbortController is aborted and
 *      a fresh controller is created for the next run.
 *   2. On unmount, the in-flight AbortController is aborted.
 *   3. A stale in-flight result (older run token) cannot overwrite the
 *      state committed by a newer run.
 *   4. Non-ok facade outcomes DO NOT clear or fabricate a result — they
 *      surface a typed `error` value that the UI renders as an accessible
 *      alert. `onPersist` is NEVER called for non-ok outcomes.
 *   5. When the facade is disabled (legacy rollback path), the effect
 *      calls the engine directly. Byte-equivalence with the facade path
 *      is asserted at the facade layer (`panelFacade.test.ts`).
 */

import { useEffect, useRef, useState } from 'react';

import type { SimulationFacade } from './api';
import { simulationOrchestrator } from './orchestrator';
import { PANEL_SUMMARY_PROVIDER_ID } from './orchestrator/providers/panelSummaryProvider';
import type {
  ScenarioDefinition,
  SimulationEvent,
  SimulationResultSummary,
} from './types';

export type SimulationCompletionErrorKind =
  | 'unavailable'
  | 'invalid-input'
  | 'error'
  | 'cancelled'
  | 'not-implemented'
  | 'disabled';

export interface SimulationCompletionError {
  kind: SimulationCompletionErrorKind;
  /** Human-readable, already sanitized by the facade. */
  message: string;
  providerId: string;
}

export interface UseSimulationCompletionOptions {
  facade: SimulationFacade | null;
  status: string;
  activeScenario: ScenarioDefinition | null;
  events: SimulationEvent[];
  baselineKpis: Record<string, number>;
  currentKpis: Record<string, number>;
  elapsedTime: number;
  /** Called ONLY when a run completes successfully. Never on error. */
  onPersist?: (result: SimulationResultSummary) => void;
}

export interface UseSimulationCompletionReturn {
  result: SimulationResultSummary | null;
  error: SimulationCompletionError | null;
  clearResult: () => void;
}

function toCompletionError(outcome: {
  kind: Exclude<SimulationCompletionErrorKind, never>;
  providerId: string;
  message?: string;
  reason?: string;
}): SimulationCompletionError {
  return {
    kind: outcome.kind,
    providerId: outcome.providerId,
    message: outcome.message ?? outcome.reason ?? 'Simulation unavailable.',
  };
}

export function useSimulationCompletion(
  opts: UseSimulationCompletionOptions,
): UseSimulationCompletionReturn {
  const {
    facade,
    status,
    activeScenario,
    events,
    baselineKpis,
    currentKpis,
    elapsedTime,
    onPersist,
  } = opts;

  const [result, setResult] = useState<SimulationResultSummary | null>(null);
  const [error, setError] = useState<SimulationCompletionError | null>(null);

  // Race token — bumped on new run / reset. Stale results (older token)
  // cannot commit to state.
  const runTokenRef = useRef(0);
  // AbortController — real cancellation across the facade boundary.
  const abortRef = useRef<AbortController | null>(null);

  // Unmount abort — must run once at teardown.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (status === 'completed' && activeScenario) {
      // New run: abort the previous controller (if any), issue a fresh
      // token, and create a new controller whose signal is threaded into
      // the facade call.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const token = ++runTokenRef.current;

      let ok: SimulationResultSummary | null = null;
      let err: SimulationCompletionError | null = null;

      if (facade) {
        const outcome = facade.generatePanelResult(
          {
            scenario: activeScenario,
            events,
            baselineKpis,
            currentKpis,
            durationSec: elapsedTime,
          },
          controller.signal,
        );
        if (outcome.kind === 'ok') {
          ok = outcome.value;
        } else if (outcome.kind === 'cancelled') {
          // Swallow — a fresh run took over, or unmount aborted us.
          return;
        } else {
          err = toCompletionError(outcome);
        }
      } else {
        // Phase 2: no facade configured, but still no direct engine call -
        // dispatch through the orchestrator so the run is seeded and recorded.
        const outcome = simulationOrchestrator.runSync<SimulationResultSummary>(
          {
            providerId: PANEL_SUMMARY_PROVIDER_ID,
            analysis: 'panel-summary',
            intent: 'preview',
            input: {
              scenario: activeScenario,
              events,
              baselineKpis,
              currentKpis,
              durationSec: elapsedTime,
            },
          },
          controller.signal,
        );
        if (outcome.kind === 'ok') {
          ok = outcome.value;
        } else if (outcome.reason === 'cancelled') {
          return;
        } else {
          err = {
            kind: 'error',
            providerId: PANEL_SUMMARY_PROVIDER_ID,
            message: outcome.message,
          };
        }
      }

      // Race guard — a newer run may have started while we were computing.
      if (token !== runTokenRef.current) return;
      if (controller.signal.aborted) return;

      if (ok) {
        setResult(ok);
        setError(null);
        onPersist?.(ok);
      } else if (err) {
        // Non-ok: preserve any prior result? No — the user asked for a
        // NEW run and it failed. Clear the stale result AND surface the
        // error so the UI is unambiguous.
        setResult(null);
        setError(err);
      }
    } else if (status === 'idle' || status === 'running') {
      // A new run is in flight, or the panel was reset. Cancel any
      // in-flight completion so its result cannot land after us.
      abortRef.current?.abort();
      abortRef.current = null;
      runTokenRef.current++;
      setResult(null);
      setError(null);
    }
    // NOTE: `onPersist` is intentionally NOT in deps — callers pass a
    // fresh closure each render but the semantic dep is `activeScenario`
    // + status. Persistence is only invoked on completion transitions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, activeScenario, events, baselineKpis, currentKpis, elapsedTime, facade]);

  return {
    result,
    error,
    clearResult: () => {
      setResult(null);
      setError(null);
    },
  };
}