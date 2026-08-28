import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  POST_PUBLISH_SMOKE_REGISTRY,
  deriveSmokeQualification,
  isTruthCheck,
  loadSmokeReports,
  rejectedSmokeReports,
  validateSmokeReport,
  type SmokeReport,
} from '@/supervisor';

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);

const report: SmokeReport = {
  suite: 'aura.post-publish-smoke.v1',
  target: 'https://auradc.m2mtechconnect.com',
  observedSha: SHA_A,
  expectedSha: SHA_A,
  plane: 'public+authenticated',
  completedAt: '2026-08-26T13:00:00Z',
  trigger: 'automatic-on-publish',
  verdict: 'PASS',
  artifactRef: 'docs/evidence/post-publish-smoke/smoke-2026-08-26.json',
  checks: [
    { id: 'release-fingerprint', plane: 'public', status: 'PASS', detail: 'sha bound' },
    { id: 'public-shell:/login', plane: 'public', status: 'PASS', detail: 'shell served' },
    { id: 'truth-labels:analytics', plane: 'authenticated', status: 'PASS', detail: 'provenance language present' },
    { id: 'tenant-boundary:cross-tenant-isolation', plane: 'authenticated', status: 'PASS', detail: 'covered' },
  ],
};

describe('smoke report validation (fail-closed)', () => {
  it('accepts a complete artifact-backed report', () => {
    expect(validateSmokeReport(report)).toEqual({ valid: true, reasons: [] });
  });

  it('rejects a report with no stored evidence artifact', () => {
    const result = validateSmokeReport({ ...report, artifactRef: '' });
    expect(result.valid).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/artifactRef is required/);
  });

  it('rejects malformed suite, target, timestamp, verdict, sha and checks', () => {
    expect(validateSmokeReport({ ...report, suite: 'other' }).valid).toBe(false);
    expect(validateSmokeReport({ ...report, target: 'auradc' }).valid).toBe(false);
    expect(validateSmokeReport({ ...report, completedAt: 'yesterday' }).valid).toBe(false);
    expect(validateSmokeReport({ ...report, verdict: 'GREEN' }).valid).toBe(false);
    expect(validateSmokeReport({ ...report, observedSha: 'abc' }).valid).toBe(false);
    expect(validateSmokeReport({ ...report, checks: [] }).valid).toBe(false);
    expect(validateSmokeReport({ ...report, checks: [{ id: '', plane: 'public', status: 'PASS', detail: '' }] }).valid).toBe(false);
    expect(validateSmokeReport(null).valid).toBe(false);
  });

  it('surfaces rejected reports rather than dropping them silently', () => {
    const bad = { ...report, artifactRef: '' };
    expect(loadSmokeReports([bad])).toHaveLength(0);
    expect(rejectedSmokeReports([bad])[0].reasons.length).toBeGreaterThan(0);
  });
});

describe('smoke qualification derivation', () => {
  it('ships with an empty registry and reports not-run', () => {
    expect(loadSmokeReports(POST_PUBLISH_SMOKE_REGISTRY)).toEqual([]);
    const q = deriveSmokeQualification();
    expect(q.state).toBe('not-run');
    expect(q.truthState).toBe('not-assessed');
    expect(q.note).toMatch(/not qualified/i);
  });

  it('reports passing with truth/provenance pass for a current SHA', () => {
    const q = deriveSmokeQualification([report], SHA_A);
    expect(q.state).toBe('passing');
    expect(q.truthState).toBe('pass');
    expect(q.truthChecks).toHaveLength(3);
    expect(q.failed).toHaveLength(0);
  });

  it('reports stale when the passing run is bound to another release SHA', () => {
    const q = deriveSmokeQualification([report], SHA_B);
    expect(q.state).toBe('stale');
    expect(q.note).toMatch(/does not carry across releases/i);
  });

  it('reports failing when the recorded verdict failed', () => {
    const q = deriveSmokeQualification([{ ...report, verdict: 'FAIL' }], SHA_A);
    expect(q.state).toBe('failing');
  });

  it('never reports a truth pass when provenance checks did not run', () => {
    const blocked: SmokeReport = {
      ...report,
      checks: report.checks.map((c) =>
        isTruthCheck(c) && c.id.startsWith('truth-labels') ? { ...c, status: 'BLOCKED_BY_AUTH' } : c,
      ),
    };
    expect(deriveSmokeQualification([blocked], SHA_A).truthState).toBe('not-assessed');
  });

  it('reports a truth fail when a provenance check failed', () => {
    const failed: SmokeReport = {
      ...report,
      checks: report.checks.map((c) => (c.id === 'truth-labels:analytics' ? { ...c, status: 'FAIL' } : c)),
    };
    expect(deriveSmokeQualification([failed], SHA_A).truthState).toBe('fail');
  });

  it('keeps blocked and skipped checks unresolved rather than passing', () => {
    const partial: SmokeReport = {
      ...report,
      checks: [...report.checks, { id: 'authed-route:/dashboard', plane: 'authenticated', status: 'BLOCKED_BY_AUTH', detail: 'no session' }],
    };
    const q = deriveSmokeQualification([partial], SHA_A);
    expect(q.unresolved.map((c) => c.id)).toContain('authed-route:/dashboard');
    expect(q.passed.map((c) => c.id)).not.toContain('authed-route:/dashboard');
  });

  it('uses the most recent report', () => {
    const older = { ...report, completedAt: '2026-01-01T00:00:00Z', verdict: 'FAIL' as const };
    expect(deriveSmokeQualification(loadSmokeReports([older, report]), SHA_A).state).toBe('passing');
  });
});

describe('automatic on-publish execution contract', () => {
  const script = fs.readFileSync(path.resolve('scripts/post-publish-smoke.mjs'), 'utf8');
  const workflow = fs.readFileSync(path.resolve('.github/workflows/post-publish-smoke.yml'), 'utf8');

  it('runs automatically and only qualifies a release SHA once', () => {
    expect(workflow).toMatch(/schedule:/);
    expect(workflow).toMatch(/workflow_run:/);
    expect(script).toContain('--only-if-new-publish');
  });

  it('stores evidence artifacts and regenerates the supervisor registry', () => {
    expect(script).toContain('docs/evidence/post-publish-smoke');
    expect(script).toContain('POST_PUBLISH_SMOKE_REGISTRY');
    expect(workflow).toContain('upload-artifact');
    expect(script).toContain('checks: results');
  });

  it('exercises the read-only Builder transitions that previously left stale content visible', () => {
    expect(script).toContain('journey:builder-saved-draft');
    expect(script).toContain('journey:builder-to-operations');
    expect(script).toContain('[data-testid="builder-layout"]');
    expect(script).toContain('Operations URL and visible workspace committed together');
  });

  it('remains read-only and never publishes or writes to main', () => {
    expect(script).not.toMatch(/method:\s*'POST'/);
    expect(workflow).not.toMatch(/push .*origin main|origin HEAD:main/);
    expect(workflow).toContain('evidence/post-publish-smoke');
  });

  it('records the trigger and the observed live SHA', () => {
    expect(script).toContain('AURA_SMOKE_TRIGGER');
    expect(script).toContain('observedSha');
  });
});

describe('supervisor surface shows smoke pass/fail and provenance', () => {
  const page = fs.readFileSync(path.resolve('src/pages/Supervisor.tsx'), 'utf8');

  it('renders the derived qualification, not a hardcoded verdict', () => {
    expect(page).toContain('deriveSmokeQualification');
    expect(page).toContain('data-testid="smoke-qualification"');
    expect(page).toContain('data-testid="smoke-checks"');
    expect(page).toContain('Truth and provenance');
  });
});
