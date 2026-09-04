import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type ReleaseContract = {
  schema: string;
  blockingE2E: {
    lifecycle: string[];
    authSecurity: string[];
  };
  legacyE2E: {
    directory: string;
    policy: string;
  };
  workflowGates: Array<{ name: string; mode: string }>;
  postPublishVerification: string;
};

const contract = JSON.parse(
  readFileSync(resolve(process.cwd(), 'config/aura-release-contract.json'), 'utf8'),
) as ReleaseContract;

describe('Phase 8 AURA DC release journey contract', () => {
  it('uses the versioned canonical release-contract schema', () => {
    expect(contract.schema).toBe('aura.release-contract.v1');
  });

  it('defines the persisted lifecycle acceptance and golden journey as blocking E2E authority', () => {
    expect(contract.blockingE2E.lifecycle).toEqual([
      'tests/e2e/acceptance-final.spec.ts',
      'tests/e2e/phase1-vertical-slice.spec.ts',
      'tests/e2e/golden-user-journey.spec.ts',
    ]);
  });

  it('keeps auth and security coverage in the blocking release set', () => {
    expect(contract.blockingE2E.authSecurity).toEqual([
      'tests/e2e/auth-security.spec.ts',
    ]);
  });

  it('keeps the historical E2E catalog visible but non-blocking until reconciled', () => {
    expect(contract.legacyE2E).toEqual({
      directory: 'tests/e2e',
      policy: 'non-blocking-until-reconciled',
    });
  });

  it('contains no duplicate blocking E2E authority', () => {
    const blocking = [
      ...contract.blockingE2E.lifecycle,
      ...contract.blockingE2E.authSecurity,
    ];
    expect(new Set(blocking).size).toBe(blocking.length);
  });

  it('names one final pre-merge QA authority and preserves post-publish verification', () => {
    expect(contract.workflowGates.map((gate) => gate.name)).toContain('QA Suite');
    expect(contract.postPublishVerification).toBe('Release Target Verification');
  });
});
