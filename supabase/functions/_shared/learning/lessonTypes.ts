/**
 * AURA governed-learning lesson contract.
 *
 * A lesson is REVIEWED, VERSIONED GUIDANCE TEXT and nothing else.
 *
 * Hard governance rules encoded by this contract:
 *   - A lesson may only add guidance to a system prompt. It can never carry
 *     code, tools, model selection, policy, schema or production config.
 *   - Only `status: 'active'` lessons may be retrieved at runtime.
 *   - A lesson can never override the deterministic facility evidence
 *     envelope: retrieval output is injected BEFORE the authoritative
 *     evidence preamble, which stays the final authority in the prompt.
 *   - Lessons are authored from confirmed misses or review, never from raw
 *     user content and never from a model's own unreviewed output.
 *
 * Pure TypeScript: no Deno, DOM, network or filesystem dependency, so the
 * same module runs inside the edge function and under vitest.
 */

export const LESSON_STATUSES = ['draft', 'active', 'retired'] as const;
export type LessonStatus = (typeof LESSON_STATUSES)[number];

export const LESSON_ORIGINS = ['confirmed-miss', 'review'] as const;
export type LessonOrigin = (typeof LESSON_ORIGINS)[number];

/** Data class marker: reviewed material, never telemetry or tenant data. */
export const LESSON_DATA_CLASS = 'reviewed-lesson' as const;

export interface AuraLesson {
  /** Stable, versioned identifier, e.g. `viewport-evidence-exact-tuple.v1`. */
  id: string;
  version: number;
  title: string;
  status: LessonStatus;
  origin: LessonOrigin;
  /**
   * The durable mechanism this lesson protects, stated as a shared invariant.
   * Wording of any single answer is NOT the invariant.
   */
  invariant: string;
  /** The exact text that may be injected into a system prompt. */
  guidance: string;
  /** Evidence locators supporting the lesson (modules, tests, registries). */
  citations: readonly string[];
  /** Retrieval keys. Matched case-insensitively against the user query. */
  triggers: readonly string[];
  dataClass: typeof LESSON_DATA_CLASS;
  reviewedBy: string;
  reviewedAt: string;
  supersedes: string | null;
}

/** Words a lesson must never contain: they would make it executable. */
const FORBIDDEN_GUIDANCE_PATTERNS: readonly RegExp[] = [
  /\bignore (all |any )?(previous|prior|above)\b/i,
  /\bdisregard\b/i,
  /\boverride\b/i,
  /\bservice[_ -]?role\b/i,
  /\bmodel\s*[:=]\s*['"]/i,
  /\bexecute\b/i,
  /\bdrop table\b/i,
  /<script/i,
];

export interface LessonValidationResult {
  valid: boolean;
  violations: string[];
}

/**
 * Validate one lesson against the governance contract. Fails closed: any
 * violation makes the lesson invalid and therefore unretrievable.
 */
export function validateLesson(lesson: AuraLesson): LessonValidationResult {
  const violations: string[] = [];
  if (!/^[a-z0-9-]+\.v\d+$/.test(lesson.id)) violations.push(`id is not a versioned slug: ${lesson.id}`);
  if (!Number.isInteger(lesson.version) || lesson.version < 1) violations.push('version must be a positive integer');
  if (!LESSON_STATUSES.includes(lesson.status)) violations.push('unknown status');
  if (!LESSON_ORIGINS.includes(lesson.origin)) violations.push('unknown origin');
  if (lesson.dataClass !== LESSON_DATA_CLASS) violations.push('dataClass must be reviewed-lesson');
  if (lesson.invariant.trim().length < 20) violations.push('invariant is not stated');
  if (lesson.guidance.trim().length < 20) violations.push('guidance is not stated');
  if (lesson.guidance.length > 2000) violations.push('guidance exceeds the bounded length');
  if (lesson.citations.length === 0) violations.push('lesson has no citations');
  if (lesson.triggers.length === 0) violations.push('lesson has no retrieval triggers');
  if (!lesson.reviewedBy.trim()) violations.push('lesson has no reviewer');
  if (Number.isNaN(Date.parse(lesson.reviewedAt))) violations.push('reviewedAt is not a timestamp');
  for (const pattern of FORBIDDEN_GUIDANCE_PATTERNS) {
    if (pattern.test(lesson.guidance)) violations.push(`guidance contains a forbidden instruction pattern: ${pattern}`);
  }
  return { valid: violations.length === 0, violations };
}

/** Stable, order-independent integrity digest over a lesson set. */
export function lessonSetDigest(lessons: readonly AuraLesson[]): string {
  const canonical = lessons
    .map((l) => `${l.id}|${l.version}|${l.status}|${l.invariant}|${l.guidance}`)
    .sort()
    .join('\n');
  // Deterministic FNV-1a 32-bit; no crypto dependency so it runs anywhere.
  let hash = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i += 1) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, '0')}`;
}
