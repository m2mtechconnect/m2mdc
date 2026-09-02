import { describe, expect, it } from 'vitest';
import {
  LESSON_REGISTRY_VERSION,
  lessonById,
  verifyLessonRegistryIntegrity,
} from '../../supabase/functions/_shared/learning/lessonRegistry';
import { retrieveApprovedLessons } from '../../supabase/functions/_shared/learning/lessonRetrieval';
import { TRUTH_EVAL_CASES } from '../../supabase/functions/_shared/learning/truthEvalCases';
import { runTruthEvals } from '../../supabase/functions/_shared/learning/truthEvalRunner';

describe('cross-layer product-truth lesson', () => {
  const lessonId = 'cross-layer-product-truth-parity.v1';
  const evalId = 'lesson-cross-layer-product-truth-active';

  it('is reviewed, active and registry-valid', () => {
    expect(LESSON_REGISTRY_VERSION).toBe('2026-09-02.2');
    expect(lessonById(lessonId)?.status).toBe('active');
    expect(lessonById(lessonId)?.origin).toBe('confirmed-miss');
    expect(verifyLessonRegistryIntegrity().ok).toBe(true);
  });

  it('is retrieved for the observed frontend/backend parity miss', () => {
    const result = retrieveApprovedLessons(
      'Why did the super agent miss the UI API mismatch and demo dataset on an unbound facility?',
    );
    expect(result.lessonIds).toContain(lessonId);
  });

  it('is exercised by the shared synthetic truth-evaluation runner', () => {
    expect(TRUTH_EVAL_CASES.find((testCase) => testCase.id === evalId)?.dataClass)
      .toBe('synthetic-evaluation-data');
    expect(runTruthEvals().results.find((result) => result.id === evalId)?.passed).toBe(true);
  });
});
