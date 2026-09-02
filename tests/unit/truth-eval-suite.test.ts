/**
 * Executable truth evaluation suite.
 *
 * These synthetic cases fail when either proven invariant regresses:
 * a viewport claim must match the complete canonical tuple for a registered
 * surface, and a client-supplied run id must never ground provenance without
 * authenticated, RLS-scoped verification.
 */
import { describe, it, expect } from 'vitest';
import {
  TRUTH_EVAL_CASES,
  TRUTH_EVAL_SUITE_ID,
  TRUTH_EVAL_DATA_CLASS,
} from '../../supabase/functions/_shared/learning/truthEvalCases';
import { runTruthEvals } from '../../supabase/functions/_shared/learning/truthEvalRunner';

describe(TRUTH_EVAL_SUITE_ID, () => {
  const report = runTruthEvals(TRUTH_EVAL_CASES);

  it('uses synthetic data only', () => {
    expect(TRUTH_EVAL_CASES.every((c) => c.dataClass === TRUTH_EVAL_DATA_CLASS)).toBe(true);
  });

  it('covers spoofed, mixed, malformed, unauthenticated and null-run scenarios', () => {
    const kinds = new Set(TRUTH_EVAL_CASES.map((c) => c.kind));
    expect(kinds.has('viewport-claim')).toBe(true);
    expect(kinds.has('run-provenance')).toBe(true);
    expect(kinds.has('null-run-wording')).toBe(true);
    expect(kinds.has('lesson-integrity')).toBe(true);
  });

  it.each(TRUTH_EVAL_CASES.map((c) => c.id))('%s holds', (id) => {
    const result = report.results.find((r) => r.id === id)!;
    expect(result.failures).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('reports a fully passing suite with a grounded-citation rate', () => {
    expect(report.failed).toBe(0);
    expect(report.passed).toBe(report.total);
    expect(report.groundedCitationRate).toBeGreaterThan(0);
  });
});
