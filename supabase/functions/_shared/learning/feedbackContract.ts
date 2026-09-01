/**
 * Consented feedback candidate contract (Phase 1: contract only, no storage).
 *
 * Governance:
 *   - Consent is mandatory and explicit. Without it there is no candidate.
 *   - Free-form text is redacted before it may be retained, and it is bounded.
 *   - A candidate is NEVER a runtime instruction: it cannot be retrieved,
 *     injected into a prompt, or promoted automatically. Promotion into a
 *     lesson requires human review through the lesson registry.
 *   - Secrets, credentials, raw auth artifacts and private tenant records are
 *     never storable: the redactor removes them and records the reason.
 */

export const FEEDBACK_DATA_CLASS = 'consented-feedback-candidate' as const;
export const FEEDBACK_MAX_NOTE_LENGTH = 500;
export const FEEDBACK_DEFAULT_RETENTION_DAYS = 90;

export const FEEDBACK_VERDICTS = ['helpful', 'not-helpful', 'incorrect', 'unsafe'] as const;
export type FeedbackVerdict = (typeof FEEDBACK_VERDICTS)[number];

export const REDACTION_REASONS = [
  'email',
  'bearer-token',
  'jwt',
  'uuid',
  'credentialed-url',
  'api-key',
  'truncated',
] as const;
export type RedactionReason = (typeof REDACTION_REASONS)[number];

export interface RedactionResult {
  text: string;
  reasons: RedactionReason[];
}

const RULES: ReadonlyArray<{ reason: RedactionReason; pattern: RegExp; token: string }> = [
  { reason: 'jwt', pattern: /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g, token: '[redacted:jwt]' },
  { reason: 'bearer-token', pattern: /\bbearer\s+[A-Za-z0-9._~+/-]{8,}=*/gi, token: '[redacted:bearer-token]' },
  {
    reason: 'credentialed-url',
    pattern: /\b[a-z][a-z0-9+.-]*:\/\/[^\s/@]+:[^\s/@]+@[^\s]+/gi,
    token: '[redacted:credentialed-url]',
  },
  {
    reason: 'api-key',
    pattern: /\b(?:sk|pk|rk|api|key)[-_][A-Za-z0-9_-]{12,}\b/gi,
    token: '[redacted:api-key]',
  },
  { reason: 'email', pattern: /\b[^\s@]+@[^\s@]+\.[A-Za-z]{2,}\b/g, token: '[redacted:email]' },
  {
    reason: 'uuid',
    pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    token: '[redacted:uuid]',
  },
];

/**
 * Redact free-form feedback text. Fail-closed: unknown input types become an
 * empty string, and the result is always bounded.
 */
export function redactFeedbackText(input: unknown): RedactionResult {
  if (typeof input !== 'string' || input.length === 0) return { text: '', reasons: [] };
  const reasons: RedactionReason[] = [];
  let text = input;
  for (const rule of RULES) {
    if (rule.pattern.test(text)) {
      reasons.push(rule.reason);
      text = text.replace(rule.pattern, rule.token);
    }
    rule.pattern.lastIndex = 0;
  }
  if (text.length > FEEDBACK_MAX_NOTE_LENGTH) {
    text = `${text.slice(0, FEEDBACK_MAX_NOTE_LENGTH)}…`;
    reasons.push('truncated');
  }
  return { text, reasons };
}

export interface FeedbackCandidate {
  /** Literal true: the type makes unconsented capture unrepresentable. */
  consent: true;
  /** Opaque correlation to the emitted provenance record (no tenant data). */
  responseProvenanceRef: string;
  verdict: FeedbackVerdict;
  redactedNote: string;
  redactionReasons: readonly RedactionReason[];
  dataClass: typeof FEEDBACK_DATA_CLASS;
  retentionDays: number;
  deletionRequestedAt: string | null;
  capturedAt: string;
}

export interface FeedbackCandidateInput {
  consent: boolean;
  responseProvenanceRef: unknown;
  verdict: unknown;
  note?: unknown;
  retentionDays?: number;
  capturedAt?: string;
}

export interface FeedbackCandidateResult {
  candidate: FeedbackCandidate | null;
  rejected: string[];
}

/** Build a candidate. Returns `candidate: null` with reasons on any violation. */
export function buildFeedbackCandidate(input: FeedbackCandidateInput): FeedbackCandidateResult {
  const rejected: string[] = [];
  if (input.consent !== true) rejected.push('consent-not-given');
  if (typeof input.responseProvenanceRef !== 'string' || input.responseProvenanceRef.length === 0) {
    rejected.push('missing-provenance-reference');
  }
  if (typeof input.verdict !== 'string' || !FEEDBACK_VERDICTS.includes(input.verdict as FeedbackVerdict)) {
    rejected.push('unknown-verdict');
  }
  if (rejected.length > 0) return { candidate: null, rejected };

  const redaction = redactFeedbackText(input.note);
  return {
    candidate: {
      consent: true,
      responseProvenanceRef: input.responseProvenanceRef as string,
      verdict: input.verdict as FeedbackVerdict,
      redactedNote: redaction.text,
      redactionReasons: redaction.reasons,
      dataClass: FEEDBACK_DATA_CLASS,
      retentionDays: input.retentionDays ?? FEEDBACK_DEFAULT_RETENTION_DAYS,
      deletionRequestedAt: null,
      capturedAt: input.capturedAt ?? new Date().toISOString(),
    },
    rejected: [],
  };
}

/**
 * Governance invariant, asserted by tests: a feedback candidate is never a
 * runtime instruction and can never be injected into a prompt.
 */
export function isFeedbackRuntimeInjectable(): false {
  return false;
}
