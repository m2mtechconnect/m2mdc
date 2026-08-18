/**
 * Phase 3.4 - displayed evidence and exported evidence must resolve from the
 * exact same canonical record. Every export must carry the run id and the
 * evidence schema version.
 */
import { describe, expect, it } from 'vitest';
import type { CanonicalRun } from '../canonicalRun';
import {
  EVIDENCE_SCHEMA_VERSION,
  buildCanonicalEvidenceRecord,
  displayValue,
  evidenceToCsv,
  evidenceToHtml,
  evidenceToJson,
} from '../canonicalEvidence';

const run: CanonicalRun = {
  id: '3f6a1f1e-2f0f-4a3d-9a1b-8c7d6e5f4a3b',
  tenantId: 'tenant-a',
  twinId: 'twin-1',
  scenarioKey: 'cooling_degradation',
  scenarioName: 'Cooling degradation',
  scenarioType: 'operational',
  lifecycleStatus: 'succeeded',
  runIntent: 'authoritative',
  verificationLevel: 'server-validated',
  requestedProvider: 'aura-panel-summary',
  actualProvider: 'aura-panel-summary',
  providerVersion: '1.0.0',
  requestedExecutionClass: 'client',
  outcomeExecutionClass: 'client',
  seed: '42',
  prngVersion: 'mulberry32-v1',
  seedDerivationVersion: 'fnv1a-32-v1',
  canonicalSchemaVersion: 'aura-canonical-v1',
  inputHash: 'in-hash',
  configurationHash: 'cfg-hash',
  outputHash: 'out-hash',
  telemetrySnapshotId: null,
  telemetrySnapshotHash: null,
  externalJobId: null,
  failureCode: null,
  failureMessage: null,
  serverCreatedAt: '2026-01-01T00:00:00.000Z',
  startedAt: '2026-01-01T00:00:00.000Z',
  finishedAt: '2026-01-01T00:00:05.000Z',
  measuredDurationMs: 5000,
  createdByUserId: 'user-1',
  retryOfRunId: null,
  attempt: 1,
  baselineKpis: { pue: 1.4 },
  finalKpis: { pue: 1.3 },
  metricProvenance: {},
  recordCitation: 'simulation_runs:3f6a1f1e-2f0f-4a3d-9a1b-8c7d6e5f4a3b',
};

describe('canonical evidence parity', () => {
  const record = buildCanonicalEvidenceRecord(run);

  it('renders the canonical run id as the evidence identity', () => {
    expect(record.runId).toBe(run.id);
    expect(record.recordCitation).toBe(`simulation_runs:${run.id}`);
  });

  it('exports every displayed field with the identical value (CSV)', () => {
    const csv = evidenceToCsv(record);
    expect(csv).toContain(`# run_id=${run.id}`);
    expect(csv).toContain(`# evidence_schema_version=${EVIDENCE_SCHEMA_VERSION}`);
    for (const field of record.fields) {
      expect(csv).toContain(field.key);
      expect(csv).toContain(displayValue(field));
    }
  });

  it('exports every displayed field with the identical value (JSON)', () => {
    const parsed = JSON.parse(evidenceToJson(record)) as {
      runId: string;
      evidenceSchemaVersion: string;
      fields: { key: string; value: string | null }[];
    };
    expect(parsed.runId).toBe(run.id);
    expect(parsed.evidenceSchemaVersion).toBe(EVIDENCE_SCHEMA_VERSION);
    expect(parsed.fields).toEqual(
      record.fields.map((f) => ({ key: f.key, label: f.label, value: f.value })),
    );
  });

  it('exports every displayed field with the identical value (HTML/print)', () => {
    const html = evidenceToHtml(record);
    expect(html).toContain(`data-run-id="${run.id}"`);
    expect(html).toContain(`data-evidence-schema-version="${EVIDENCE_SCHEMA_VERSION}"`);
    for (const field of record.fields) {
      expect(html).toContain(`data-field="${field.key}"`);
    }
  });

  it('never fabricates evidence when no persisted run exists', () => {
    const empty = buildCanonicalEvidenceRecord(null);
    expect(empty.runId).toBeNull();
    expect(empty.fields).toHaveLength(0);
    expect(JSON.parse(evidenceToJson(empty)).runId).toBeNull();
  });
});