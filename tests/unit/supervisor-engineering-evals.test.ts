/**
 * Supervisor engineering evaluation suite contract (ADR-0010).
 *
 * Proves: the suite file exists with the pinned name, declares itself
 * synthetic evaluation data, contains exactly 14 well-formed cases, and
 * every case passes against the deterministic retrieval module and the
 * evidence guardrails.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  ENGINEERING_EVAL_DATA_CLASS,
  ENGINEERING_EVAL_SUITE_ID,
  parseEvalSuite,
  runSupervisorEngineeringEvals,
} from '../../src/supervisor/evals/runSupervisorEngineeringEvals';

const SUITE_PATH = 'src/supervisor/evals/supervisor-engineering-evals.json';

const rawSuite = JSON.parse(readFileSync(resolve(process.cwd(), SUITE_PATH), 'utf8')) as unknown;

describe('suite shape', () => {
  it('parses without errors', () => {
    const { suite, errors } = parseEvalSuite(rawSuite);
    expect(errors).toEqual([]);
    expect(suite).not.toBeNull();
  });

  it('is named and labelled as synthetic evaluation data', () => {
    const { suite } = parseEvalSuite(rawSuite);
    expect(suite!.suite).toBe(ENGINEERING_EVAL_SUITE_ID);
    expect(suite!.dataClass).toBe(ENGINEERING_EVAL_DATA_CLASS);
    expect(suite!.note.toLowerCase()).toContain('synthetic');
  });

  it('contains exactly 14 cases with unique ids', () => {
    const { suite } = parseEvalSuite(rawSuite);
    expect(suite!.cases).toHaveLength(14);
    const ids = suite!.cases.map((c) => c.id);
    expect(new Set(ids).size).toBe(14);
  });

  it('covers retrieval, guardrail and corpus-integrity case kinds', () => {
    const { suite } = parseEvalSuite(rawSuite);
    const kinds = new Set(suite!.cases.map((c) => c.kind));
    expect(kinds.has('retrieval')).toBe(true);
    expect(kinds.has('guardrail')).toBe(true);
    expect(kinds.has('corpus-integrity')).toBe(true);
  });

  it('includes an anti-fabrication no-grounding case and a blocked guardrail case', () => {
    const { suite } = parseEvalSuite(rawSuite);
    expect(
      suite!.cases.some((c) => c.kind === 'retrieval' && c.expect.grounding === 'no-grounding'),
    ).toBe(true);
    expect(
      suite!.cases.some((c) => c.kind === 'guardrail' && c.expect.status === 'blocked'),
    ).toBe(true);
  });

  it('rejects malformed suites fail-closed', () => {
    expect(parseEvalSuite(null).suite).toBeNull();
    expect(parseEvalSuite({ suite: 'wrong-name', cases: [] }).suite).toBeNull();
    const { errors } = parseEvalSuite({
      suite: ENGINEERING_EVAL_SUITE_ID,
      version: '1.0.0',
      dataClass: ENGINEERING_EVAL_DATA_CLASS,
      note: 'x',
      cases: [{ id: 'a', title: 't', kind: 'unknown-kind' }],
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('evaluation execution', () => {
  it('all 14 cases pass', () => {
    const { suite } = parseEvalSuite(rawSuite);
    const report = runSupervisorEngineeringEvals(suite!);
    const failing = report.results.filter((r) => !r.passed);
    expect(failing.map((r) => ({ id: r.id, failures: r.failures }))).toEqual([]);
    expect(report.total).toBe(14);
    expect(report.passed).toBe(14);
    expect(report.failed).toBe(0);
  });

  it('report echoes suite and corpus pins', () => {
    const { suite } = parseEvalSuite(rawSuite);
    const report = runSupervisorEngineeringEvals(suite!);
    expect(report.suiteId).toBe(ENGINEERING_EVAL_SUITE_ID);
    expect(report.suiteVersion).toBe(suite!.version);
    expect(report.corpusVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
