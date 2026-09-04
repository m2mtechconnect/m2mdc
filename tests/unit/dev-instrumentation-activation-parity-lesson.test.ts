/**
 * Governed-learning contract coverage for the dev-instrumentation
 * activation-parity lesson.
 *
 * This is governed retrieval/evaluation learning only: the lesson is a
 * reviewed, code-owned record used for retrieval and offline evaluation. It
 * never authorises autonomous model-weight training or self-modification of
 * code, prompts, policies or production configuration.
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

const LESSON_ID = 'dev-instrumentation-activation-parity.v1';
const EVAL_CASE_ID = 'lesson-activation-parity-active';

describe('activation-parity lesson registration', () => {
  it('is registered, versioned, reviewed and active', () => {
    const lesson = lessonById(LESSON_ID);
    expect(lesson).not.toBeNull();
    expect(lesson!.version).toBe(1);
    expect(lesson!.status).toBe('active');
    expect(lesson!.origin).toBe('confirmed-miss');
    expect(lesson!.dataClass).toBe('reviewed-lesson');
    expect(lesson!.reviewedBy.trim().length).toBeGreaterThan(0);
    expect(Number.isNaN(Date.parse(lesson!.reviewedAt))).toBe(false);
  });

  it('passes the lesson governance contract and keeps registry integrity', () => {
    expect(validateLesson(lessonById(LESSON_ID)!)).toEqual({ valid: true, violations: [] });
    const integrity = verifyLessonRegistryIntegrity();
    expect(integrity.ok).toBe(true);
    expect(integrity.problems).toEqual([]);
  });

  it('bumps the registry version for the new lesson', () => {
    expect(LESSON_REGISTRY_VERSION).toBe('2026-09-04.2');
  });

  it('cites the policy helper, config wiring, negative gate and tests', () => {
    const citations = lessonById(LESSON_ID)!.citations;
    expect(citations).toContain('scripts/componentTaggerPolicy.ts#componentTaggerOptions');
    expect(citations).toContain('vite.config.ts#componentTaggerOptions');
    expect(citations).toContain('playwright.tagger-repro.config.ts#LOVABLE_DEV_SERVER');
    expect(citations).toContain('tests/unit/component-tagger-policy.test.ts');
    expect(citations).toContain('tests/unit/dev-instrumentation-activation-parity-lesson.test.ts');
  });

  it('encodes the mechanism: explicit vendor preconditions, evidence-only reclassification', () => {
    const invariant = lessonById(LESSON_ID)!.invariant.toLowerCase();
    expect(invariant).toContain('lovable_dev_server');
    expect(invariant).toContain('explicitly');
    expect(invariant).toContain('evidence');
    expect(invariant).toContain('filtering');
    expect(invariant).toContain('retries');
    expect(invariant).toContain('skips');
    // The governed-learning boundary must stay stated in the lesson itself.
    expect(invariant).toContain('model-weight training');
  });
});

describe('activation-parity lesson retrieval', () => {
  it('is retrievable for an activation-parity query', () => {
    const result = retrieveApprovedLessons(
      'Why does the component tagger no-op unless LOVABLE_DEV_SERVER is set? tagger options jsxSource',
    );
    expect(result.lessonIds).toContain(LESSON_ID);
  });

  it('is active and therefore runtime-eligible', () => {
    expect(activeLessons().map((l) => l.id)).toContain(LESSON_ID);
  });

  it('is not retrieved for an unrelated query', () => {
    expect(retrieveApprovedLessons('What is the weather in Montreal?').lessonIds)
      .not.toContain(LESSON_ID);
  });
});

describe('activation-parity synthetic eval case', () => {
  it('exists in the truth eval suite with the synthetic data class', () => {
    const evalCase = TRUTH_EVAL_CASES.find((c) => c.id === EVAL_CASE_ID);
    expect(evalCase).toBeDefined();
    expect(evalCase!.kind).toBe('lesson-integrity');
    expect(evalCase!.dataClass).toBe('synthetic-evaluation-data');
  });

  it('executes and passes through the shared runner the promotion contract gates on', () => {
    const result = runTruthEvals().results.find((r) => r.id === EVAL_CASE_ID);
    expect(result).toBeDefined();
    expect(result!.failures).toEqual([]);
    expect(result!.passed).toBe(true);
  });

  it('fails closed on the mechanism: a missing lesson cannot pass the case', () => {
    const tampered = TRUTH_EVAL_CASES
      .filter((c) => c.id === EVAL_CASE_ID)
      .map((c) => ({ ...c, lessonId: 'dev-instrumentation-activation-parity.v999' }) as typeof c);
    expect(runTruthEvals(tampered).failed).toBe(1);
  });
});
