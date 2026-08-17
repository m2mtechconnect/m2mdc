/**
 * Shared retry classification for data queries
 * (deep page-wiring finding #2: unknown identifiers produced 400/406 responses
 * that were retried three times, leaving a permanent spinner).
 *
 * A client error about *what was asked for* is terminal: retrying it cannot
 * change the answer. Only genuinely transient conditions are retried, with a
 * capped count and bounded exponential backoff.
 */

/** HTTP statuses that describe an invalid or missing resource. */
export const TERMINAL_STATUSES = [400, 401, 403, 404, 405, 406, 409, 410, 422];
/** Conditions that may succeed on a later attempt. */
export const TRANSIENT_STATUSES = [408, 425, 429, 500, 502, 503, 504];

export const MAX_QUERY_RETRIES = 2;

function statusOf(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const e = error as Record<string, unknown>;
  const raw = e.status ?? e.statusCode ?? e.httpStatus;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string' && /^\d+$/.test(raw)) return Number(raw);
  return null;
}

function pgCodeOf(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const code = (error as Record<string, unknown>).code;
  return typeof code === 'string' ? code : null;
}

/**
 * True when the failure can never be resolved by asking again: a malformed
 * identifier, a missing row, or an authorization refusal.
 */
export function isTerminalDataError(error: unknown): boolean {
  const status = statusOf(error);
  if (status !== null) {
    if (TRANSIENT_STATUSES.includes(status)) return false;
    if (TERMINAL_STATUSES.includes(status)) return true;
    return status >= 400 && status < 500;
  }
  const code = pgCodeOf(error);
  if (!code) return false;
  // PGRST116 = no rows for `.single()`; 22P02 = invalid input syntax for uuid;
  // 42501 = insufficient privilege. None of these change on retry.
  if (['PGRST116', 'PGRST301', '22P02', '42501', '23505'].includes(code)) return true;
  // Postgres client-error classes (22 data exception, 23 integrity, 42 syntax).
  return /^(22|23|42)/.test(code);
}

/** react-query `retry` predicate. Terminal failures stop loading immediately. */
export function retryUnlessTerminal(failureCount: number, error: unknown): boolean {
  if (isTerminalDataError(error)) return false;
  return failureCount < MAX_QUERY_RETRIES;
}

/** Bounded exponential backoff, capped so no query can hang for minutes. */
export function boundedRetryDelay(attemptIndex: number): number {
  return Math.min(500 * 2 ** attemptIndex, 4000);
}

/** True when the identifier itself is unusable, so the page must show not found. */
export function isNotFoundError(error: unknown): boolean {
  const status = statusOf(error);
  if (status === 404 || status === 406 || status === 400) return true;
  const code = pgCodeOf(error);
  return code === 'PGRST116' || code === '22P02';
}

/** User-safe message. Backend detail is never surfaced verbatim. */
export function describeDataError(error: unknown): string {
  if (isNotFoundError(error)) {
    return 'This record does not exist, or the address contains an invalid identifier.';
  }
  const status = statusOf(error);
  if (status === 401 || status === 403 || pgCodeOf(error) === '42501') {
    return 'You do not have access to this record.';
  }
  return 'This record could not be loaded. Try again, or return to the list.';
}
