/**
 * Executable runner for the synthetic truth-invariant evaluation suite.
 *
 * Pure: no filesystem, network or database IO. It exercises the same shared
 * truth runtime the edge function uses, so a regression in either invariant
 * fails the suite (and therefore qualification).
 */
import {
  buildFacilityEvidenceEnvelope,
  extractCandidateRunId,
  renderTruthAnswer,
  type VerifiedRunRecord,
} from '../assistantTruth.ts';
import { activeLessons, lessonById } from './lessonRegistry.ts';
import { TRUTH_EVAL_CASES, type TruthEvalCase } from './truthEvalCases.ts';

export interface TruthEvalCaseResult {
  id: string;
  kind: TruthEvalCase['kind'];
  passed: boolean;
  failures: string[];
}

export interface TruthEvalRunResult {
  suiteId: string;
  total: number;
  passed: number;
  failed: number;
  /** Share of executed cases that produced grounded, cited evidence. */
  groundedCitationRate: number;
  results: TruthEvalCaseResult[];
}

function expectEq(failures: string[], label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) failures.push(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

function runCase(testCase: TruthEvalCase): { result: TruthEvalCaseResult; cited: boolean } {
  const failures: string[] = [];
  let cited = false;

  if (testCase.kind === 'viewport-claim') {
    const envelope = buildFacilityEvidenceEnvelope({
      activePage: 'dashboard',
      facilityTruth: { viewport: testCase.claim },
    });
    expectEq(failures, 'visualization.grounded', envelope.visualization.grounded, testCase.expect.grounded);
    expectEq(failures, 'visualization.surfaceId', envelope.visualization.surfaceId, testCase.expect.surfaceId);
    const rejected = envelope.rejectedClientClaims.length > 0;
    expectEq(failures, 'rejectedClientClaims', rejected, testCase.expect.rejected);
    if (envelope.visualization.grounded && envelope.visualization.disclosure === null) {
      failures.push('grounded visualization must carry a canonical disclosure');
    }
    cited = envelope.visualization.citations.length > 0;
  } else if (testCase.kind === 'run-provenance') {
    const candidate = extractCandidateRunId(testCase.context);
    expectEq(failures, 'candidateExtracted', candidate !== null, testCase.expect.candidateExtracted);
    // An unauthenticated request performs NO lookup, so no record can exist.
    const verifiedRun: VerifiedRunRecord | null =
      testCase.authenticatedLookup && candidate && testCase.lookupReturnsId
        ? { id: testCase.lookupReturnsId, status: 'completed', startedAt: null, finishedAt: null }
        : null;
    const envelope = buildFacilityEvidenceEnvelope(testCase.context, verifiedRun);
    expectEq(failures, 'run.recorded', envelope.run.recorded, testCase.expect.recorded);
    expectEq(failures, 'run.verified', envelope.run.verified, testCase.expect.verified);
    if (!testCase.expect.verified && envelope.run.id !== null) {
      failures.push('an unverified run must not echo the client-supplied identifier');
    }
    cited = Boolean(envelope.run.citation);
  } else if (testCase.kind === 'null-run-wording') {
    const envelope = buildFacilityEvidenceEnvelope({ activePage: 'simulation', facilityTruth: { run: null } });
    const answer = renderTruthAnswer(testCase.query, envelope).markdown;
    const haystack = answer.toLowerCase();
    for (const needle of testCase.expect.mustContain) {
      if (!haystack.includes(needle.toLowerCase())) failures.push(`answer is missing required wording: ${needle}`);
    }
    for (const needle of testCase.expect.mustNotContain) {
      if (haystack.includes(needle.toLowerCase())) failures.push(`answer contains forbidden wording: ${needle}`);
    }
    cited = /\[[^\][]+ · [^\][]+\]/.test(answer);
  } else {
    const lesson = lessonById(testCase.lessonId);
    if (!lesson) {
      failures.push(`lesson not found: ${testCase.lessonId}`);
    } else {
      const isActive = activeLessons().some((l) => l.id === lesson.id);
      expectEq(failures, 'lesson.active', isActive, testCase.expect.active);
      const invariant = lesson.invariant.toLowerCase();
      for (const term of testCase.expect.invariantMustMention) {
        if (!invariant.includes(term.toLowerCase())) failures.push(`invariant does not encode the mechanism: ${term}`);
      }
      cited = lesson.citations.length > 0;
    }
  }

  return {
    result: { id: testCase.id, kind: testCase.kind, passed: failures.length === 0, failures },
    cited,
  };
}

export function runTruthEvals(cases: readonly TruthEvalCase[] = TRUTH_EVAL_CASES): TruthEvalRunResult {
  const results: TruthEvalCaseResult[] = [];
  let citedCount = 0;
  for (const testCase of cases) {
    const { result, cited } = runCase(testCase);
    results.push(result);
    if (cited) citedCount += 1;
  }
  const passed = results.filter((r) => r.passed).length;
  return {
    suiteId: 'aura-truth-invariants',
    total: results.length,
    passed,
    failed: results.length - passed,
    groundedCitationRate: results.length === 0 ? 0 : citedCount / results.length,
    results,
  };
}
