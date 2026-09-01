/**
 * Canonical, code-owned AURA lesson registry.
 *
 * ONE source of truth, shared verbatim by the edge runtime and by vitest.
 * There is no mirror to drift from.
 *
 * Phase 1 seeds exactly the two invariants proven by the truth-grounding
 * hardening. Each lesson encodes the MECHANISM, not the current wording of
 * any single answer, so a rephrased regression still fails the eval suite.
 */
import { lessonSetDigest, validateLesson, type AuraLesson } from './lessonTypes.ts';

export const LESSON_REGISTRY_VERSION = '2026-09-01.1';

const LESSONS: readonly AuraLesson[] = Object.freeze([
  Object.freeze({
    id: 'viewport-evidence-exact-tuple.v1',
    version: 1,
    title: 'Viewport evidence is a complete canonical tuple keyed by a registered surface id',
    status: 'active',
    origin: 'confirmed-miss',
    invariant:
      'A visualisation claim is grounded only when the client-supplied surface id names a record in the canonical viewport registry AND the renderer, disclosure and limitation match that one record exactly as a complete tuple. Unknown ids, partial tuples and values mixed across surfaces are rejected. Grounded values are copied from the registry record, never echoed from client strings, and no viewport claim can assert a validated OpenUSD stage.',
    guidance:
      'When describing what a viewport shows, use only the visualisation values the server envelope marks as grounded, and name the canonical surface id they came from. If the envelope reports the visualisation as not grounded, say the visualisation is not verified rather than describing a renderer, disclosure or limitation. Procedural 2D or 3D preview is never a validated OpenUSD stage.',
    citations: [
      'supabase/functions/_shared/assistantTruth.ts#CANONICAL_VIEWPORT_SURFACES',
      'src/workspace/viewportRegistry.ts',
      'tests/unit/assistant-truth-grounding-contract.test.ts',
    ],
    triggers: ['viewport', 'visualisation', 'visualization', 'render', 'openusd', 'usd', '3d', 'stage', 'preview'],
    dataClass: 'reviewed-lesson',
    reviewedBy: 'AURA engineering review',
    reviewedAt: '2026-09-01T00:00:00.000Z',
    supersedes: null,
  } as AuraLesson),
  Object.freeze({
    id: 'run-id-untrusted-locator.v1',
    version: 1,
    title: 'A client run id is an untrusted locator; provenance needs an authenticated RLS-scoped read',
    status: 'active',
    origin: 'confirmed-miss',
    invariant:
      'A run id supplied by the client is only a locator. It becomes provenance solely after an authenticated, caller-scoped read of public.simulation_runs under RLS, never through the service role and never by echoing the identifier. Malformed or fabricated ids, unauthenticated requests and rows the caller cannot see all fail closed to not verified. An explicit null page run states that the current page shows no run; it is never evidence that no run exists in the database.',
    guidance:
      'Only call a run recorded when the server envelope marks it verified. Never repeat a run identifier supplied by the page as proof that the run exists. When the page shows no run, say the current AURA page shows no run and state that this is not proof that no run exists in the database. When a run id could not be verified, say the run is not verified instead of describing its results.',
    citations: [
      'supabase/functions/_shared/assistantTruth.ts#extractCandidateRunId',
      'supabase/functions/copilot-stream/index.ts#run-provenance-lookup',
      'tests/unit/assistant-truth-grounding-contract.test.ts',
    ],
    triggers: ['run', 'run id', 'provenance', 'simulation run', 'recorded', 'results', 'history'],
    dataClass: 'reviewed-lesson',
    reviewedBy: 'AURA engineering review',
    reviewedAt: '2026-09-01T00:00:00.000Z',
    supersedes: null,
  } as AuraLesson),
]);

export const LESSON_REGISTRY: readonly AuraLesson[] = LESSONS;

/** Integrity digest of the whole registry (all statuses). */
export const LESSON_REGISTRY_DIGEST = lessonSetDigest(LESSONS);

export function allLessons(): readonly AuraLesson[] {
  return LESSONS;
}

export function lessonById(id: string): AuraLesson | null {
  return LESSONS.find((l) => l.id === id) ?? null;
}

/**
 * Active lessons only. A draft or retired lesson can never reach the runtime,
 * and neither can a lesson that fails contract validation.
 */
export function activeLessons(): readonly AuraLesson[] {
  return LESSONS.filter((l) => l.status === 'active' && validateLesson(l).valid);
}

export interface RegistryIntegrityResult {
  ok: boolean;
  digest: string;
  problems: string[];
}

/** Fail-closed integrity check over the registry. */
export function verifyLessonRegistryIntegrity(): RegistryIntegrityResult {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const lesson of LESSONS) {
    if (seen.has(lesson.id)) problems.push(`duplicate lesson id: ${lesson.id}`);
    seen.add(lesson.id);
    const result = validateLesson(lesson);
    if (!result.valid) problems.push(`${lesson.id}: ${result.violations.join('; ')}`);
  }
  return { ok: problems.length === 0, digest: LESSON_REGISTRY_DIGEST, problems };
}
