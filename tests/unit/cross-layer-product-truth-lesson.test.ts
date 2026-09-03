import { describe, expect, it } from 'vitest';
import {
  LESSON_REGISTRY_VERSION,
  lessonById,
  verifyLessonRegistryIntegrity,
} from '../../supabase/functions/_shared/learning/lessonRegistry';
import { retrieveApprovedLessons } from '../../supabase/functions/_shared/learning/lessonRetrieval';
import { TRUTH_EVAL_CASES } from '../../supabase/functions/_shared/learning/truthEvalCases';
import { runTruthEvals } from '../../supabase/functions/_shared/learning/truthEvalRunner';
import { isNonProductionInternalPathname } from '@/config/routeRegistry';
import { resolvePersistedBuildKind } from '@/lib/builder/buildKind';
import { withEvidenceFacilityContext } from '@/dsx/runtime/evidenceNavigation';

describe('cross-layer product-truth lesson', () => {
  const lessonId = 'cross-layer-product-truth-parity.v1';
  const evalId = 'lesson-cross-layer-product-truth-active';

  it('is reviewed, active and registry-valid', () => {
    expect(LESSON_REGISTRY_VERSION).toBe('2026-09-02.3');
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

  it('runs original, analogous and adversarial cross-layer evaluations', () => {
    const ids = [
      'cross-layer-original-alternate-renderer-and-demo-fallback',
      'cross-layer-analogous-persisted-identity-overwrite',
      'cross-layer-adversarial-valid-production-context',
    ];
    const report = runTruthEvals();
    for (const id of ids) {
      const evalCase = TRUTH_EVAL_CASES.find((candidate) => candidate.id === id);
      expect(evalCase?.kind).toBe('cross-layer-product-truth');
      expect(report.results.find((result) => result.id === id)?.passed).toBe(true);
    }
  });

  it('fails a cross-layer evaluation when its expected violations are tampered', () => {
    const source = TRUTH_EVAL_CASES.find(
      (candidate) => candidate.id === 'cross-layer-analogous-persisted-identity-overwrite',
    );
    expect(source).toBeDefined();
    const tampered = {
      ...source!,
      expect: { violations: [] },
    } as (typeof TRUTH_EVAL_CASES)[number];
    const report = runTruthEvals([tampered]);
    expect(report.failed).toBe(1);
    expect(report.results[0]?.passed).toBe(false);
  });

  it('reproduces the original alternate-renderer and demo-fallback misses', () => {
    expect(isNonProductionInternalPathname('/deploy')).toBe(true);
    expect(withEvidenceFacilityContext('/evidence/overview', null)).toBe('/evidence/overview');
  });

  it('catches the analogous persisted-identity failure mechanism', () => {
    expect(resolvePersistedBuildKind({
      configType: 'process_twin',
      twinId: 'bound-facility',
    })).toBe('process_twin');
  });

  it('does not flag the adversarial valid recovery case', () => {
    expect(isNonProductionInternalPathname('/dashboard')).toBe(false);
    expect(resolvePersistedBuildKind({
      configType: 'agent',
      twinId: 'legacy-bound-facility',
    })).toBe('3d_twin');
  });
});
