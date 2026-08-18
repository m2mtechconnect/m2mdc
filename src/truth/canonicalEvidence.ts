/**
 * Phase 3 - the one canonical evidence record.
 *
 * The evidence page renders this record and every export (CSV, JSON, HTML,
 * print) is serialized from the same object, so displayed evidence and
 * exported evidence can never disagree. A parity test asserts this.
 */
import type { CanonicalRun } from './canonicalRun';
import { RUN_UNAVAILABLE, verificationLabel } from './canonicalRun';

export const EVIDENCE_SCHEMA_VERSION = 'aura-evidence-v1';

export interface EvidenceField {
  key: string;
  label: string;
  /** null means the platform cannot evidence this field. */
  value: string | null;
}

export interface CanonicalEvidenceRecord {
  evidenceSchemaVersion: typeof EVIDENCE_SCHEMA_VERSION;
  /** `simulation_runs.id`, or null when no persisted run exists. */
  runId: string | null;
  recordCitation: string | null;
  fields: EvidenceField[];
}

/** Value or the honest unavailable marker - never a fabricated default. */
function present(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
}

export function buildCanonicalEvidenceRecord(
  run: CanonicalRun | null,
): CanonicalEvidenceRecord {
  if (!run) {
    return {
      evidenceSchemaVersion: EVIDENCE_SCHEMA_VERSION,
      runId: null,
      recordCitation: null,
      fields: [],
    };
  }
  const fields: EvidenceField[] = [
    { key: 'run_id', label: 'Run ID', value: run.id },
    { key: 'requested_provider', label: 'Requested provider', value: present(run.requestedProvider) },
    { key: 'actual_provider', label: 'Actual provider', value: present(run.actualProvider) },
    { key: 'provider_version', label: 'Provider version', value: present(run.providerVersion) },
    {
      key: 'execution_class',
      label: 'Execution class',
      value: present(run.outcomeExecutionClass ?? run.requestedExecutionClass),
    },
    {
      key: 'run_intent',
      label: 'Preview or authoritative',
      value: run.runIntent === 'authoritative' ? 'Authoritative' : 'Preview',
    },
    { key: 'verification_level', label: 'Verification level', value: verificationLabel(run) },
    { key: 'lifecycle_status', label: 'Lifecycle status', value: run.lifecycleStatus },
    { key: 'source_freshness', label: 'Source freshness', value: present(run.finishedAt ?? run.startedAt) },
    { key: 'input_hash', label: 'Input hash', value: present(run.inputHash) },
    { key: 'configuration_hash', label: 'Configuration hash', value: present(run.configurationHash) },
    { key: 'output_hash', label: 'Output hash', value: present(run.outputHash) },
    { key: 'telemetry_snapshot_id', label: 'Telemetry snapshot', value: present(run.telemetrySnapshotId) },
    { key: 'telemetry_snapshot_hash', label: 'Telemetry snapshot hash', value: present(run.telemetrySnapshotHash) },
    { key: 'external_job_id', label: 'External job / session', value: present(run.externalJobId) },
    {
      key: 'failure_reason',
      label: 'Failure / unavailable reason',
      value: run.failureCode ? `${run.failureCode}: ${run.failureMessage ?? ''}`.trim() : null,
    },
    {
      key: 'backend_gpu_validation',
      label: 'Backend / GPU validation',
      value: run.verificationLevel === 'server-validated' ? 'Server-validated' : null,
    },
    { key: 'canonical_schema_version', label: 'Canonical schema version', value: present(run.canonicalSchemaVersion) },
    { key: 'record_citation', label: 'Record', value: run.recordCitation },
  ];
  return {
    evidenceSchemaVersion: EVIDENCE_SCHEMA_VERSION,
    runId: run.id,
    recordCitation: run.recordCitation,
    fields,
  };
}

/** Display text for one field; unavailable is stated, not hidden. */
export function displayValue(field: EvidenceField): string {
  return field.value ?? RUN_UNAVAILABLE;
}

export function evidenceToJson(record: CanonicalEvidenceRecord): string {
  return JSON.stringify(
    {
      evidenceSchemaVersion: record.evidenceSchemaVersion,
      runId: record.runId,
      recordCitation: record.recordCitation,
      fields: record.fields.map((f) => ({ key: f.key, label: f.label, value: f.value })),
    },
    null,
    2,
  );
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function evidenceToCsv(record: CanonicalEvidenceRecord): string {
  const head = [
    `# evidence_schema_version=${record.evidenceSchemaVersion}`,
    `# run_id=${record.runId ?? RUN_UNAVAILABLE}`,
    'key,label,value',
  ];
  const rows = record.fields.map((f) =>
    [f.key, f.label, displayValue(f)].map(csvCell).join(','),
  );
  return [...head, ...rows].join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function evidenceToHtml(record: CanonicalEvidenceRecord): string {
  const rows = record.fields
    .map(
      (f) =>
        `<tr><th scope="row">${escapeHtml(f.label)}</th><td data-field="${escapeHtml(
          f.key,
        )}">${escapeHtml(displayValue(f))}</td></tr>`,
    )
    .join('');
  return [
    `<section data-evidence-schema-version="${record.evidenceSchemaVersion}" data-run-id="${escapeHtml(
      record.runId ?? RUN_UNAVAILABLE,
    )}">`,
    '<table><tbody>',
    rows,
    '</tbody></table></section>',
  ].join('');
}

export const EVIDENCE_EMPTY_STATE =
  'No persisted simulation run is available for this facility, so there is no evidence to show. Run a simulation to create a canonical record.';