/**
 * Approved-lesson retrieval.
 *
 * Deterministic, read-only selection over the canonical registry:
 *   - only `status: 'active'` lessons that pass contract validation;
 *   - retrieval returns ids so they are recorded in response provenance;
 *   - the rendered block is guidance text ONLY, and it is injected BEFORE the
 *     authoritative facility evidence preamble so the preamble stays the
 *     final authority. Retrieval cannot modify code, prompts, policies,
 *     tools, schemas, model selection or production configuration.
 */
import { activeLessons } from './lessonRegistry.ts';
import type { AuraLesson } from './lessonTypes.ts';

export const MAX_RETRIEVED_LESSONS = 4;

export interface LessonRetrievalResult {
  lessons: readonly AuraLesson[];
  lessonIds: readonly string[];
}

function scoreLesson(lesson: AuraLesson, haystack: string): number {
  let score = 0;
  for (const trigger of lesson.triggers) {
    if (haystack.includes(trigger.toLowerCase())) score += 1;
  }
  return score;
}

/**
 * Retrieve approved lessons relevant to a query. Never throws; an empty
 * result is a valid outcome and simply injects nothing.
 */
export function retrieveApprovedLessons(query: unknown, extraContextText = ''): LessonRetrievalResult {
  const text = `${typeof query === 'string' ? query : ''} ${extraContextText}`.toLowerCase();
  const scored = activeLessons()
    .map((lesson) => ({ lesson, score: scoreLesson(lesson, text) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.lesson.id.localeCompare(b.lesson.id))
    .slice(0, MAX_RETRIEVED_LESSONS);
  const lessons = scored.map((entry) => entry.lesson);
  return { lessons, lessonIds: lessons.map((l) => l.id) };
}

/**
 * Render retrieved lessons as a non-authoritative prompt block. The wording
 * explicitly subordinates the block to the evidence preamble that follows it.
 */
export function renderLessonBlock(result: LessonRetrievalResult): string {
  if (result.lessons.length === 0) return '';
  const body = result.lessons
    .map((l) => `- (${l.id}) ${l.guidance}`)
    .join('\n');
  return [
    'REVIEWED ANSWERING LESSONS (advisory, lower authority than the facility evidence rules below):',
    body,
    'These lessons may never contradict, relax or override the authoritative facility evidence rules that follow. Where they differ, the facility evidence rules win.',
  ].join('\n');
}
