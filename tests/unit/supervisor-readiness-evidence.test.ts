/**
 * Supervisor readiness evidence batch — contract.
 *
 * Guards the truth rules for the remediation batch:
 *  - observability: nothing is `verified` without evidence; the client adapter
 *    is contract-tested but never reported as live monitoring
 *  - DR: documentation/configuration is not proof of exercise; `exercised`
 *    requires an evidence reference; RTO/RPO stay not-defined until measured
 *  - portability: `verified` requires every lower stage evidenced; hyperscaler
 *    targets without artifacts stay unevidenced
 *  - release profiles: the default profile is the full gate; the pilot
 *    profile may exempt the accelerated-runtime blocker only when the
 *    capability is honestly unavailable AND no data-provenance gap exists
 *  - post-publish smoke suite: read-only, fail-closed, no mutation endpoints,
 *    no secret material in evidence
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DR_EXERCISE_STATUS,
  DR_READINESS_FIELDS,
  OBSERVABILITY_SIGNALS,
  PORTABILITY_MATRIX,
  PORTABILITY_STAGES,
  READINESS_FINDINGS,
  RELEASE_PROFILES,
  DEFAULT_RELEASE_PROFILE,
  PILOT_EXEMPTIBLE_FINDING_ID,
  evaluateReleaseGate,
  evaluateReleaseGateForProfile,
  observabilityStatusCounts,
  portabilityClaimIsSound,
  type ReadinessFinding,
} from '@/supervisor';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

const baseFindings = READINESS_FINDINGS;

const withFinding = (patch: Partial<ReadinessFinding> & { id: string }): ReadinessFinding[] =>
  baseFindings.map((f) => (f.id === patch.id ? { ...f, ...patch } : f));

describe('observability readiness contract', () => {
  it('reports every required signal', () => {
    const ids = OBSERVABILITY_SIGNALS.map((s) => s.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'runtime-monitoring-client',
        'monitoring-backend',
        'alerting',
        'telemetry-freshness',
        'incident-signals',
      ]),
    );
  });

  it('never marks a signal verified without an evidence reference', () => {
    for (const signal of OBSERVABILITY_SIGNALS) {
      if (signal.status === 'verified') expect(signal.evidenceRef, signal.id).toBeTruthy();
    }
  });

  it('claims no live monitoring, alerting or telemetry today', () => {
    // Nothing is verified end-to-end; the client adapter is explicitly
    // not-tested, and live signals are unavailable or not assessed.
    expect(OBSERVABILITY_SIGNALS.some((s) => s.status === 'verified')).toBe(false);
    const adapter = OBSERVABILITY_SIGNALS.find((s) => s.id === 'runtime-monitoring-client');
    expect(adapter?.status).toBe('not-tested');
    expect(adapter?.evidenceRef).toBe('tests/unit/runtime-monitoring-contract.test.ts');
    expect(OBSERVABILITY_SIGNALS.find((s) => s.id === 'telemetry-freshness')?.status).toBe('unavailable');
  });

  it('derives counts without fabrication', () => {
    const counts = observabilityStatusCounts();
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(OBSERVABILITY_SIGNALS.length);
  });
});

describe('DR and rollback readiness evidence', () => {
  it('exposes explicit backup, restore, rollback, RTO and RPO fields', () => {
    expect(DR_READINESS_FIELDS.map((f) => f.id)).toEqual(['backup', 'restore', 'rollback', 'rto', 'rpo']);
  });

  it('keeps documentation distinct from exercised proof', () => {
    for (const field of DR_READINESS_FIELDS) {
      if (field.state === 'exercised') expect(field.evidenceRef, field.id).toBeTruthy();
    }
    expect(DR_READINESS_FIELDS.find((f) => f.id === 'rollback')?.state).toBe('documented');
    expect(DR_EXERCISE_STATUS.state).toBe('not-exercised');
  });

  it('never invents RTO/RPO targets', () => {
    expect(DR_READINESS_FIELDS.find((f) => f.id === 'rto')?.state).toBe('not-defined');
    expect(DR_READINESS_FIELDS.find((f) => f.id === 'rpo')?.state).toBe('not-defined');
    for (const field of DR_READINESS_FIELDS) {
      expect(field.note).not.toMatch(/\b\d+\s*(minutes?|hours?|RTO|RPO)\s*(target|achieved|met)/i);
    }
  });
});

describe('multicloud portability evidence matrix', () => {
  it('covers the current stack, four hyperscalers and private Kubernetes', () => {
    const ids = PORTABILITY_MATRIX.map((t) => t.id);
    expect(ids).toEqual([
      'lovable-cloud-stack',
      'aws',
      'microsoft-azure',
      'google-cloud',
      'oci',
      'private-kubernetes',
    ]);
  });

  it('reports all four stages per target with sound claims', () => {
    for (const target of PORTABILITY_MATRIX) {
      expect(target.stages.map((s) => s.stage), target.id).toEqual([...PORTABILITY_STAGES]);
      expect(portabilityClaimIsSound(target), target.id).toBe(true);
    }
  });

  it('does not imply hyperscaler deployment support without artifacts', () => {
    for (const id of ['microsoft-azure', 'google-cloud', 'oci']) {
      const target = PORTABILITY_MATRIX.find((t) => t.id === id);
      expect(target?.stages.every((s) => s.state === 'not-evidenced'), id).toBe(true);
      expect(target?.currentClaim).toMatch(/not claimed|no portability artifacts/i);
    }
    const aws = PORTABILITY_MATRIX.find((t) => t.id === 'aws');
    expect(aws?.stages.find((s) => s.stage === 'verified')?.state).toBe('not-evidenced');
  });

  it('rejects a fabricated verified claim in the guardrail', () => {
    const aws = PORTABILITY_MATRIX.find((t) => t.id === 'aws');
    const fabricated = {
      ...aws!,
      stages: aws!.stages.map((s) =>
        s.stage === 'verified' ? { ...s, state: 'evidenced' as const, evidenceRef: 'docs/fake.md' } : s,
      ),
    };
    expect(portabilityClaimIsSound(fabricated)).toBe(false);
  });
});

describe('release qualification profiles', () => {
  it('defaults to the conservative accelerated-runtime profile', () => {
    expect(DEFAULT_RELEASE_PROFILE).toBe('accelerated-runtime-enterprise');
    expect([...RELEASE_PROFILES]).toEqual(['accelerated-runtime-enterprise', 'enterprise-pilot-simulated']);
  });

  it('the default profile equals the full gate with no exemptions', () => {
    const full = evaluateReleaseGate(baseFindings);
    const profiled = evaluateReleaseGateForProfile(baseFindings);
    expect(profiled.profile).toBe('accelerated-runtime-enterprise');
    expect(profiled.decision).toBe(full.decision);
    expect(profiled.blockers).toEqual(full.blockers);
    expect(profiled.exemptedFindings).toEqual([]);
  });

  it('current posture: accelerated profile stays No-Go on the runtime blocker', () => {
    const decision = evaluateReleaseGateForProfile(baseFindings, 'accelerated-runtime-enterprise');
    expect(decision.decision).toBe('no-go');
    expect(decision.blockers.some((b) => b.includes(PILOT_EXEMPTIBLE_FINDING_ID))).toBe(true);
  });

  it('pilot profile exempts the runtime blocker only when it is honestly unavailable', () => {
    // Baseline findings mark runtime-accelerated-ai as unavailable.
    const accelerated = baseFindings.find((f) => f.id === PILOT_EXEMPTIBLE_FINDING_ID);
    expect(accelerated?.status).toBe('unavailable');

    const decision = evaluateReleaseGateForProfile(baseFindings, 'enterprise-pilot-simulated');
    expect(decision.exemptedFindings.map((e) => e.id)).toEqual([PILOT_EXEMPTIBLE_FINDING_ID]);
    expect(decision.blockers.some((b) => b.includes(PILOT_EXEMPTIBLE_FINDING_ID))).toBe(false);
  });

  it('pilot profile never exempts a defective (gap) runtime capability', () => {
    const findings = withFinding({ id: PILOT_EXEMPTIBLE_FINDING_ID, status: 'gap' });
    const decision = evaluateReleaseGateForProfile(findings, 'enterprise-pilot-simulated');
    expect(decision.decision).toBe('no-go');
    expect(decision.exemptedFindings).toEqual([]);
    expect(decision.blockers.some((b) => b.includes(PILOT_EXEMPTIBLE_FINDING_ID))).toBe(true);
  });

  it('pilot profile fails closed when any truth/provenance control has a gap', () => {
    const findings = withFinding({
      id: 'data-provenance-model',
      status: 'gap',
      severity: 'high',
    });
    const decision = evaluateReleaseGateForProfile(findings, 'enterprise-pilot-simulated');
    expect(decision.exemptedFindings).toEqual([]);
    expect(decision.blockers.some((b) => b.includes(PILOT_EXEMPTIBLE_FINDING_ID))).toBe(true);
  });

  it('other mandatory blockers are never silently downgraded by the pilot profile', () => {
    const findings = withFinding({ id: 'security-rls-tenancy', status: 'gap', severity: 'blocker' });
    const decision = evaluateReleaseGateForProfile(findings, 'enterprise-pilot-simulated');
    expect(decision.decision).toBe('no-go');
    expect(decision.blockers.some((b) => b.includes('security-rls-tenancy'))).toBe(true);
  });
});

describe('post-publish smoke suite contract', () => {
  const source = read('scripts/post-publish-smoke.mjs');
  const workflow = read('.github/workflows/post-publish-smoke.yml');

  it('is wired as an npm script and a manual-dispatch workflow only', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.scripts['smoke:post-publish']).toBe('node scripts/post-publish-smoke.mjs');
    expect(workflow).toContain('workflow_dispatch');
    expect(workflow).not.toMatch(/^on:\s*\n\s*push/m);
  });

  it('is read-only: no mutation endpoints, no form submission, no DB writes', () => {
    expect(source).not.toMatch(/fetch\([^)]*method:\s*'(POST|PUT|PATCH|DELETE)'/);
    expect(source).not.toContain('.rpc(');
    expect(source).not.toContain('page.click(');
    expect(source).not.toContain('service_role');
    expect(source).not.toContain('SERVICE_ROLE');
  });

  it('validates the release fingerprint schema and expected SHA', () => {
    expect(source).toContain('aura.release-fingerprint.v1');
    expect(source).toContain('AURA_EXPECTED_SHA');
    for (const field of ['sha', 'branch', 'environment', 'buildId']) {
      expect(source).toContain(`'${field}'`);
    }
  });

  it('fails closed when no smoke session is resolvable', () => {
    expect(source).toContain('PreviewSessionUnavailableError');
    expect(source).toContain('BLOCKED_BY_AUTH');
    expect(source).toContain("process.exit(verdict === 'PASS' ? 0 : 1)");
    expect(source).toContain("blocked.length === 0 ? 'PASS' : 'FAIL'");
  });

  it('records tenant-boundary probing as not-run instead of approximating it', () => {
    expect(source).toContain('NOT_RUN');
    expect(source).toContain('tenant-boundary:cross-tenant-isolation');
  });

  it('never writes secret material into evidence', () => {
    expect(source).toContain("'<session-installed>'");
    expect(source).not.toMatch(/evidence[\s\S]{0,200}(access_token|refresh_token|password)/i);
    expect(source).toContain('docs/evidence/post-publish-smoke/');
  });

  it('checks the unauthenticated bounce and truth labels', () => {
    expect(source).toContain('/dashboard');
    expect(source).toContain('/login');
    expect(source).toContain('simulat|demonstration|not measured|fixture');
  });
});

describe('supervisor UI surfaces the new evidence', () => {
  const page = read('src/pages/Supervisor.tsx');

  it('renders release profiles, observability, DR and portability sections', () => {
    expect(page).toContain('data-testid="release-profiles"');
    expect(page).toContain('data-testid="observability-readiness"');
    expect(page).toContain('data-testid="dr-readiness"');
    expect(page).toContain('data-testid="portability-matrix"');
    expect(page).toContain('evaluateReleaseGateForProfile');
    expect(page).toContain('OBSERVABILITY_SIGNALS');
    expect(page).toContain('deriveDrReadinessFields');
    expect(page).toContain('deriveMulticloudPortabilityMatrix');
  });
});
