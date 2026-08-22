/**
 * SF-6A — Simulation calibration evidence contract.
 *
 * This module does not calibrate a model. It defines the immutable evidence
 * package required before AURA may promote a simulation claim beyond
 * `not-calibrated`. Generic-facility calibration is intentionally separate
 * from NVIDIA-DSX-reference calibration.
 */

import type { SimulationCalibrationState } from './fidelity';
import type { SimulationExecutionClass } from './orchestrator/executionClass';
import type { VerificationLevel } from './orchestrator/types';

export const CALIBRATION_EVIDENCE_SCHEMA_VERSION = 'aura-calibration-evidence-v1' as const;

export const CALIBRATION_DOMAINS = [
  'thermal-airflow',
  'liquid-cooling',
  'electrical-power',
  'gpu-workload',
  'network-fabric',
  'facility-energy',
] as const;
export type CalibrationDomain = (typeof CALIBRATION_DOMAINS)[number];

export const CALIBRATION_CLAIM_SCOPES = [
  'generic-facility',
  'nvidia-dsx-reference',
] as const;
export type CalibrationClaimScope = (typeof CALIBRATION_CLAIM_SCOPES)[number];

export const CALIBRATION_OBSERVABLES = [
  'rack-inlet-temperature',
  'rack-outlet-temperature',
  'airflow-rate',
  'coolant-supply-temperature',
  'coolant-return-temperature',
  'coolant-flow-rate',
  'coolant-pressure-delta',
  'heat-removal',
  'it-power',
  'facility-power',
  'ups-runtime',
  'transfer-time',
  'gpu-utilization',
  'gpu-power',
  'workload-throughput',
  'network-latency',
  'network-throughput',
  'packet-loss',
  'pue',
] as const;
export type CalibrationObservable = (typeof CALIBRATION_OBSERVABLES)[number];

export const CALIBRATION_STATISTICS = [
  'mae',
  'rmse',
  'mape',
  'bias',
  'max-abs-error',
  'r2',
] as const;
export type CalibrationStatistic = (typeof CALIBRATION_STATISTICS)[number];

const CALIBRATION_TARGET_STATES = [
  'benchmarked',
  'calibrated',
  'externally-validated',
] as const;
export type CalibrationTargetState = (typeof CALIBRATION_TARGET_STATES)[number];

const ARTIFACT_KINDS = [
  'reference-data',
  'model-input',
  'model-output',
  'validation-report',
  'runtime-log',
  'usd-stage',
  'asset-manifest',
  'semantic-bindings',
  'source-map',
  'independent-review',
] as const;
const DATASET_SOURCE_TYPES = [
  'measured-facility',
  'vendor-benchmark',
  'standards-benchmark',
  'solver-cross-check',
] as const;
const DATASET_SPLITS = ['calibration', 'validation', 'independent-validation'] as const;
const VERIFICATION_LEVELS = [
  'unverified',
  'self-reported',
  'server-validated',
  'externally-validated',
] as const;
const RUNTIME_ENVIRONMENTS = ['browser', 'server', 'worker', 'external'] as const;
const EXTERNAL_RUNTIME_CLASSES = ['external-solver', 'nvidia-solver'] as const;
const DSX_GATES = ['rack', 'facility', 'full-reference'] as const;

export interface CalibrationArtifactRef {
  uri: string;
  sha256: string;
  kind: (typeof ARTIFACT_KINDS)[number];
}

export interface CalibrationReferenceDataset {
  id: string;
  sourceName: string;
  sourceType: (typeof DATASET_SOURCE_TYPES)[number];
  split: (typeof DATASET_SPLITS)[number];
  artifact: CalibrationArtifactRef;
  observables: CalibrationObservable[];
  rightsConfirmed: boolean;
  observedAt?: string;
}

export interface CalibrationAcceptanceCriterion {
  observable: CalibrationObservable;
  statistic: CalibrationStatistic;
  operator: 'lte' | 'gte';
  threshold: number;
  observed: number;
  unit?: string;
  rationale: string;
}

export interface CalibrationReproducibilityEvidence {
  modelVersion: string;
  engineModule: string;
  command: string;
  inputHash: string;
  configurationHash: string;
  outputHash: string;
  seed: number | null;
  runtimeEnvironment: (typeof RUNTIME_ENVIRONMENTS)[number];
  toolchainVersions: Record<string, string>;
  hardwareProfile?: string;
}

export interface DsxCalibrationContext {
  blueprintGate: (typeof DSX_GATES)[number];
  exactRoleCoverageComplete: boolean;
  usdStageSha256: string;
  assetManifestSha256: string;
  semanticBindingsSha256: string;
  sourceMapSha256: string;
}

export interface CalibrationRuntimeEvidence {
  executionClass: Extract<SimulationExecutionClass, 'external-solver' | 'nvidia-solver'>;
  providerId: string;
  runtimeVersion: string;
  externalJobId: string;
  nvidiaIntegrated: boolean;
  artifacts: CalibrationArtifactRef[];
}

export interface IndependentCalibrationReview {
  verifier: string;
  organization?: string;
  reviewedAt: string;
  report: CalibrationArtifactRef;
}

export interface CalibrationEvidencePackage {
  schemaVersion: typeof CALIBRATION_EVIDENCE_SCHEMA_VERSION;
  id: string;
  domain: CalibrationDomain;
  claimScope: CalibrationClaimScope;
  targetState: CalibrationTargetState;
  claimedObservables: CalibrationObservable[];
  modelVersion: string;
  facilityBaselineComplete: boolean;
  usesFallbackDefaults: boolean;
  verificationLevel: VerificationLevel;
  datasets: CalibrationReferenceDataset[];
  acceptanceCriteria: CalibrationAcceptanceCriterion[];
  reproducibility: CalibrationReproducibilityEvidence;
  artifacts: CalibrationArtifactRef[];
  dsxContext?: DsxCalibrationContext;
  runtimeEvidence?: CalibrationRuntimeEvidence;
  independentReview?: IndependentCalibrationReview;
}

export interface CalibrationEvidenceDecision {
  valid: boolean;
  eligibleState: SimulationCalibrationState;
  dsxReferenceEligible: boolean;
  nvidiaRuntimeEligible: boolean;
  passedCriteria: number;
  totalCriteria: number;
  reasons: string[];
}

const SHA256_RE = /^sha256:[a-f0-9]{64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOneOf<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
): value is T[number] {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && SHA256_RE.test(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateArtifact(ref: unknown, label: string, reasons: string[]): boolean {
  if (!isRecord(ref)) {
    reasons.push(`${label} is missing.`);
    return false;
  }
  let valid = true;
  if (!nonEmpty(ref.uri)) {
    reasons.push(`${label} is missing a durable URI/path.`);
    valid = false;
  }
  if (!isSha256(ref.sha256)) {
    reasons.push(`${label} is missing a full SHA-256 digest.`);
    valid = false;
  }
  if (!isOneOf(ref.kind, ARTIFACT_KINDS)) {
    reasons.push(`${label} has an unknown artifact kind.`);
    valid = false;
  }
  return valid;
}

function criterionPasses(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (!Number.isFinite(value.threshold) || !Number.isFinite(value.observed)) return false;
  if (value.operator === 'lte') return (value.observed as number) <= (value.threshold as number);
  if (value.operator === 'gte') return (value.observed as number) >= (value.threshold as number);
  return false;
}

/**
 * Public input is `unknown` intentionally: evidence JSON is external input and
 * malformed shapes must reject cleanly rather than throw.
 */
export function assessCalibrationEvidence(pkg: unknown): CalibrationEvidenceDecision {
  const reasons: string[] = [];
  const raw = isRecord(pkg) ? pkg : {};

  if (raw.schemaVersion !== CALIBRATION_EVIDENCE_SCHEMA_VERSION) {
    reasons.push(`Calibration evidence schema must be ${CALIBRATION_EVIDENCE_SCHEMA_VERSION}.`);
  }
  if (!nonEmpty(raw.id)) reasons.push('Calibration package id is required.');
  if (!isOneOf(raw.domain, CALIBRATION_DOMAINS)) reasons.push('Calibration domain is missing or unknown.');
  if (!isOneOf(raw.claimScope, CALIBRATION_CLAIM_SCOPES)) reasons.push('Calibration claim scope is missing or unknown.');
  if (!isOneOf(raw.targetState, CALIBRATION_TARGET_STATES)) reasons.push('Calibration target state is missing or unknown.');
  if (!nonEmpty(raw.modelVersion)) reasons.push('Model version is required.');
  if (raw.facilityBaselineComplete !== true) reasons.push('A complete facility/twin baseline is required.');
  if (raw.usesFallbackDefaults !== false) reasons.push('Fallback/default material inputs block calibration promotion.');
  if (!isOneOf(raw.verificationLevel, VERIFICATION_LEVELS)) {
    reasons.push('Verification level is missing or unknown.');
  } else if (raw.verificationLevel === 'unverified') {
    reasons.push('Verification level must be stronger than unverified.');
  }

  const claimedRaw = Array.isArray(raw.claimedObservables) ? raw.claimedObservables : [];
  if (!Array.isArray(raw.claimedObservables)) reasons.push('claimedObservables must be an array.');
  const claimed = new Set<CalibrationObservable>();
  for (const observable of claimedRaw) {
    if (isOneOf(observable, CALIBRATION_OBSERVABLES)) claimed.add(observable);
    else reasons.push(`Unknown claimed observable: ${String(observable)}.`);
  }
  if (claimed.size === 0) reasons.push('At least one claimed observable is required.');

  const datasets = Array.isArray(raw.datasets) ? raw.datasets : [];
  if (!Array.isArray(raw.datasets)) reasons.push('datasets must be an array.');
  if (datasets.length === 0) reasons.push('At least one traceable reference dataset is required.');
  const calibrationDatasets: Record<string, unknown>[] = [];
  const validationDatasets: Record<string, unknown>[] = [];

  for (const value of datasets) {
    if (!isRecord(value)) {
      reasons.push('Every reference dataset must be an object.');
      continue;
    }
    const id = nonEmpty(value.id) ? value.id : '<unknown>';
    if (!nonEmpty(value.id)) reasons.push('Every reference dataset requires an id.');
    if (!nonEmpty(value.sourceName)) reasons.push(`Dataset ${id} requires a source name.`);
    if (!isOneOf(value.sourceType, DATASET_SOURCE_TYPES)) reasons.push(`Dataset ${id} has an unknown sourceType.`);
    if (!isOneOf(value.split, DATASET_SPLITS)) {
      reasons.push(`Dataset ${id} has an unknown split.`);
    } else if (value.split === 'calibration') {
      calibrationDatasets.push(value);
    } else {
      validationDatasets.push(value);
    }
    if (value.rightsConfirmed !== true) reasons.push(`Dataset ${id} has unconfirmed data-use rights.`);
    validateArtifact(value.artifact, `Dataset ${id} artifact`, reasons);
    const observables = Array.isArray(value.observables) ? value.observables : [];
    if (!Array.isArray(value.observables)) reasons.push(`Dataset ${id} observables must be an array.`);
    for (const observable of observables) {
      if (!isOneOf(observable, CALIBRATION_OBSERVABLES)) {
        reasons.push(`Dataset ${id} contains unknown observable: ${String(observable)}.`);
      }
    }
  }

  const criteria = Array.isArray(raw.acceptanceCriteria) ? raw.acceptanceCriteria : [];
  if (!Array.isArray(raw.acceptanceCriteria)) reasons.push('acceptanceCriteria must be an array.');
  if (criteria.length === 0) reasons.push('At least one quantitative acceptance criterion is required.');

  for (const value of criteria) {
    if (!isRecord(value)) {
      reasons.push('Every acceptance criterion must be an object.');
      continue;
    }
    if (!isOneOf(value.observable, CALIBRATION_OBSERVABLES)) {
      reasons.push(`Acceptance criterion has unknown observable: ${String(value.observable)}.`);
    }
    if (!isOneOf(value.statistic, CALIBRATION_STATISTICS)) {
      reasons.push(`Acceptance criterion for ${String(value.observable)} has an unknown statistic.`);
    }
    if (!isOneOf(value.operator, ['lte', 'gte'] as const)) {
      reasons.push(`Acceptance criterion for ${String(value.observable)} has an unknown operator.`);
    }
    if (!Number.isFinite(value.threshold)) reasons.push(`Acceptance criterion for ${String(value.observable)} requires a finite threshold.`);
    if (!Number.isFinite(value.observed)) reasons.push(`Acceptance criterion for ${String(value.observable)} requires a finite observed value.`);
    if (!nonEmpty(value.rationale)) reasons.push(`Acceptance criterion for ${String(value.observable)} requires a threshold rationale.`);
  }

  for (const observable of claimed) {
    if (!criteria.some((criterion) => isRecord(criterion) && criterion.observable === observable)) {
      reasons.push(`Claimed observable ${observable} has no acceptance criterion.`);
    }
    if (!datasets.some((dataset) => isRecord(dataset) && Array.isArray(dataset.observables) && dataset.observables.includes(observable))) {
      reasons.push(`Claimed observable ${observable} is absent from reference datasets.`);
    }
  }

  const passedCriteria = criteria.filter(criterionPasses).length;
  if (passedCriteria !== criteria.length) {
    reasons.push(`${criteria.length - passedCriteria} acceptance criterion/criteria did not pass.`);
  }

  if (!isRecord(raw.reproducibility)) {
    reasons.push('Reproducibility evidence is required.');
  } else {
    const repro = raw.reproducibility;
    if (!nonEmpty(repro.modelVersion) || repro.modelVersion !== raw.modelVersion) reasons.push('Reproducibility modelVersion must match the package modelVersion.');
    if (!nonEmpty(repro.engineModule)) reasons.push('Reproducibility engineModule is required.');
    if (!nonEmpty(repro.command)) reasons.push('Reproduction command is required.');
    if (!isSha256(repro.inputHash)) reasons.push('Reproducibility inputHash must be a full SHA-256 digest.');
    if (!isSha256(repro.configurationHash)) reasons.push('Reproducibility configurationHash must be a full SHA-256 digest.');
    if (!isSha256(repro.outputHash)) reasons.push('Reproducibility outputHash must be a full SHA-256 digest.');
    if (!isOneOf(repro.runtimeEnvironment, RUNTIME_ENVIRONMENTS)) reasons.push('Reproducibility runtimeEnvironment is missing or unknown.');
    if (!isRecord(repro.toolchainVersions) || Object.keys(repro.toolchainVersions).length === 0) {
      reasons.push('At least one toolchain/runtime version is required.');
    } else if (Object.values(repro.toolchainVersions).some((version) => !nonEmpty(version))) {
      reasons.push('Toolchain/runtime versions must be non-empty strings.');
    }
    if (repro.seed !== null && !Number.isFinite(repro.seed)) reasons.push('Reproducibility seed must be a finite number or null.');
  }

  const artifacts = Array.isArray(raw.artifacts) ? raw.artifacts : [];
  if (!Array.isArray(raw.artifacts)) reasons.push('artifacts must be an array.');
  artifacts.forEach((artifact, index) => validateArtifact(artifact, `Artifact ${index + 1}`, reasons));

  if (raw.targetState === 'calibrated' || raw.targetState === 'externally-validated') {
    if (calibrationDatasets.length === 0) reasons.push('Calibrated promotion requires a calibration dataset.');
    if (validationDatasets.length === 0) reasons.push('Calibrated promotion requires a distinct holdout/validation dataset.');
    const calibrationDigests = new Set(
      calibrationDatasets
        .map((dataset) => (isRecord(dataset.artifact) ? dataset.artifact.sha256 : undefined))
        .filter(isSha256),
    );
    if (validationDatasets.some((dataset) => isRecord(dataset.artifact) && isSha256(dataset.artifact.sha256) && calibrationDigests.has(dataset.artifact.sha256))) {
      reasons.push('Calibration and validation datasets must be independently hashed datasets.');
    }
  }

  let dsxReferenceEligible = false;
  if (raw.claimScope === 'nvidia-dsx-reference') {
    if (!isRecord(raw.dsxContext)) {
      reasons.push('NVIDIA DSX reference claims require DSX asset/OpenUSD evidence context.');
    } else {
      const dsx = raw.dsxContext;
      if (!isOneOf(dsx.blueprintGate, DSX_GATES)) reasons.push('DSX context requires a valid blueprint gate.');
      if (dsx.exactRoleCoverageComplete !== true) reasons.push('NVIDIA DSX reference claims require complete exact-role coverage for the declared gate.');
      for (const [label, digest] of [
        ['USD stage', dsx.usdStageSha256],
        ['asset manifest', dsx.assetManifestSha256],
        ['semantic bindings', dsx.semanticBindingsSha256],
        ['source map', dsx.sourceMapSha256],
      ] as const) {
        if (!isSha256(digest)) reasons.push(`DSX ${label} requires a full SHA-256 digest.`);
      }
      dsxReferenceEligible =
        isOneOf(dsx.blueprintGate, DSX_GATES) &&
        dsx.exactRoleCoverageComplete === true &&
        isSha256(dsx.usdStageSha256) &&
        isSha256(dsx.assetManifestSha256) &&
        isSha256(dsx.semanticBindingsSha256) &&
        isSha256(dsx.sourceMapSha256);
    }
  }

  let nvidiaRuntimeEligible = false;
  if (raw.runtimeEvidence !== undefined) {
    if (!isRecord(raw.runtimeEvidence)) {
      reasons.push('Runtime evidence must be an object.');
    } else {
      const runtime = raw.runtimeEvidence;
      if (!isOneOf(runtime.executionClass, EXTERNAL_RUNTIME_CLASSES)) reasons.push('Runtime evidence requires external-solver or nvidia-solver executionClass.');
      if (!nonEmpty(runtime.providerId)) reasons.push('Runtime evidence requires providerId.');
      if (!nonEmpty(runtime.runtimeVersion)) reasons.push('Runtime evidence requires runtimeVersion.');
      if (!nonEmpty(runtime.externalJobId)) reasons.push('Runtime evidence requires externalJobId.');
      const runtimeArtifacts = Array.isArray(runtime.artifacts) ? runtime.artifacts : [];
      if (!Array.isArray(runtime.artifacts)) reasons.push('Runtime evidence artifacts must be an array.');
      if (runtimeArtifacts.length === 0) reasons.push('Runtime evidence requires at least one immutable runtime artifact.');
      const artifactsValid = runtimeArtifacts.every((artifact, index) => validateArtifact(artifact, `Runtime artifact ${index + 1}`, reasons));
      nvidiaRuntimeEligible =
        runtime.executionClass === 'nvidia-solver' &&
        runtime.nvidiaIntegrated === true &&
        nonEmpty(runtime.providerId) &&
        nonEmpty(runtime.runtimeVersion) &&
        nonEmpty(runtime.externalJobId) &&
        runtimeArtifacts.length > 0 &&
        artifactsValid;
    }
  }

  if (raw.targetState === 'externally-validated') {
    if (raw.verificationLevel !== 'externally-validated') reasons.push('Externally validated calibration requires verificationLevel=externally-validated.');
    if (!isRecord(raw.independentReview)) {
      reasons.push('Externally validated calibration requires an independent review artifact.');
    } else {
      const review = raw.independentReview;
      if (!nonEmpty(review.verifier)) reasons.push('Independent review requires verifier identity.');
      if (!nonEmpty(review.reviewedAt)) reasons.push('Independent review requires reviewedAt.');
      validateArtifact(review.report, 'Independent review report', reasons);
    }
    if (!validationDatasets.some((dataset) => dataset.split === 'independent-validation')) {
      reasons.push('Externally validated calibration requires an independent-validation dataset split.');
    }
  }

  const targetState: SimulationCalibrationState = isOneOf(raw.targetState, CALIBRATION_TARGET_STATES)
    ? raw.targetState
    : 'not-calibrated';
  const valid = reasons.length === 0;

  return {
    valid,
    eligibleState: valid ? targetState : 'not-calibrated',
    dsxReferenceEligible: valid && raw.claimScope === 'nvidia-dsx-reference' && dsxReferenceEligible,
    nvidiaRuntimeEligible: valid && nvidiaRuntimeEligible,
    passedCriteria,
    totalCriteria: criteria.length,
    reasons,
  };
}
