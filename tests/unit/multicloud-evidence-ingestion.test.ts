import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import {
  EXECUTION_ARTIFACT_KINDS,
  MULTICLOUD_ARTIFACT_KINDS,
  MULTICLOUD_EVIDENCE_REGISTRY,
  STAGE_ARTIFACT_REQUIREMENTS,
  TEMPLATE_ARTIFACT_KINDS,
  deriveMulticloudPortabilityMatrix,
  derivedMatrixIsSound,
  loadMulticloudEvidenceRecords,
  recordUpgradesStage,
  rejectedMulticloudEvidenceRecords,
  summariseMulticloudIngestion,
  validateMulticloudEvidenceRecord,
  type MulticloudEvidenceRecord,
} from '@/supervisor/multicloudEvidence';
import { PORTABILITY_MATRIX, portabilityClaimIsSound } from '@/supervisor/portabilityMatrix';

const sha = 'a'.repeat(64);

const record = (over: Partial<MulticloudEvidenceRecord> = {}): MulticloudEvidenceRecord => ({
  id: 'mc-aws-configured-20260826T140',
  targetId: 'aws',
  stage: 'configured',
  artifacts: [{ path: 'infra/aws/main.tf', kind: 'terraform', sha256: sha }],
  validation: {
    method: 'terraform validate',
    status: 'passed',
    performedAt: '2026-08-26T14:00:00Z',
    validator: 'Platform Engineering',
  },
  note: 'Baseline module set.',
  ...over,
});

describe('multicloud evidence record validation', () => {
  it('accepts a well-formed record', () => {
    expect(validateMulticloudEvidenceRecord(record())).toEqual({ valid: true, reasons: [] });
  });

  it('rejects a record with no artifacts', () => {
    const result = validateMulticloudEvidenceRecord(record({ artifacts: [] }));
    expect(result.valid).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/at least one artifact/);
  });

  it('rejects an unknown portability target', () => {
    const result = validateMulticloudEvidenceRecord(record({ targetId: 'some-other-cloud' }));
    expect(result.valid).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/targetId/);
  });

  it('rejects an artifact without a SHA-256 digest', () => {
    const result = validateMulticloudEvidenceRecord(
      record({ artifacts: [{ path: 'infra/aws/main.tf', kind: 'terraform', sha256: 'nope' }] }),
    );
    expect(result.valid).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/sha256/);
  });

  it('rejects an unrecognised artifact class', () => {
    const result = validateMulticloudEvidenceRecord(
      record({ artifacts: [{ path: 'notes.txt', kind: 'sticky-note' as never, sha256: sha }] }),
    );
    expect(result.valid).toBe(false);
  });

  it('rejects a malformed validation timestamp', () => {
    const result = validateMulticloudEvidenceRecord(
      record({ validation: { ...record().validation, performedAt: 'yesterday' } }),
    );
    expect(result.valid).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/ISO-8601/);
  });

  it('requires an accountable validator', () => {
    const result = validateMulticloudEvidenceRecord(
      record({ validation: { ...record().validation, validator: '  ' } }),
    );
    expect(result.valid).toBe(false);
  });

  it('rejects non-object input', () => {
    expect(validateMulticloudEvidenceRecord(null).valid).toBe(false);
    expect(validateMulticloudEvidenceRecord('terraform').valid).toBe(false);
  });
});

describe('stage artifact requirements', () => {
  it('never lets a template alone prove tested or verified', () => {
    for (const kind of TEMPLATE_ARTIFACT_KINDS) {
      expect(STAGE_ARTIFACT_REQUIREMENTS.tested).not.toContain(kind);
      expect(STAGE_ARTIFACT_REQUIREMENTS.verified).not.toContain(kind);
    }
  });

  it('rejects a tested claim backed only by a manifest', () => {
    const result = validateMulticloudEvidenceRecord(
      record({
        stage: 'tested',
        artifacts: [{ path: 'infra/aws/eks.yaml', kind: 'kubernetes-manifest', sha256: sha }],
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/stage tested requires/);
  });

  it('accepts a tested claim backed by an execution artifact', () => {
    for (const kind of EXECUTION_ARTIFACT_KINDS) {
      const result = validateMulticloudEvidenceRecord(
        record({ stage: 'tested', artifacts: [{ path: `logs/${kind}.log`, kind, sha256: sha }] }),
      );
      expect(result.valid).toBe(true);
    }
  });

  it('only allows deployment logs or test reports to prove verified', () => {
    expect([...STAGE_ARTIFACT_REQUIREMENTS.verified].sort()).toEqual(['deployment-log', 'test-report']);
  });

  it('exposes only known artifact classes', () => {
    for (const stage of Object.keys(STAGE_ARTIFACT_REQUIREMENTS) as Array<
      keyof typeof STAGE_ARTIFACT_REQUIREMENTS
    >) {
      for (const kind of STAGE_ARTIFACT_REQUIREMENTS[stage]) {
        expect(MULTICLOUD_ARTIFACT_KINDS).toContain(kind);
      }
    }
  });
});

describe('matrix derivation', () => {
  it('leaves the baseline unchanged when nothing is ingested', () => {
    expect(deriveMulticloudPortabilityMatrix([])).toEqual([...PORTABILITY_MATRIX]);
  });

  it('marks a stage evidenced only when validation passed', () => {
    const failed = deriveMulticloudPortabilityMatrix([
      record({ validation: { ...record().validation, status: 'failed' } }),
    ]);
    const aws = failed.find((t) => t.id === 'aws')!;
    expect(aws.stages.find((s) => s.stage === 'configured')!.state).toBe('not-evidenced');

    const passed = deriveMulticloudPortabilityMatrix([record()]);
    const awsPassed = passed.find((t) => t.id === 'aws')!;
    const configured = awsPassed.stages.find((s) => s.stage === 'configured')!;
    expect(configured.state).toBe('evidenced');
    expect(configured.evidenceRef).toBe('infra/aws/main.tf');
  });

  it('ignores a not-run validation', () => {
    expect(recordUpgradesStage(record({ validation: { ...record().validation, status: 'not-run' } }))).toBe(false);
  });

  it('withholds verified when a lower stage has no artifacts', () => {
    const matrix = deriveMulticloudPortabilityMatrix([
      record({
        id: 'mc-azure-verified',
        targetId: 'microsoft-azure',
        stage: 'verified',
        artifacts: [{ path: 'logs/azure-deploy.log', kind: 'deployment-log', sha256: sha }],
      }),
    ]);
    const azure = matrix.find((t) => t.id === 'microsoft-azure')!;
    expect(azure.stages.find((s) => s.stage === 'verified')!.state).toBe('not-evidenced');
    expect(azure.stages.find((s) => s.stage === 'verified')!.note).toMatch(/withheld/i);
  });

  it('grants verified only when every lower stage is evidenced', () => {
    const matrix = deriveMulticloudPortabilityMatrix([
      record({ id: 'a', targetId: 'google-cloud', stage: 'designed' }),
      record({ id: 'b', targetId: 'google-cloud', stage: 'configured' }),
      record({
        id: 'c',
        targetId: 'google-cloud',
        stage: 'tested',
        artifacts: [{ path: 'logs/gcp-plan.txt', kind: 'plan-output', sha256: sha }],
      }),
      record({
        id: 'd',
        targetId: 'google-cloud',
        stage: 'verified',
        artifacts: [{ path: 'logs/gcp-deploy.log', kind: 'deployment-log', sha256: sha }],
      }),
    ]);
    const gcp = matrix.find((t) => t.id === 'google-cloud')!;
    expect(gcp.stages.every((s) => s.state === 'evidenced')).toBe(true);
    expect(gcp.currentClaim).toMatch(/verified/);
    expect(portabilityClaimIsSound(gcp)).toBe(true);
  });

  it('uses the most recent passing record for a stage', () => {
    const matrix = deriveMulticloudPortabilityMatrix([
      record({ id: 'old', artifacts: [{ path: 'infra/aws/old.tf', kind: 'terraform', sha256: sha }] }),
      record({
        id: 'new',
        artifacts: [{ path: 'infra/aws/new.tf', kind: 'terraform', sha256: sha }],
        validation: { ...record().validation, performedAt: '2026-09-01T00:00:00Z' },
      }),
    ]);
    const aws = matrix.find((t) => t.id === 'aws')!;
    expect(aws.stages.find((s) => s.stage === 'configured')!.evidenceRef).toBe('infra/aws/new.tf');
  });

  it('keeps every derived target sound', () => {
    expect(derivedMatrixIsSound()).toBe(true);
    expect(derivedMatrixIsSound(deriveMulticloudPortabilityMatrix([record()]))).toBe(true);
  });
});

describe('ingestion summary and registry', () => {
  it('ships an empty registry so no hyperscaler support is implied by default', () => {
    expect(MULTICLOUD_EVIDENCE_REGISTRY).toEqual([]);
    expect(loadMulticloudEvidenceRecords()).toEqual([]);
    const summary = summariseMulticloudIngestion();
    expect(summary.state).toBe('no-evidence-ingested');
    expect(summary.note).toMatch(/No validated multicloud artifacts/);
  });

  it('surfaces rejected records rather than hiding them', () => {
    const rejected = rejectedMulticloudEvidenceRecords([record({ artifacts: [] }), record()]);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reasons.length).toBeGreaterThan(0);
  });

  it('counts accepted, non-upgrading and rejected records separately', () => {
    const summary = summariseMulticloudIngestion([
      record(),
      record({ id: 'x', validation: { ...record().validation, status: 'failed' } }),
      { id: 'broken' },
    ]);
    expect(summary.acceptedRecords).toBe(2);
    expect(summary.nonUpgradingRecords).toBe(1);
    expect(summary.rejectedRecords).toBe(1);
    expect(summary.targetsWithEvidence).toBe(1);
    expect(summary.state).toBe('evidence-ingested');
  });
});

describe('ingestion CLI contract', () => {
  const cli = fs.readFileSync(path.resolve(process.cwd(), 'scripts/log-multicloud-evidence.mjs'), 'utf8');

  it('requires artifacts that exist on disk and hashes them', () => {
    expect(cli).toContain('artifact not found on disk');
    expect(cli).toContain("createHash('sha256')");
  });

  it('enforces the stage artifact requirements before writing', () => {
    expect(cli).toContain('STAGE_REQUIREMENTS');
    expect(cli).toContain('requires at least one artifact of');
  });

  it('treats evidence records as immutable and regenerates the registry', () => {
    expect(cli).toContain('records are immutable');
    expect(cli).toContain('MULTICLOUD_EVIDENCE_REGISTRY');
  });

  it('states that a non-passing validation changes nothing', () => {
    expect(cli).toContain('An attempt is not proof of portability.');
  });
});

describe('supervisor surface wiring', () => {
  const page = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/Supervisor.tsx'), 'utf8');

  it('renders the derived matrix rather than the static baseline', () => {
    expect(page).toContain('deriveMulticloudPortabilityMatrix');
    expect(page).not.toContain('PORTABILITY_MATRIX.map');
  });

  it('exposes the ingestion summary and rejected records', () => {
    expect(page).toContain('multicloud-ingestion');
    expect(page).toContain('summariseMulticloudIngestion');
    expect(page).toContain('rejectedMulticloudEvidenceRecords');
  });

  it('documents the ingestion entry point', () => {
    expect(page).toContain('scripts/log-multicloud-evidence.mjs');
  });
});
