/**
 * URL ownership of the simulation workflow step (finding PW-P2-01).
 *
 * The canonical location of the active step is `?step=` on `/simulation`.
 * The store still holds the step, but the URL is authoritative: a deep link
 * opens the right step, a hard refresh preserves it, and browser back and
 * forward move between steps. There is exactly one writer in each direction,
 * so the URL and the store can never disagree.
 */
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { WORKFLOW_STEPS, useWorkspaceStore, type WorkspaceTool } from './workspaceStore';

export const STEP_PARAM = 'step';

/** Steps that cannot be entered before a run record exists. */
export const GATED_STEPS: ReadonlySet<WorkspaceTool> = new Set<WorkspaceTool>(['compare', 'decide']);

const VALID_STEPS = new Set<WorkspaceTool>(WORKFLOW_STEPS.map((s) => s.tool));

export function isWorkflowStep(value: unknown): value is WorkspaceTool {
  return typeof value === 'string' && VALID_STEPS.has(value as WorkspaceTool);
}

export function stepLabel(step: WorkspaceTool): string {
  return WORKFLOW_STEPS.find((s) => s.tool === step)?.label ?? step;
}

/**
 * Resolve a requested step against the current run state. Pure, so the
 * fallback rules are unit-testable without a router.
 */
export function resolveWorkflowStep(
  requested: string | null,
  hasRun: boolean,
  fallback: WorkspaceTool,
): { step: WorkspaceTool; notice: string | null; rewrite: boolean } {
  if (requested === null) return { step: fallback, notice: null, rewrite: true };
  if (!isWorkflowStep(requested)) {
    return {
      step: fallback,
      notice: `"${requested}" is not a workflow step. Showing ${stepLabel(fallback)}.`,
      rewrite: true,
    };
  }
  if (GATED_STEPS.has(requested) && !hasRun) {
    return {
      step: 'simulate',
      notice: `${stepLabel(requested)} needs a completed run. Returned to Simulate.`,
      rewrite: true,
    };
  }
  return { step: requested, notice: null, rewrite: false };
}

export interface WorkflowStepState {
  step: WorkspaceTool;
  /** Explanation shown to the user when a requested step could not be opened. */
  notice: string | null;
  dismissNotice: () => void;
}

export function useWorkflowStep(enabled: boolean): WorkflowStepState {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTool = useWorkspaceStore((s) => s.activeTool);
  const setTool = useWorkspaceStore((s) => s.setTool);
  const hasRun = useWorkspaceStore((s) => s.runs.length > 0);
  const [notice, setNotice] = useState<string | null>(null);
  const raw = searchParams.get(STEP_PARAM);

  const writeStep = useCallback(
    (step: WorkspaceTool, replace: boolean) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(STEP_PARAM, step);
          return next;
        },
        { replace },
      );
    },
    [setSearchParams],
  );

  // URL -> store. Invalid or unavailable steps fail safe onto a valid step
  // and say why.
  useEffect(() => {
    if (!enabled) return;
    const resolved = resolveWorkflowStep(raw, hasRun, activeTool);
    setNotice(resolved.notice);
    if (resolved.step !== activeTool) setTool(resolved.step);
    if (resolved.rewrite && raw !== resolved.step) writeStep(resolved.step, true);
    // `activeTool` is deliberately excluded: it is the *output* of this
    // effect, and the store->URL effect below owns the opposite direction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, raw, hasRun]);

  // Store -> URL. In-app step changes push a history entry so browser back
  // and forward walk the workflow.
  useEffect(() => {
    if (!enabled) return;
    if (raw === activeTool) return;
    if (raw !== null && isWorkflowStep(raw)) writeStep(activeTool, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, activeTool]);

  return { step: activeTool, notice, dismissNotice: () => setNotice(null) };
}