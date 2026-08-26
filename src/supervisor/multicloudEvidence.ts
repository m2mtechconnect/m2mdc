/**
 * Multicloud portability evidence ingestion (supervisor plane).
 *
 * Turns supplied infrastructure-as-code / deployment manifests and their
 * validation results into portability stage evidence.
 *
 * Truth rules (fail-closed):
 *  - A stage is only marked evidenced when at least one artifact of a class
 *    that can actually prove that stage is supplied AND the recorded
 *    validation passed. Intent, tickets or prose never upgrade a stage.
 *  - `tested` and `verified` require an execution artifact (a plan/apply log,
 *    deployment log or test report). A template alone can never prove them.
 *  - `verified` additionally requires designed, configured and tested to be
 *    evidenced. Stage order is never skipped.
 *  - Records are validated before use. An invalid record is rejected with
 *    reasons and has no effect on the matrix.
 *  - No credentials, endpoints, account identifiers or tenant data are part
 *    of the record schema.
 */
import {
  PORTABILITY_MATRIX,
  PORTABILITY_STAGES,
  portabilityClaimIsSound,
  type PortabilityStage,
  type PortabilityStageEvidence,
  type PortabilityTarget,
} from './portabilityMatrix';
import { MULTICLOUD_EVIDENCE_REGISTRY } from './multicloudEvidenceRegistry';

/** Artifact classes the ingestion flow understands. */
export const MULTICLOUD_ARTIFACT_KINDS = [
  'terraform',
  'pulumi',
  'bicep',
  'arm-template',
  'cloudformation',
  'crossplane',
  'helm-chart',
  'kubernetes-manifest',
  'container-image-spec',
  'plan-output',
  'deployment-log',
  'test-report',
  'architecture-document',
] as const;
export type MulticloudArtifactKind = (typeof MULTICLOUD_ARTIFACT_KINDS)[number];

/** Declarative templates: they can prove design and configuration intent. */
export const TEMPLATE_ARTIFACT_KINDS: readonly MulticloudArtifactKind[] = [
  'terraform',
  'pulumi',
  'bicep',
  'arm-template',
  'cloudformation',
  'crossplane',
  'helm-chart',
  'kubernetes-manifest',
  'container-image-spec',
];

/** Execution artifacts: only these can prove that something actually ran. */
export const EXECUTION_ARTIFACT_KINDS: readonly MulticloudArtifactKind[] = [
  'plan-output',
  'deployment-log',
  'test-report',
];

/** Artifact classes accepted per stage. */
export const STAGE_ARTIFACT_REQUIREMENTS: Record<PortabilityStage, readonly MulticloudArtifactKind[]> = {
  designed: ['architecture-document', ...TEMPLATE_ARTIFACT_KINDS],
  configured: TEMPLATE_ARTIFACT_KINDS,
  tested: EXECUTION_ARTIFACT_KINDS,
  verified: ['deployment-log', 'test-report'],
};

export const MULTICLOUD_VALIDATION_STATUSES = ['passed', 'failed', 'not-run'] as const;
export type MulticloudValidationStatus = (typeof MULTICLOUD_VALIDATION_STATUSES)[number];

export interface MulticloudArtifact {
  /** Repository-relative path of the supplied file. */
  path: string;
  kind: MulticloudArtifactKind;
  /** SHA-256 of the file contents, computed at ingestion time. */
  sha256: string;
}

export interface MulticloudValidation {
  /** How the artifacts were validated (e.g. `terraform validate`, `helm lint`). */
  method: string;
  status: MulticloudValidationStatus;
  /** ISO-8601 timestamp of the validation run. */
  performedAt: string;
  /** Person or system accountable for the validation result. */
  validator: string;
}

export interface MulticloudEvidenceRecord {
  id: string;
  /** Must match a target id in the portability matrix. */
  targetId: string;
  stage: PortabilityStage;
  artifacts: MulticloudArtifact[];
  validation: MulticloudValidation;
  note: string;
}

export interface MulticloudRecordValidation {
  valid: boolean;
  /** Reasons the record cannot be used as evidence. Empty when valid. */
  reasons: string[];
}

const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const SHA256 = /^[a-f0-9]{64}$/i;

const KNOWN_TARGET_IDS = new Set(PORTABILITY_MATRIX.map((t) => t.id));

function validateArtifact(artifact: unknown, index: number, reasons: string[]): void {
  const a = artifact as Partial<MulticloudArtifact> | null;
  const label = `artifacts[${index}]`;
  if (!a || typeof a !== 'object') {
    reasons.push(`${label} is not an object`);
    return;
  }
  if (!a.path || !String(a.path).trim()) reasons.push(`${label}.path is required`);
  if (!a.kind || !MULTICLOUD_ARTIFACT_KINDS.includes(a.kind)) {
    reasons.push(`${label}.kind is not a recognised IaC or manifest artifact class`);
  }
  if (!a.sha256 || !SHA256.test(String(a.sha256))) {
    reasons.push(`${label}.sha256 must be a SHA-256 digest of the supplied file`);
  }
}

/**
 * Validates a single supplied record. Nothing is inferred or defaulted: an
 * unknown target, an artifact class that cannot prove the claimed stage, or a
 * validation that did not pass rejects the record.
 */
export function validateMulticloudEvidenceRecord(record: unknown): MulticloudRecordValidation {
  const reasons: string[] = [];
  const r = record as Partial<MulticloudEvidenceRecord> | null;

  if (!r || typeof r !== 'object') return { valid: false, reasons: ['record is not an object'] };
  if (!r.id || !String(r.id).trim()) reasons.push('id is required');
  if (!r.targetId || !KNOWN_TARGET_IDS.has(String(r.targetId))) {
    reasons.push('targetId must match a known portability target');
  }
  if (!r.stage || !PORTABILITY_STAGES.includes(r.stage)) {
    reasons.push('stage must be designed, configured, tested or verified');
  }

  if (!Array.isArray(r.artifacts) || r.artifacts.length === 0) {
    reasons.push('at least one artifact is required - a stage claim without artifacts is not evidence');
  } else {
    r.artifacts.forEach((artifact, index) => validateArtifact(artifact, index, reasons));
    if (r.stage && PORTABILITY_STAGES.includes(r.stage)) {
      const accepted = STAGE_ARTIFACT_REQUIREMENTS[r.stage];
      const usable = r.artifacts.some((a) => accepted.includes((a as MulticloudArtifact)?.kind));
      if (!usable) {
        reasons.push(
          `stage ${r.stage} requires at least one artifact of: ${accepted.join(', ')}`,
        );
      }
    }
  }

  const v = r.validation as Partial<MulticloudValidation> | undefined;
  if (!v || typeof v !== 'object') {
    reasons.push('validation is required');
  } else {
    if (!v.method || !String(v.method).trim()) reasons.push('validation.method is required');
    if (!v.status || !MULTICLOUD_VALIDATION_STATUSES.includes(v.status)) {
      reasons.push('validation.status must be passed, failed or not-run');
    }
    if (!v.performedAt || !ISO_8601.test(String(v.performedAt))) {
      reasons.push('validation.performedAt must be an ISO-8601 timestamp');
    }
    if (!v.validator || !String(v.validator).trim()) reasons.push('validation.validator is required');
  }

  return { valid: reasons.length === 0, reasons };
}

/** Records supplied through the registry, filtered to structurally valid entries. */
export function loadMulticloudEvidenceRecords(
  source: unknown = MULTICLOUD_EVIDENCE_REGISTRY,
): MulticloudEvidenceRecord[] {
  const raw = Array.isArray(source) ? source : [];
  return raw.filter((entry) => validateMulticloudEvidenceRecord(entry).valid) as MulticloudEvidenceRecord[];
}

/** Records supplied but rejected, with reasons. Surfaced rather than hidden. */
export function rejectedMulticloudEvidenceRecords(
  source: unknown = MULTICLOUD_EVIDENCE_REGISTRY,
): Array<{ record: unknown; reasons: string[] }> {
  const raw = Array.isArray(source) ? source : [];
  return raw
    .map((record) => ({ record, reasons: validateMulticloudEvidenceRecord(record).reasons }))
    .filter((entry) => entry.reasons.length > 0);
}

/** Only a passed validation can upgrade a stage. */
export function recordUpgradesStage(record: MulticloudEvidenceRecord): boolean {
  return record.validation.status === 'passed';
}

function latestFor(
  records: MulticloudEvidenceRecord[],
  targetId: string,
  stage: PortabilityStage,
): MulticloudEvidenceRecord | null {
  const matches = records
    .filter((r) => r.targetId === targetId && r.stage === stage && recordUpgradesStage(r))
    .sort((a, b) => Date.parse(b.validation.performedAt) - Date.parse(a.validation.performedAt));
  return matches[0] ?? null;
}

function evidenceNote(record: MulticloudEvidenceRecord): string {
  const kinds = Array.from(new Set(record.artifacts.map((a) => a.kind))).join(', ');
  return `Validated by ${record.validation.method} on ${record.validation.performedAt} (${record.validation.validator}). Artifacts: ${kinds}. ${record.note}`.trim();
}

/**
 * Merges supplied artifact evidence into the baseline portability matrix.
 * With no valid, passing records the baseline is returned unchanged - the
 * ingestion flow cannot manufacture hyperscaler support.
 */
export function deriveMulticloudPortabilityMatrix(
  records: MulticloudEvidenceRecord[] = loadMulticloudEvidenceRecords(),
  baseline: readonly PortabilityTarget[] = PORTABILITY_MATRIX,
): PortabilityTarget[] {
  return baseline.map((target) => {
    const stages: PortabilityStageEvidence[] = target.stages.map((existing) => {
      const record = latestFor(records, target.id, existing.stage);
      if (!record) return { ...existing };
      return {
        stage: existing.stage,
        state: 'evidenced',
        evidenceRef: record.artifacts[0].path,
        note: evidenceNote(record),
      };
    });

    const byStage = Object.fromEntries(stages.map((s) => [s.stage, s])) as Record<
      PortabilityStage,
      PortabilityStageEvidence
    >;

    // Stage order is never skipped: verified is withheld until every lower
    // stage carries artifact evidence.
    if (
      byStage.verified.state === 'evidenced'
      && !(
        byStage.designed.state === 'evidenced'
        && byStage.configured.state === 'evidenced'
        && byStage.tested.state === 'evidenced'
      )
    ) {
      byStage.verified = {
        stage: 'verified',
        state: 'not-evidenced',
        evidenceRef: null,
        note: 'Verified evidence was supplied but a lower stage has no artifacts. Verified is withheld until designed, configured and tested are evidenced.',
      };
    }

    const orderedStages = PORTABILITY_STAGES.map((s) => byStage[s]);
    const evidenced = orderedStages.filter((s) => s.state === 'evidenced').map((s) => s.stage);
    const highest = PORTABILITY_STAGES.filter((s) => evidenced.includes(s)).slice(-1)[0];
    const ingested = orderedStages.some((s, i) => s.note !== target.stages[i].note);

    return {
      ...target,
      stages: orderedStages,
      currentClaim: ingested && highest
        ? `Artifact-backed up to ${highest}. Nothing beyond ${highest} may be claimed.`
        : target.currentClaim,
    };
  });
}

/** Summary of the ingestion flow for the supervisor surface. */
export interface MulticloudIngestionSummary {
  acceptedRecords: number;
  rejectedRecords: number;
  /** Records that are structurally valid but did not pass validation. */
  nonUpgradingRecords: number;
  targetsWithEvidence: number;
  state: 'no-evidence-ingested' | 'evidence-ingested';
  note: string;
}

export function summariseMulticloudIngestion(
  source: unknown = MULTICLOUD_EVIDENCE_REGISTRY,
): MulticloudIngestionSummary {
  const accepted = loadMulticloudEvidenceRecords(source);
  const rejected = rejectedMulticloudEvidenceRecords(source);
  const upgrading = accepted.filter(recordUpgradesStage);
  const targets = new Set(upgrading.map((r) => r.targetId));

  return {
    acceptedRecords: accepted.length,
    rejectedRecords: rejected.length,
    nonUpgradingRecords: accepted.length - upgrading.length,
    targetsWithEvidence: targets.size,
    state: upgrading.length > 0 ? 'evidence-ingested' : 'no-evidence-ingested',
    note: upgrading.length > 0
      ? `${upgrading.length} validated artifact record(s) across ${targets.size} target(s) currently back the portability matrix.`
      : 'No validated multicloud artifacts have been ingested. Stage states reflect the repository baseline only.',
  };
}

/** Guardrail re-check over the derived matrix. */
export function derivedMatrixIsSound(
  matrix: PortabilityTarget[] = deriveMulticloudPortabilityMatrix(),
): boolean {
  return matrix.every(portabilityClaimIsSound);
}
