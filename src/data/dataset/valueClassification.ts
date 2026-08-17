/**
 * Explicit value classification for every dataset-backed value.
 *
 * A value without a classification is treated as UNAVAILABLE. Nothing here can
 * be widened into "live", "measured", "commissioned", "operational",
 * "NVIDIA-integrated" or "SimReady-validated": those states have no
 * representation in this union on purpose.
 */
export type ValueClassification =
  | 'REFERENCE_VALUE'
  | 'REFERENCE_SPECIFICATION'
  | 'REFERENCE_CONFIGURATION'
  | 'REFERENCE_SCENARIO'
  | 'DERIVED_VALUE'
  | 'SIMULATED_RESULT'
  | 'UNAVAILABLE'
  | 'NOT_SUPPLIED'
  | 'NOT_CONNECTED';

export const CLASSIFICATION_LABEL: Record<ValueClassification, string> = {
  REFERENCE_VALUE: 'Reference value',
  REFERENCE_SPECIFICATION: 'Reference specification',
  REFERENCE_CONFIGURATION: 'Reference configuration',
  REFERENCE_SCENARIO: 'Reference scenario',
  DERIVED_VALUE: 'AURA-derived',
  SIMULATED_RESULT: 'AURA-simulated',
  UNAVAILABLE: 'Unavailable',
  NOT_SUPPLIED: 'Not supplied',
  NOT_CONNECTED: 'Not connected',
};

/** Classifications that must never render a number. */
export const NON_VALUE_CLASSIFICATIONS: readonly ValueClassification[] = [
  'UNAVAILABLE',
  'NOT_SUPPLIED',
  'NOT_CONNECTED',
];

export function isRenderableValue(c: ValueClassification): boolean {
  return !NON_VALUE_CLASSIFICATIONS.includes(c);
}

/**
 * The single terminal blocker descriptor for every NGC-dependent data class.
 * Stable: it never retries, never spins, and never substitutes data.
 */
export interface UnavailableReason {
  state: 'UNAVAILABLE';
  requiredDataset: string;
  requiredVersion: string;
  blocker: string;
  lastAttemptedStatus: string;
  substitution: 'No data substituted';
  autoRetry: false;
}

export const NGC_UNAVAILABLE: UnavailableReason = {
  state: 'UNAVAILABLE',
  requiredDataset: 'dsx_dataset',
  requiredVersion: 'v2.1',
  blocker: 'NGC authorization required',
  lastAttemptedStatus: 'HTTP 401',
  substitution: 'No data substituted',
  autoRetry: false,
};

/** Data classes that depend on the blocked NGC dataset. */
export const NGC_DEPENDENT_DATA_CLASSES = [
  'SAMPLE_SIMULATION_OUTPUT',
  'SAMPLE_CFD_OUTPUT',
  'SAMPLE_ELECTRICAL_OUTPUT',
  'ASSET_METADATA',
] as const;

export type NgcDependentDataClass = (typeof NGC_DEPENDENT_DATA_CLASSES)[number];

export function isNgcDependent(dataClass: string): dataClass is NgcDependentDataClass {
  return (NGC_DEPENDENT_DATA_CLASSES as readonly string[]).includes(dataClass);
}
