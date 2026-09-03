/**
 * Governed-learning contract coverage for the ref-transparency /
 * dev-instrumentation lesson (root cause pinned on head 0371589a).
 *
 * Verifies the lesson is registered, versioned, reviewed, cited and active;
 * that retrieval surfaces it for forwardRef-flood queries and NOT for
 * unrelated queries; and that the synthetic eval case protecting the
 * mechanism executes and passes through the shared truth-eval runner (the
 * same suite the promotion contract gates on, so the lesson cannot promote
 * while its eval case fails).
 */
import { describe, expect, it } from 'vitest';
import {
  LESSON_REGISTRY_VERSION,
  activeLessons,
  lessonById,
  verifyLessonRegistryIntegrity,
} from '../../supabase/functions/_shared/learning/lessonRegistry';
import { validateLesson } from '../../supabase/functions/_shared/learning/lessonTypes';
import { retrieveApprovedLessons } from '../../supabase/functions/_shared/learning/lessonRetrieval';
import { TRUTH_EVAL_CASES } from '../../supabase/functions/_shared/learning/truthEvalCases';
import { runTruthEvals } from '../../supabase/functions/_shared/learning/truthEvalRunner';

const LESSON_ID = 'ref-transparency-dev-instrumentation.v1';
const EVAL_CASE_ID = 'lesson-ref-transparency-active';

describe('ref-transparency lesson registration', () => {
  it('is registered, versioned and reviewed', () => {
    const lesson = lessonById(LESSON_ID);
    expect(lesson).not.toBeNull();
    expect(lesson!.version).toBe(1);
    expect(lesson!.status).toBe('active');
    expect(lesson!.origin).toBe('confirmed-miss');
    expect(lesson!.reviewedBy.trim().length).toBeGreaterThan(0);
    expect(Number.isNaN(Date.parse(lesson!.reviewedAt))).toBe(false);
  });

  it('passes the lesson governance contract and keeps registry integrity', () => {
    const lesson = lessonById(LESSON_ID)!;
    expect(validateLesson(lesson)).toEqual({ valid: true, violations: [] });
    const integrity = verifyLessonRegistryIntegrity();
    expect(integrity.ok).toBe(true);
    expect(integrity.problems).toEqual([]);
  });

  it('the registry version was bumped for the new lesson', () => {
    // Bumped again when the cross-layer lesson gained cross-suite authority parity.
    expect(LESSON_REGISTRY_VERSION).toBe('2026-09-03.1');
  });


  it('cites the exact policy module, config wiring and both tests', () => {
    const citations = lessonById(LESSON_ID)!.citations;
    expect(citations).toContain('scripts/componentTaggerPolicy.ts');
    expect(citations).toContain('vite.config.ts#shouldEnableComponentTagger');
    expect(citations).toContain('playwright.truth.config.ts#AURA_DISABLE_COMPONENT_TAGGER');
    expect(citations).toContain('tests/unit/component-tagger-policy.test.ts');
    expect(citations).toContain('tests/harness-negative/tagger-flood-reproduction.spec.ts');
  });

  it('encodes the mechanism, not a wording: environment finding + no console filtering', () => {
    const invariant = lessonById(LESSON_ID)!.invariant.toLowerCase();
    expect(invariant).toContain('forwardref');
    expect(invariant).toContain('environment finding');
    expect(invariant).toContain('instrumentation');
    expect(invariant).toContain('filtering');
  });
});

describe('ref-transparency lesson retrieval', () => {
  it('is retrievable for a forwardRef-flood query', () => {
    const result = retrieveApprovedLessons(
      'Why does the console show Function components cannot be given refs on every page?',
    );
    expect(result.lessonIds).toContain(LESSON_ID);
  });

  it('is active and therefore runtime-eligible', () => {
    expect(activeLessons().map((l) => l.id)).toContain(LESSON_ID);
  });

  it('is not retrieved for an unrelated query', () => {
    const result = retrieveApprovedLessons('What is the weather in Montreal?');
    expect(result.lessonIds).not.toContain(LESSON_ID);
  });
});

describe('ref-transparency synthetic eval case', () => {
  it('exists in the truth eval suite with the synthetic data class', () => {
    const evalCase = TRUTH_EVAL_CASES.find((c) => c.id === EVAL_CASE_ID);
    expect(evalCase).toBeDefined();
    expect(evalCase!.kind).toBe('lesson-integrity');
    expect(evalCase!.dataClass).toBe('synthetic-evaluation-data');
  });

  it('executes and passes through the shared runner the promotion contract gates on', () => {
    const report = runTruthEvals();
    const result = report.results.find((r) => r.id === EVAL_CASE_ID);
    expect(result).toBeDefined();
    expect(result!.failures).toEqual([]);
    expect(result!.passed).toBe(true);
  });

  it('fails on the mechanism: a registry missing the lesson cannot pass the case', () => {
    // Run the runner against ONLY the new case but with a tampered lesson id
    // so the case must fail closed - proving the eval detects absence, not
    // wording.
    const tampered = TRUTH_EVAL_CASES
      .filter((c) => c.id === EVAL_CASE_ID)
      .map((c) => ({ ...c, lessonId: 'ref-transparency-dev-instrumentation.v999' }) as typeof c);
    const report = runTruthEvals(tampered);
    expect(report.failed).toBe(1);
  });
});
