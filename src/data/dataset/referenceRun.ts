/**
 * Lineage for simulations, derivations, comparison and review while the
 * reference canary is active.
 *
 * Nothing here produces a number. It produces the provenance envelope that
 * makes an AURA-simulated result distinguishable from an NVIDIA reference
 * fact, and it refuses to start a run whose inputs are unavailable.
 */
import { DSX_DATASET_VERSION, DSX_SOURCE_COMMIT, type DatasetMode } from '@/data/dsxReference';
import { referenceKpiValues, type DatasetValue } from './referenceSelectors';
import { comparableMetric } from '@/data/dsxReference';
import { isRenderableValue } from './valueClassification';

export interface ReferenceRunRequest {
  dataset: DatasetMode;
  configurationId: string;
  scenarioRecordIds: readonly string[];
  /** Inputs the operator supplied outside the reference dataset. */
  auraInputs?: Record<string, number | string>;
}

export interface RunBlocked {
  status: 'BLOCKED';
  missingInputs: { key: string; label: string; reason: string }[];
  explanation: string;
}

export interface RunLineage {
  status: 'READY';
  /** Deterministic id: no clock, no randomness, so tests are stable. */
  lineageId: string;
  dataset: DatasetMode;
  datasetVersion: string;
  sourceCommit: string;
  configurationId: string;
  inputRecordIds: string[];
  scenarioRecordIds: string[];
  ownership: 'AURA';
  resultClassification: 'SIMULATED_RESULT';
  commissioned: false;
  connected: false;
  attribution: string;
}

export type RunLineageResult = RunLineage | RunBlocked;

/** Required KPI inputs for a reference-driven simulation run. */
export const REQUIRED_RUN_INPUTS = ['pue', 'wue', 'cue', 'total_energy_use'] as const;

export function buildRunLineage(request: ReferenceRunRequest): RunLineageResult {
  const values = referenceKpiValues(request.configurationId);
  const byKey = new Map(values.map((v) => [v.key, v]));
  const missing = REQUIRED_RUN_INPUTS.filter((key) => {
    const v = byKey.get(key);
    return !v || !isRenderableValue(v.classification) || v.value === null;
  }).map((key) => ({
    key,
    label: byKey.get(key)?.label ?? key,
    reason: byKey.has(key)
      ? 'Required dataset dsx_dataset v2.1 is unavailable (NGC authorization required, HTTP 401).'
      : 'Not supplied by the pinned NVIDIA source.',
  }));

  if (missing.length > 0 || request.scenarioRecordIds.length === 0) {
    return {
      status: 'BLOCKED',
      missingInputs: missing,
      explanation:
        request.scenarioRecordIds.length === 0
          ? 'Select at least one reference scenario. Execution is blocked; no values were substituted.'
          : 'Execution is blocked until every required input has a defensible source. No value was substituted.',
    };
  }

  return {
    status: 'READY',
    lineageId: `aura-run:${request.dataset}:${request.configurationId}:${[...request.scenarioRecordIds]
      .sort()
      .join('+')}`,
    dataset: request.dataset,
    datasetVersion: DSX_DATASET_VERSION,
    sourceCommit: DSX_SOURCE_COMMIT,
    configurationId: request.configurationId,
    inputRecordIds: values.map((v) => v.recordId).filter((id): id is string => Boolean(id)),
    scenarioRecordIds: [...request.scenarioRecordIds].sort(),
    ownership: 'AURA',
    resultClassification: 'SIMULATED_RESULT',
    commissioned: false,
    connected: false,
    attribution:
      'AURA-simulated result derived from NVIDIA DSX reference inputs. Not an NVIDIA result, not measured, not commissioned.',
  };
}

/** Derivation envelope written when a reference configuration seeds a design. */
export interface DerivedDesign {
  designId: string;
  parentReferenceIds: string[];
  datasetVersion: string;
  sourceCommit: string;
  derivedAt: string;
  ownership: 'AURA';
  commissioned: false;
  classification: 'DERIVED_VALUE';
}

export function deriveDesignFromReference(
  configurationId: string,
  parentRecordIds: readonly string[],
  derivedAt: string,
): DerivedDesign {
  return {
    designId: `aura-design:${configurationId}`,
    parentReferenceIds: [...parentRecordIds],
    datasetVersion: DSX_DATASET_VERSION,
    sourceCommit: DSX_SOURCE_COMMIT,
    derivedAt,
    ownership: 'AURA',
    commissioned: false,
    classification: 'DERIVED_VALUE',
  };
}

export interface ComparisonRow {
  metricKey: string;
  label: string;
  left: DatasetValue | null;
  right: DatasetValue | null;
  comparable: boolean;
  reason: string | null;
}

/**
 * Compare two reference configurations. Incomparable pairs are reported, never
 * coerced: a missing value never becomes zero and units are never mixed.
 */
export function compareConfigurations(leftId: string, rightId: string): ComparisonRow[] {
  const left = new Map(referenceKpiValues(leftId).map((v) => [v.key, v]));
  const right = new Map(referenceKpiValues(rightId).map((v) => [v.key, v]));
  const keys = [...new Set([...left.keys(), ...right.keys()])].sort();
  return keys.map((metricKey) => {
    const l = left.get(metricKey) ?? null;
    const r = right.get(metricKey) ?? null;
    const verdict = comparableMetric(leftId, rightId, metricKey);
    return {
      metricKey,
      label: l?.label ?? r?.label ?? metricKey,
      left: l,
      right: r,
      comparable: verdict.comparable,
      reason: verdict.reason,
    };
  });
}