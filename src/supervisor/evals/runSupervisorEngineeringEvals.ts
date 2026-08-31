/**
 * Supervisor engineering evaluation runner.
 *
 * Executes the synthetic evaluation suite (supervisor-engineering-evals.json)
 * against the deterministic retrieval module and the evidence guardrails.
 * The runner takes parsed JSON as input and performs no file, network or
 * database IO, so it is safe in any environment.
 *
 * The suite data class is synthetic-evaluation-data: cases are authored,
 * reviewed material — never telemetry, never tenant data.
 */
import {
  ENGINEERING_CORPUS_MANIFEST,
  retrieveEngineeringKnowledge,
  verifyCorpusIntegrity,
} from '../knowledge/auraEngineeringKnowledge';
import { ENGINEERING_KNOWLEDGE_DOMAINS } from '../knowledge/engineeringKnowledgeTypes';
import type { EngineeringKnowledgeDomain } from '../knowledge/engineeringKnowledgeTypes';
import { guardGroundedAnswer } from '../knowledge/evidenceGuardrails';

export const ENGINEERING_EVAL_SUITE_ID = 'supervisor-engineering-evals';
export const ENGINEERING_EVAL_DATA_CLASS = 'synthetic-evaluation-data';
export const ENGINEERING_EVAL_CASE_KINDS = ['retrieval', 'guardrail', 'corpus-integrity'] as const;
export type EngineeringEvalCaseKind = (typeof ENGINEERING_EVAL_CASE_KINDS)[number];

export interface RetrievalEvalCase {
  id: string;
  title: string;
  kind: 'retrieval';
  input: { query: string; domains?: EngineeringKnowledgeDomain[] };
  expect: {
    grounding: 'grounded' | 'no-grounding';
    /** Domains that must appear among the matched entries. */
    domains?: EngineeringKnowledgeDomain[];
    /** Exact id of the top-ranked entry, when pinned. */
    topEntryId?: string;
    /** Minimum number of citations the result must return. */
    minCitations?: number;
  };
}

export interface GuardrailEvalCase {
  id: string;
  title: string;
  kind: 'guardrail';
  input: { statement: string; evidence: unknown[] };
  expect: {
    status: 'pass' | 'blocked';
    violationCategories: string[];
    detectedCategories?: string[];
  };
}

export interface CorpusIntegrityEvalCase {
  id: string;
  title: string;
  kind: 'corpus-integrity';
  expect: { checksumMatches: true; versionPinned: true };
}

export type EngineeringEvalCase = RetrievalEvalCase | GuardrailEvalCase | CorpusIntegrityEvalCase;

export interface EngineeringEvalSuite {
  suite: string;
  version: string;
  dataClass: string;
  note: string;
  cases: EngineeringEvalCase[];
}

export interface EvalSuiteParseResult {
  suite: EngineeringEvalSuite | null;
  errors: string[];
}

const SEMVER = /^\d+\.\d+\.\d+$/;

/** Validate untyped JSON into a typed suite. Fail-closed on any defect. */
export function parseEvalSuite(raw: unknown): EvalSuiteParseResult {
  const errors: string[] = [];
  const s = raw as Partial<EngineeringEvalSuite> | null;
  if (!s || typeof s !== 'object') {
    return { suite: null, errors: ['suite must be an object'] };
  }
  if (s.suite !== ENGINEERING_EVAL_SUITE_ID) {
    errors.push(`suite must be "${ENGINEERING_EVAL_SUITE_ID}"`);
  }
  if (typeof s.version !== 'string' || !SEMVER.test(s.version)) {
    errors.push('version must be a semantic version string');
  }
  if (s.dataClass !== ENGINEERING_EVAL_DATA_CLASS) {
    errors.push(`dataClass must be "${ENGINEERING_EVAL_DATA_CLASS}"`);
  }
  if (typeof s.note !== 'string' || s.note.length === 0) {
    errors.push('note is required');
  }
  if (!Array.isArray(s.cases) || s.cases.length === 0) {
    errors.push('cases must be a non-empty array');
    return { suite: null, errors };
  }
  const seenIds = new Set<string>();
  s.cases.forEach((candidate, index) => {
    const c = candidate as Partial<EngineeringEvalCase>;
    const label = `cases[${index}]`;
    if (typeof c.id !== 'string' || c.id.length === 0) errors.push(`${label}: id required`);
    else if (seenIds.has(c.id)) errors.push(`${label}: duplicate id ${c.id}`);
    else seenIds.add(c.id);
    if (typeof c.title !== 'string' || c.title.length === 0) errors.push(`${label}: title required`);
    if (!ENGINEERING_EVAL_CASE_KINDS.includes(c.kind as EngineeringEvalCaseKind)) {
      errors.push(`${label}: kind must be one of ${ENGINEERING_EVAL_CASE_KINDS.join(', ')}`);
      return;
    }
    if (c.kind === 'retrieval') {
      const rc = c as Partial<RetrievalEvalCase>;
      if (!rc.input || typeof rc.input.query !== 'string' || rc.input.query.length === 0) {
        errors.push(`${label}: retrieval input.query required`);
      }
      if (!rc.expect || !['grounded', 'no-grounding'].includes(rc.expect.grounding as string)) {
        errors.push(`${label}: retrieval expect.grounding required`);
      }
      for (const domain of rc.expect?.domains ?? []) {
        if (!ENGINEERING_KNOWLEDGE_DOMAINS.includes(domain)) {
          errors.push(`${label}: unknown expected domain ${domain}`);
        }
      }
    }
    if (c.kind === 'guardrail') {
      const gc = c as Partial<GuardrailEvalCase>;
      if (!gc.input || typeof gc.input.statement !== 'string' || gc.input.statement.length === 0) {
        errors.push(`${label}: guardrail input.statement required`);
      }
      if (!gc.input || !Array.isArray(gc.input.evidence)) {
        errors.push(`${label}: guardrail input.evidence must be an array`);
      }
      if (!gc.expect || !['pass', 'blocked'].includes(gc.expect.status as string)) {
        errors.push(`${label}: guardrail expect.status required`);
      }
      if (!gc.expect || !Array.isArray(gc.expect.violationCategories)) {
        errors.push(`${label}: guardrail expect.violationCategories must be an array`);
      }
    }
    if (c.kind === 'corpus-integrity') {
      const cc = c as Partial<CorpusIntegrityEvalCase>;
      if (!cc.expect || cc.expect.checksumMatches !== true || cc.expect.versionPinned !== true) {
        errors.push(`${label}: corpus-integrity expectations must be pinned true`);
      }
    }
  });
  if (errors.length > 0) return { suite: null, errors };
  return { suite: s as EngineeringEvalSuite, errors: [] };
}

export interface EngineeringEvalResult {
  id: string;
  title: string;
  kind: EngineeringEvalCaseKind;
  passed: boolean;
  failures: string[];
}

export interface EngineeringEvalRunReport {
  suiteId: string;
  suiteVersion: string;
  corpusVersion: string;
  total: number;
  passed: number;
  failed: number;
  results: EngineeringEvalResult[];
}

function runRetrievalCase(evalCase: RetrievalEvalCase): string[] {
  const failures: string[] = [];
  const result = retrieveEngineeringKnowledge({
    query: evalCase.input.query,
    domains: evalCase.input.domains,
  });
  if (result.grounding !== evalCase.expect.grounding) {
    failures.push(`grounding: expected ${evalCase.expect.grounding}, got ${result.grounding}`);
  }
  if (evalCase.expect.grounding === 'no-grounding') {
    if (result.matches.length !== 0) failures.push('no-grounding result must return zero matches');
    if (result.citations.length !== 0) failures.push('no-grounding result must return zero citations');
  }
  const matchedDomains = new Set(result.matches.map((m) => m.entry.domain));
  for (const domain of evalCase.expect.domains ?? []) {
    if (!matchedDomains.has(domain)) failures.push(`expected domain ${domain} among matches`);
  }
  if (evalCase.expect.topEntryId && result.matches[0]?.entry.id !== evalCase.expect.topEntryId) {
    failures.push(
      `topEntryId: expected ${evalCase.expect.topEntryId}, got ${result.matches[0]?.entry.id ?? 'none'}`,
    );
  }
  if (
    typeof evalCase.expect.minCitations === 'number' &&
    result.citations.length < evalCase.expect.minCitations
  ) {
    failures.push(
      `citations: expected at least ${evalCase.expect.minCitations}, got ${result.citations.length}`,
    );
  }
  if (result.corpusVersion !== ENGINEERING_CORPUS_MANIFEST.version) {
    failures.push('result must echo the pinned corpus version');
  }
  return failures;
}

function runGuardrailCase(evalCase: GuardrailEvalCase): string[] {
  const failures: string[] = [];
  const result = guardGroundedAnswer(evalCase.input.statement, evalCase.input.evidence);
  if (result.status !== evalCase.expect.status) {
    failures.push(`status: expected ${evalCase.expect.status}, got ${result.status}`);
  }
  const violationCategories = result.violations.map((v) => v.category).sort();
  const expectedViolations = [...evalCase.expect.violationCategories].sort();
  if (JSON.stringify(violationCategories) !== JSON.stringify(expectedViolations)) {
    failures.push(
      `violationCategories: expected [${expectedViolations.join(', ')}], got [${violationCategories.join(', ')}]`,
    );
  }
  if (evalCase.expect.detectedCategories) {
    const detected = [...result.detectedCategories].sort();
    const expectedDetected = [...evalCase.expect.detectedCategories].sort();
    if (JSON.stringify(detected) !== JSON.stringify(expectedDetected)) {
      failures.push(
        `detectedCategories: expected [${expectedDetected.join(', ')}], got [${detected.join(', ')}]`,
      );
    }
  }
  return failures;
}

function runCorpusIntegrityCase(): string[] {
  const failures: string[] = [];
  const integrity = verifyCorpusIntegrity();
  if (!integrity.ok) failures.push(...integrity.reasons);
  if (!SEMVER.test(ENGINEERING_CORPUS_MANIFEST.version)) {
    failures.push('corpus manifest version must be semantic');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ENGINEERING_CORPUS_MANIFEST.pinnedAt)) {
    failures.push('corpus manifest pinnedAt must be an ISO date');
  }
  return failures;
}

/** Execute every case deterministically and report per-case outcomes. */
export function runSupervisorEngineeringEvals(
  suite: EngineeringEvalSuite,
): EngineeringEvalRunReport {
  const results: EngineeringEvalResult[] = suite.cases.map((evalCase) => {
    let failures: string[];
    switch (evalCase.kind) {
      case 'retrieval':
        failures = runRetrievalCase(evalCase);
        break;
      case 'guardrail':
        failures = runGuardrailCase(evalCase);
        break;
      case 'corpus-integrity':
        failures = runCorpusIntegrityCase();
        break;
    }
    return {
      id: evalCase.id,
      title: evalCase.title,
      kind: evalCase.kind,
      passed: failures.length === 0,
      failures,
    };
  });
  const passed = results.filter((r) => r.passed).length;
  return {
    suiteId: suite.suite,
    suiteVersion: suite.version,
    corpusVersion: ENGINEERING_CORPUS_MANIFEST.version,
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}
