/**
 * Post-publish smoke qualification evidence (supervisor plane).
 *
 * Truth rules (fail-closed):
 *  - A smoke verdict is only ever derived from a recorded evidence artifact
 *    produced by the read-only suite. With no artifact the surface reports
 *    `not-run`, never "healthy" and never a fabricated pass.
 *  - A recorded run proves the target and SHA it was executed against and
 *    nothing else. When the live release fingerprint has moved on, the run is
 *    reported as `stale` rather than as current qualification.
 *  - Truth/provenance checks are reported as their own outcome. A run whose
 *    functional checks pass but whose provenance checks did not run is NOT a
 *    provenance pass.
 *  - Blocked and not-run checks are surfaced, never folded into a pass.
 */
import { POST_PUBLISH_SMOKE_REGISTRY } from './postPublishSmokeRegistry';

export const SMOKE_CHECK_STATUSES = ['PASS', 'FAIL', 'BLOCKED_BY_AUTH', 'NOT_RUN', 'SKIPPED'] as const;
export type SmokeCheckStatus = (typeof SMOKE_CHECK_STATUSES)[number];

export const SMOKE_PLANES = ['public', 'authenticated'] as const;
export type SmokePlane = (typeof SMOKE_PLANES)[number];

export interface SmokeCheck {
  id: string;
  plane: SmokePlane;
  status: SmokeCheckStatus;
  detail: string;
}

export interface SmokeReport {
  suite: 'aura.post-publish-smoke.v1';
  /** Origin the suite was executed against. */
  target: string;
  /** Release SHA the run was bound to. Null when the target served none. */
  observedSha: string | null;
  /** SHA the run was asked to prove, when supplied. */
  expectedSha: string | null;
  plane: 'public-only' | 'public+authenticated';
  /** ISO-8601 completion timestamp. */
  completedAt: string;
  /** How the run was started. Read-only suite: never a mutation. */
  trigger: 'automatic-on-publish' | 'scheduled' | 'manual';
  verdict: 'PASS' | 'FAIL';
  /** Repository path of the stored evidence artifact. Mandatory. */
  artifactRef: string;
  checks: SmokeCheck[];
}

/** Checks that assert truth-in-UI / provenance rather than availability. */
export const TRUTH_CHECK_PREFIXES = ['truth-labels', 'release-fingerprint', 'tenant-boundary'] as const;

export function isTruthCheck(check: SmokeCheck): boolean {
  return TRUTH_CHECK_PREFIXES.some((prefix) => check.id.startsWith(prefix));
}

const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const SHA_40 = /^[0-9a-f]{40}$/;

export interface SmokeReportValidation {
  valid: boolean;
  reasons: string[];
}

/** Validates a supplied report. Nothing is defaulted, inferred or repaired. */
export function validateSmokeReport(report: unknown): SmokeReportValidation {
  const reasons: string[] = [];
  const r = report as Partial<SmokeReport> | null;

  if (!r || typeof r !== 'object') return { valid: false, reasons: ['report is not an object'] };
  if (r.suite !== 'aura.post-publish-smoke.v1') reasons.push('suite identifier is not aura.post-publish-smoke.v1');
  if (!r.target || !/^https?:\/\//.test(String(r.target))) reasons.push('target must be an absolute origin');
  if (!r.completedAt || !ISO_8601.test(String(r.completedAt))) reasons.push('completedAt must be an ISO-8601 timestamp');
  if (r.verdict !== 'PASS' && r.verdict !== 'FAIL') reasons.push('verdict must be PASS or FAIL');
  if (!r.artifactRef || !String(r.artifactRef).trim()) {
    reasons.push('artifactRef is required - a run without a stored evidence artifact is not evidence');
  }
  if (r.observedSha != null && !SHA_40.test(String(r.observedSha))) reasons.push('observedSha must be a 40-character git sha');
  if (r.expectedSha != null && !SHA_40.test(String(r.expectedSha))) reasons.push('expectedSha must be a 40-character git sha');
  if (r.plane !== 'public-only' && r.plane !== 'public+authenticated') reasons.push('plane is not recognised');
  if (!Array.isArray(r.checks) || r.checks.length === 0) {
    reasons.push('at least one recorded check is required');
  } else if (
    r.checks.some(
      (c) =>
        !c ||
        typeof c.id !== 'string' ||
        !c.id.trim() ||
        !SMOKE_PLANES.includes(c.plane) ||
        !SMOKE_CHECK_STATUSES.includes(c.status),
    )
  ) {
    reasons.push('checks contain a malformed entry');
  }
  if (r.trigger && !['automatic-on-publish', 'scheduled', 'manual'].includes(String(r.trigger))) {
    reasons.push('trigger is not recognised');
  }

  return { valid: reasons.length === 0, reasons };
}

/** Valid recorded reports, newest first. */
export function loadSmokeReports(source: unknown = POST_PUBLISH_SMOKE_REGISTRY): SmokeReport[] {
  const raw = Array.isArray(source) ? source : [];
  return (raw.filter((entry) => validateSmokeReport(entry).valid) as SmokeReport[]).sort(
    (a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt),
  );
}

/** Supplied reports that were rejected, with reasons. Surfaced, not hidden. */
export function rejectedSmokeReports(
  source: unknown = POST_PUBLISH_SMOKE_REGISTRY,
): Array<{ report: unknown; reasons: string[] }> {
  const raw = Array.isArray(source) ? source : [];
  return raw
    .map((report) => ({ report, reasons: validateSmokeReport(report).reasons }))
    .filter((entry) => entry.reasons.length > 0);
}

export type SmokeQualificationState =
  /** No recorded run exists. */
  | 'not-run'
  /** Latest run passed and is bound to the SHA currently being assessed. */
  | 'passing'
  /** Latest run failed. */
  | 'failing'
  /** Latest run passed but was executed against a different SHA. */
  | 'stale';

export type TruthCheckState = 'pass' | 'fail' | 'not-assessed';

export interface SmokeQualification {
  state: SmokeQualificationState;
  /** Latest valid recorded report, when one exists. */
  latest: SmokeReport | null;
  /** Availability/functional checks split by outcome. */
  passed: SmokeCheck[];
  failed: SmokeCheck[];
  /** Checks that could not run (auth blocked, skipped, deliberately not run). */
  unresolved: SmokeCheck[];
  /** Outcome of truth/provenance checks specifically. */
  truthState: TruthCheckState;
  truthChecks: SmokeCheck[];
  /** Plain-language statement of exactly what the surface may claim. */
  note: string;
}

const NOT_RUN_NOTE =
  'No post-publish smoke run has been recorded. Publication is not qualified until a read-only run stores an evidence artifact for the live release SHA.';

/**
 * Derives the qualification surface. `currentSha` is the SHA being assessed
 * (typically the live release fingerprint); when supplied, a passing run bound
 * to a different SHA is reported as stale rather than as current proof.
 */
export function deriveSmokeQualification(
  reports: SmokeReport[] = loadSmokeReports(),
  currentSha: string | null = null,
): SmokeQualification {
  const latest = reports[0] ?? null;
  if (!latest) {
    return {
      state: 'not-run',
      latest: null,
      passed: [],
      failed: [],
      unresolved: [],
      truthState: 'not-assessed',
      truthChecks: [],
      note: NOT_RUN_NOTE,
    };
  }

  const truthChecks = latest.checks.filter(isTruthCheck);
  const functional = latest.checks.filter((c) => !isTruthCheck(c));
  const passed = functional.filter((c) => c.status === 'PASS');
  const failed = functional.filter((c) => c.status === 'FAIL');
  const unresolved = functional.filter((c) => c.status !== 'PASS' && c.status !== 'FAIL');

  const truthFailed = truthChecks.some((c) => c.status === 'FAIL');
  const truthPassedAll = truthChecks.length > 0 && truthChecks.every((c) => c.status === 'PASS');
  const truthState: TruthCheckState = truthFailed ? 'fail' : truthPassedAll ? 'pass' : 'not-assessed';

  const runSha = latest.observedSha ?? latest.expectedSha ?? null;
  const stale = latest.verdict === 'PASS' && currentSha != null && runSha !== currentSha;

  const state: SmokeQualificationState =
    latest.verdict === 'FAIL' ? 'failing' : stale ? 'stale' : 'passing';

  const notes: Record<SmokeQualificationState, string> = {
    'not-run': NOT_RUN_NOTE,
    failing: `Latest run against ${latest.target} failed (${failed.length} failed check(s)). The published target is not qualified.`,
    stale: `Latest passing run is bound to ${runSha ?? 'an unrecorded SHA'}, which is not the SHA being assessed (${currentSha}). Qualification does not carry across releases.`,
    passing: `Read-only run against ${latest.target} completed ${latest.completedAt} for ${runSha ?? 'an unrecorded SHA'}.`,
  };

  return {
    state,
    latest,
    passed,
    failed,
    unresolved,
    truthState,
    truthChecks,
    note: notes[state],
  };
}

export const SMOKE_TRUTH_NOTE =
  'The suite performs read-only GET navigations only. It never submits a form, writes to the database or calls a mutation endpoint, and evidence artifacts never contain tokens, cookies or account identifiers.';
