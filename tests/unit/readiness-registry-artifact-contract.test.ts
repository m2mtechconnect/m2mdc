/**
 * Batch 3 - readiness registries can never report a pass without an artifact.
 *
 * The DR, multicloud and post-publish smoke registries ship empty, which is a
 * truthful state. The risk is not the empty registry but a future entry that
 * claims verified/passed status with no stored artifact behind it. These tests
 * lock the rule at the validator boundary that every registry consumer runs.
 */

import { describe, expect, it } from 'vitest';
import { validateDrExerciseRecord } from '@/supervisor/drExerciseLog';
import { validateMulticloudEvidenceRecord } from '@/supervisor/multicloudEvidence';
import { validateSmokeReport } from '@/supervisor/smokeQualification';
import { DR_EXERCISE_REGISTRY } from '@/supervisor/drExerciseRegistry';
import { MULTICLOUD_EVIDENCE_REGISTRY } from '@/supervisor/multicloudEvidenceRegistry';
import { POST_PUBLISH_SMOKE_REGISTRY } from '@/supervisor/postPublishSmokeRegistry';

const withoutArtifact = <T extends Record<string, unknown>>(record: T) => {
  const copy: Record<string, unknown> = { ...record };
  delete copy.artifactRef;
  return copy;
};

describe('readiness registries reject artifact-less claims', () => {
  it('rejects a DR exercise that claims success with no artifact', () => {
    const record = {
      id: 'dr-2026-01-01',
      performedAt: '2026-01-01T00:00:00.000Z',
      scopes: ['backup'],
      outcome: 'passed',
      artifactRef: 'docs/evidence/dr-exercises/dr-2026-01-01.json',
    };
    expect(validateDrExerciseRecord(withoutArtifact(record)).valid).toBe(false);
    expect(validateDrExerciseRecord(withoutArtifact(record)).reasons.join(' ')).toMatch(/artifact/i);
  });

  it('rejects a portability claim with no artifact', () => {
    const record = {
      id: 'aws-verified',
      targetId: 'aws',
      stage: 'verified',
      artifactRef: 'infra/aws/main.tf',
    };
    expect(validateMulticloudEvidenceRecord(withoutArtifact(record)).valid).toBe(false);
  });

  it('rejects a smoke report that claims PASS with no artifact', () => {
    const report = {
      suite: 'aura.post-publish-smoke.v1',
      target: 'https://auradc.m2mtechconnect.com',
      completedAt: '2026-01-01T00:00:00.000Z',
      verdict: 'PASS',
      artifactRef: 'docs/evidence/post-publish-smoke/run.json',
      checks: [],
    };
    const result = validateSmokeReport(withoutArtifact(report));
    expect(result.valid).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/artifactRef is required/);
  });

  it('every shipped registry entry passes its own validator', () => {
    for (const entry of DR_EXERCISE_REGISTRY) {
      expect(validateDrExerciseRecord(entry).valid).toBe(true);
    }
    for (const entry of MULTICLOUD_EVIDENCE_REGISTRY) {
      expect(validateMulticloudEvidenceRecord(entry).valid).toBe(true);
    }
    for (const entry of POST_PUBLISH_SMOKE_REGISTRY) {
      expect(validateSmokeReport(entry).valid).toBe(true);
    }
  });
});
