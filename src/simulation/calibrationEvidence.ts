/**
 * SF-6A — Simulation calibration evidence contract.
 *
 * This module does not calibrate a model. It defines the immutable evidence
 * package required before AURA may promote a simulation claim beyond
 * `not-calibrated`. The contract intentionally separates generic-facility
 * calibration from NVIDIA-DSX-reference calibration: a model may be validated
 * against a real facility without implying DSX asset/runtime fidelity.
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

export type CalibrationTargetState = Exclude<SimulationCalibrationState, 'not-calibrated'>;

export interface CalibrationArtifactRef {
  /** Repository path or durable object URI. */
  uri: string;
  /** Full SHA-256 digest in `sha256:<64 lowercase hex>` form. */
  sha256: string;
  kind:
    | 'reference-data'
    | 'model-input'
    | 'model-output'
    | 'validation-report'
    | 'runtime-log'
    | 'usd-stage'
    | 'asset-manifest'
    | 'semantic-bindings'
    | 'source-map'
    | 'independent-review';
}

export interface CalibrationReferenceDataset {
  id: string;
  sourceName: string;
  sourceType:
    | 'measured-facility'
    | 'vendor-benchmark'
    | 'standards-benchmark'
    | 'solver-cross-check';
  /** Calibration data and validation data must be separable and traceable. */
  split: 'calibration' | 'validation' | 'independent-validation';
  artifact: CalibrationArtifactRef;
  observables: CalibrationObservable[];
  /** Evidence can only be promoted when data use/redistribution rights are known. */
  rightsConfirmed: boolean;
  /** ISO-8601 source capture/benchmark timestamp where applicable. */
  observedAt?: string;
}

export interface CalibrationAcceptanceCriterion {
  observable: CalibrationObservable;
  statistic: CalibrationStatistic;
  operator: 'lte' | 'gte';
  threshold: number;
  observed: number;
  unit?: string;
  /** Human-readable reference for why this threshold is acceptable. */
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
  runtimeEnvironment: 'browser' | 'server' | 'worker' | 'external';
  toolchainVersions: Record<string, string>;
  hardwareProfile?: string;
}

export interface DsxCalibrationContext {
  /** Which exact-role gate the calibrated claim depends on. */
  blueprintGate: 'rack' | 'facility' | 'full-reference';
  /** Must be true for a DSX-reference calibration claim. */
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
  /** True only when the run used a complete facility/twin baseline. */
  facilityBaselineComplete: boolean;
  /** Any material default/assumption blocks calibrated promotion. */
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
  /** Maximum calibration state this package can truthfully support. */
  eligibleState: SimulationCalibrationState;
  /** True only when DSX-reference prerequisites are independently satisfied. */
  dsxReferenceEligible: boolean;
  /** True only when an NVIDIA solver actually executed and runtime evidence is complete. */
  nvidiaRuntimeEligible: boolean;
  passedCriteria: number;
  totalCriteria: number;
  reasons: string[];
}

const SHA256_RE = /^sha256:[a-f0-9]{64}$/;

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && SHA256_RE.test(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function criterionPasses(c: CalibrationAcceptanceCriterion): boolean {
  if (!Number.isFinite(c.threshold) || !Number.isFinite(c.observed)) return false;
  return c.operator === 'lte' ? c.observed <= c.threshold : c.observed >= c.threshold;
}

function validateArtifact(ref: CalibrationArtifactRef, label: string, reasons: string[]): void {
  if (!nonEmpty(ref?.uri)) reasons.push(`${label} is missing a durable URI/path.`);
  if (!isSha256(ref?.sha256)) reasons.push(`${label} is missing a full SHA-256 digest.`);
}

/**
 * Validate one calibration evidence package and return the maximum claims it
 * supports. Structural completeness is necessary but not sufficient: every
 * declared acceptance criterion must pass, and calibrated states require a
 * holdout/validation dataset distinct from calibration data.
 */
export function assessCalibrationEvidence(
  pkg: CalibrationEvidencePackage,
): CalibrationEvidenceDecision {
  const reasons: string[] = [];

  if (!pkg || pkg.schemaVersion !== CALIBRATION_EVIDENCE_SCHEMA_VERSION) {
    reasons.push(`Calibration evidence schema must be ${CALIBRATION_EVIDENCE_SCHEMA_VERSION}.`);
  }
  if (!nonEmpty(pkg?.id)) reasons.push('Calibration package id is required.');
  if (!nonEmpty(pkg?.modelVersion)) reasons.push('Model version is required.');
  if (!pkg?.facilityBaselineComplete) reasons.push('A complete facility/twin baseline is required.');
  if (pkg?.usesFallbackDefaults) reasons.push('Fallback/default material inputs block calibration promotion.');
  if (pkg?.verificationLevel === 'unverified') reasons.push('Verification level must be stronger than unverified.');

  const claimed = new Set(pkg?.claimedObservables ?? []);
  if (claimed.size === 0) reasons.push('At least one claimed observable is required.');

  const datasets = pkg?.datasets ?? [];
  const calibrationDatasets = datasets.filter((d) => d.split === 'calibration');
  const validationDatasets = datasets.filter(
    (d) => d.split === 'validation' || d.split === 'independent-validation',
  );

  if (datasets.length === 0) reasons.push('At least one traceable reference dataset is required.');
  for (const dataset of datasets) {
    if (!nonEmpty(dataset.id)) reasons.push('Every reference dataset requires an id.');
    if (!nonEmpty(dataset.sourceName)) reasons.push(`Dataset ${dataset.id || '<unknown>'} requires a source name.`);
    if (!dataset.rightsConfirmed) reasons.push(`Dataset ${dataset.id || '<unknown>'} has unconfirmed data-use rights.`);
    validateArtifact(dataset.artifact, `Dataset ${dataset.id || '<unknown>'} artifact`, reasons);
  }

  const criteria = pkg?.acceptanceCriteria ?? [];
  if (criteria.length === 0) reasons.push('At least one quantitative acceptance criterion is required.');
  for (const observable of claimed) {
    if (!criteria.some((criterion) => criterion.observable === observable)) {
      reasons.push(`Claimed observable ${observable} has no acceptance criterion.`);
    }
    if (!datasets.some((dataset) => dataset.observables.includes(observable))) {
      reasons.push(`Claimed observable ${observable} is absent from reference datasets.`);
    }
  }
  for (const criterion of criteria) {
    if (!nonEmpty(criterion.rationale)) {
      reasons.push(`Acceptance criterion for ${criterion.observable} requires a threshold rationale.`);
    }
  }

  const passedCriteria = criteria.filter(criterionPasses).length;
  if (passedCriteria !== criteria.length) {
    reasons.push(`${criteria.length - passedCriteria} acceptance criterion/criteria did not pass.`);
  }

  const repro = pkg?.reproducibility;
  if (!repro) {
    reasons.push('Reproducibility evidence is required.');
  } else {
    if (!nonEmpty(repro.modelVersion) || repro.modelVersion !== pkg.modelVersion) {
      reasons.push('Reproducibility modelVersion must match the package modelVersion.');
    }
    if (!nonEmpty(repro.engineModule)) reasons.push('Reproducibility engineModule is required.');
    if (!nonEmpty(repro.command)) reasons.push('Reproduction command is required.');
    if (!isSha256(repro.inputHash)) reasons.push('Reproducibility inputHash must be a full SHA-256 digest.');
    if (!isSha256(repro.configurationHash)) reasons.push('Reproducibility configurationHash must be a full SHA-256 digest.');
    if (!isSha256(repro.outputHash)) reasons.push('Reproducibility outputHash must be a full SHA-256 digest.');
    if (!repro.toolchainVersions || Object.keys(repro.toolchainVersions).length === 0) {
      reasons.push('At least one toolchain/runtime version is required.');
    }
  }

  for (const [index, artifact] of (pkg?.artifacts ?? []).entries()) {
    validateArtifact(artifact, `Artifact ${index + 1}`, reasons);
  }

  // A benchmark may compare against a single traceable reference dataset.
  // Calibration requires a calibration set plus a distinct holdout/validation set.
  if (pkg?.targetState === 'calibrated' || pkg?.targetState === 'externally-validated') {
    if (calibrationDatasets.length === 0) reasons.push('Calibrated promotion requires a calibration dataset.');
    if (validationDatasets.length === 0) reasons.push('Calibrated promotion requires a distinct holdout/validation dataset.');

    const calibrationDigests = new Set(calibrationDatasets.map((d) => d.artifact.sha256));
    if (validationDatasets.some((d) => calibrationDigests.has(d.artifact.sha256))) {
      reasons.push('Calibration and validation datasets must be independently hashed datasets.');
    }
  }

  let dsxReferenceEligible = false;
  if (pkg?.claimScope === 'nvidia-dsx-reference') {
    const dsx = pkg.dsxContext;
    if (!dsx) {
      reasons.push('NVIDIA DSX reference claims require DSX asset/OpenUSD evidence context.');
    } else {
      if (!dsx.exactRoleCoverageComplete) {
        reasons.push('NVIDIA DSX reference claims require complete exact-role coverage for the declared gate.');
      }
      for (const [label, digest] of [
        ['USD stage', dsx.usdStageSha256],
        ['asset manifest', dsx.assetManifestSha256],
        ['semantic bindings', dsx.semanticBindingsSha256],
        ['source map', dsx.sourceMapSha256],
      ] as const) {
        if (!isSha256(digest)) reasons.push(`DSX ${label} requires a full SHA-256 digest.`);
      }
      dsxReferenceEligible =
        dsx.exactRoleCoverageComplete &&
        isSha256(dsx.usdStageSha256) &&
        isSha256(dsx.assetManifestSha256) &&
        isSha256(dsx.semanticBindingsSha256) &&
        isSha256(dsx.sourceMapSha256);
    }
  }

  let nvidiaRuntimeEligible = false;
  if (pkg?.runtimeEvidence) {
    const runtime = pkg.runtimeEvidence;
    if (!nonEmpty(runtime.providerId)) reasons.push('Runtime evidence requires providerId.');
    if (!nonEmpty(runtime.runtimeVersion)) reasons.push('Runtime evidence requires runtimeVersion.');
    if (!nonEmpty(runtime.externalJobId)) reasons.push('Runtime evidence requires externalJobId.');
    if (runtime.artifacts.length === 0) reasons.push('Runtime evidence requires at least one immutable runtime artifact.');
    runtime.artifacts.forEach((artifact, index) =>
      validateArtifact(artifact, `Runtime artifact ${index + 1}`, reasons),
    );
    nvidiaRuntimeEligible =
      runtime.executionClass === 'nvidia-solver' &&
      runtime.nvidiaIntegrated === true &&
      nonEmpty(runtime.providerId) &&
      nonEmpty(runtime.runtimeVersion) &&
      nonEmpty(runtime.externalJobId) &&
      runtime.artifacts.length > 0 &&
      runtime.artifacts.every((artifact) => nonEmpty(artifact.uri) && isSha256(artifact.sha256));
  }

  if (pkg?.targetState === 'externally-validated') {
    if (pkg.verificationLevel !== 'externally-validated') {
      reasons.push('Externally validated calibration requires verificationLevel=externally-validated.');
    }
    const review = pkg.independentReview;
    if (!review) {
      reasons.push('Externally validated calibration requires an independent review artifact.');
    } else {
      if (!nonEmpty(review.verifier)) reasons.push('Independent review requires verifier identity.');
      if (!nonEmpty(review.reviewedAt)) reasons.push('Independent review requires reviewedAt.');
      validateArtifact(review.report, 'Independent review report', reasons);
    }
    if (!validationDatasets.some((d) => d.split === 'independent-validation')) {
      reasons.push('Externally validated calibration requires an independent-validation dataset split.');
    }
  }

  const valid = reasons.length === 0;
  const eligibleState: SimulationCalibrationState = valid ? pkg.targetState : 'not-calibrated';

  return {
    valid,
    eligibleState,
    dsxReferenceEligible: valid && pkg.claimScope === 'nvidia-dsx-reference' && dsxReferenceEligible,
    nvidiaRuntimeEligible: valid && nvidiaRuntimeEligible,
    passedCriteria,
    totalCriteria: criteria.length,
    reasons,
  };
}
