import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  LESSON_REGISTRY_VERSION,
  lessonById,
  verifyLessonRegistryIntegrity,
} from '../../supabase/functions/_shared/learning/lessonRegistry';
import { retrieveApprovedLessons } from '../../supabase/functions/_shared/learning/lessonRetrieval';
import { TRUTH_EVAL_CASES } from '../../supabase/functions/_shared/learning/truthEvalCases';
import { runTruthEvals } from '../../supabase/functions/_shared/learning/truthEvalRunner';

interface CleanupCandidate {
  id: string;
  disposition: string;
  deletionReady: boolean;
}

interface CleanupLedger {
  schemaVersion: string;
  auditedCommit: string;
  destructiveActionsAuthorized: boolean;
  requiredEvidence: string[];
  candidates: CleanupCandidate[];
}

const LEDGER = JSON.parse(
  readFileSync(
    path.resolve(__dirname, '../../docs/architecture/aura-cleanup-candidate-ledger-2026-09-03.json'),
    'utf8',
  ),
) as CleanupLedger;

describe('schema, dataset and cleanup governed learning', () => {
  const lessonIds = [
    'canonical-schema-lineage-before-aliases.v1',
    'retirement-needs-runtime-and-data-proof.v1',
    'dataset-lineage-source-to-provenance.v1',
  ];

  it('publishes the reviewed lesson-set revision with registry integrity', () => {
    expect(LESSON_REGISTRY_VERSION).toBe('2026-09-03.2');
    expect(verifyLessonRegistryIntegrity().ok).toBe(true);
    for (const id of lessonIds) {
      expect(lessonById(id)?.status).toBe('active');
      expect(lessonById(id)?.dataClass).toBe('reviewed-lesson');
    }
  });

  it('retrieves schema authority for duplicate table and relationship questions', () => {
    const result = retrieveApprovedLessons(
      'Should we add a duplicate table name with a nullable tenant key and no foreign key?',
    );
    expect(result.lessonIds).toContain('canonical-schema-lineage-before-aliases.v1');
  });

  it('retrieves deletion proof for old-code cleanup questions', () => {
    const result = retrieveApprovedLessons(
      'Delete old code, unreachable files, unused tables and orphan functions during cleanup',
    );
    expect(result.lessonIds).toContain('retirement-needs-runtime-and-data-proof.v1');
  });

  it('retrieves complete lineage for machine-learning dataset storage', () => {
    const result = retrieveApprovedLessons(
      'How should machine learning dataset chunks and embeddings store model provenance?',
    );
    expect(result.lessonIds).toContain('dataset-lineage-source-to-provenance.v1');
  });

  it('exercises all three lessons in the shared synthetic truth-evaluation runner', () => {
    const evalIds = [
      'lesson-canonical-schema-lineage-active',
      'lesson-retirement-runtime-data-proof-active',
      'lesson-dataset-lineage-active',
    ];
    const report = runTruthEvals();
    for (const id of evalIds) {
      expect(TRUTH_EVAL_CASES.find((testCase) => testCase.id === id)?.dataClass)
        .toBe('synthetic-evaluation-data');
      expect(report.results.find((result) => result.id === id)?.passed).toBe(true);
    }
  });

  it('keeps the exact-head cleanup ledger fail-closed', () => {
    expect(LEDGER.schemaVersion).toBe('aura.cleanup-candidate-ledger.v1');
    expect(LEDGER.auditedCommit).toBe('66e8053a191d0e6ec1c7fb018ad8ca5c0013a7d5');
    expect(LEDGER.destructiveActionsAuthorized).toBe(false);
    expect(LEDGER.requiredEvidence).toEqual(expect.arrayContaining([
      'production-observation-window',
      'stored-data-row-age-retention-and-tenant-profile',
      'rollback-and-export-plan',
    ]));
    expect(LEDGER.candidates.length).toBeGreaterThan(0);
    expect(LEDGER.candidates.every((candidate) => candidate.deletionReady === false)).toBe(true);
  });

  it('never treats applied migrations as cleanup candidates', () => {
    const migrations = LEDGER.candidates.find((candidate) => candidate.id === 'applied-migrations');
    expect(migrations?.disposition).toBe('keep');
    expect(migrations?.deletionReady).toBe(false);
  });
});
