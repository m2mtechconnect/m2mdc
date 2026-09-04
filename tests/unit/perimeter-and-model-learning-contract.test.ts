/**
 * Governed-learning coverage for the remaining high-risk gaps identified by the
 * AURA audit. These tests cover reviewed retrieval and synthetic evaluation
 * only; they do not train model weights or authorize runtime changes.
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

const LESSONS = [
  {
    id: 'auth-email-hook-signed-webhook.v1',
    evalId: 'lesson-auth-email-hook-signed-webhook-active',
    query: 'How should the auth-email-hook signed webhook verify its provider timestamp?',
  },
  {
    id: 'physics-model-claim-grounding.v1',
    evalId: 'lesson-physics-model-claim-grounding-active',
    query: 'Is the PhysicsNeMo calibrated model an NVIDIA runtime in production?',
  },
  {
    id: 'frontend-backend-api-contract.v1',
    evalId: 'lesson-frontend-backend-api-contract-active',
    query: 'Does this frontend API contract persist the response after reload?',
  },
  {
    id: 'fixture-isolation-and-provenance.v1',
    evalId: 'lesson-fixture-isolation-and-provenance-active',
    query: 'Can fixture leakage expose synthetic data as selected facility live data?',
  },
  {
    id: 'artifact-sha-provenance.v1',
    evalId: 'lesson-artifact-sha-provenance-active',
    query: 'Is this artifact evidence valid for the exact SHA candidate commit?',
  },
  {
    id: 'tenant-rls-caller-boundary.v1',
    evalId: 'lesson-tenant-rls-caller-boundary-active',
    query: 'Does tenant RLS reject a browser-supplied organization id across tenants?',
  },
  {
    id: 'physics-model-qualification.v1',
    evalId: 'lesson-physics-model-qualification-active',
    query: 'What model card and dataset provenance are required for physics model qualification?',
  },
] as const;

describe('AURA high-risk governed-learning coverage', () => {
  it('bumps and validates the reviewed registry', () => {
    expect(LESSON_REGISTRY_VERSION).toBe('2026-09-04.2');
    expect(verifyLessonRegistryIntegrity()).toMatchObject({ ok: true, problems: [] });
    for (const entry of LESSONS) {
      const lesson = lessonById(entry.id);
      expect(lesson).not.toBeNull();
      expect(lesson!.status).toBe('active');
      expect(lesson!.origin).toBe('confirmed-miss');
      expect(validateLesson(lesson!)).toEqual({ valid: true, violations: [] });
      expect(activeLessons().map((candidate) => candidate.id)).toContain(entry.id);
    }
  });

  it('retrieves each lesson only from its declared mechanism', () => {
    for (const entry of LESSONS) {
      expect(retrieveApprovedLessons(entry.query).lessonIds).toContain(entry.id);
    }
    expect(retrieveApprovedLessons('What is the weather in Montreal?').lessonIds).toEqual([]);
  });

  it('exercises both lessons through the shared truth-evaluation runner', () => {
    const results = runTruthEvals().results;
    for (const entry of LESSONS) {
      expect(TRUTH_EVAL_CASES.find((candidate) => candidate.id === entry.evalId)).toBeDefined();
      expect(results.find((result) => result.id === entry.evalId)).toMatchObject({
        passed: true,
        failures: [],
      });
    }
  });
});
