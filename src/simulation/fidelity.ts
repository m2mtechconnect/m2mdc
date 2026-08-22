/**
 * Post-remediation Simulation Fidelity Qualification contract.
 *
 * The NVIDIA DSX asset audit/remediation is already complete in PR #16. This
 * module is deliberately a separate axis: correct OpenUSD/DSX asset semantics
 * do not prove that a simulation is measured, calibrated, or executed by an
 * NVIDIA runtime.
 *
 * A fidelity assessment is a claims boundary, not a quality score. It prevents
 * scripted/deterministic/demo output from being promoted to measured or
 * calibrated engineering evidence without the prerequisites that would make
 * that statement true.
 */

import type { DataProvenance } from '@/lib/provenance/types';
import type { SimulationExecutionClass } from './orchestrator/executionClass';
import type { SimulationIntent, VerificationLevel } from './orchestrator/types';

export const SIMULATION_EVIDENCE_CLASSES = [
  'demonstration',
  'deterministic-calculation',
  'engineering-estimate',
  'measured',
  'external-solver',
] as const;

export type SimulationEvidenceClass = (typeof SIMULATION_EVIDENCE_CLASSES)[number];

export const SIMULATION_CALIBRATION_STATES = [
  'not-calibrated',
  'benchmarked',
  'calibrated',
  'externally-validated',
] as const;

export type SimulationCalibrationState = (typeof SIMULATION_CALIBRATION_STATES)[number];

export interface SimulationFidelityInput {
  executionClass: SimulationExecutionClass;
  verificationLevel: VerificationLevel;
  provenance: DataProvenance;
  intent: SimulationIntent;
  /** True only when NVIDIA code or an NVIDIA service actually executed. */
  nvidiaIntegrated: boolean;
  /** True only when the run consumed a facility/twin baseline rather than a bundled default. */
  hasFacilityBaseline: boolean;
  /** True when one or more material inputs were filled from defaults/assumptions. */
  usesFallbackDefaults: boolean;
  /** Explicit calibration evidence state; absence is fail-closed. */
  calibrationState?: SimulationCalibrationState;
}

export interface SimulationFidelityAssessment {
  evidenceClass: SimulationEvidenceClass;
  calibrationState: SimulationCalibrationState;
  /** Safe short label for operator UI. */
  label: string;
  runOfRecordEligible: boolean;
  mayClaimMeasured: boolean;
  mayClaimCalibrated: boolean;
  mayClaimNvidiaRuntime: boolean;
  limitations: string[];
}

function inferEvidenceClass(input: SimulationFidelityInput): SimulationEvidenceClass {
  if (input.provenance === 'demo' || input.executionClass === 'fixture-preview') {
    return 'demonstration';
  }
  if (input.executionClass === 'measured-live' && input.provenance === 'live') {
    return 'measured';
  }
  if (input.executionClass === 'external-solver' || input.executionClass === 'nvidia-solver') {
    return 'external-solver';
  }
  if (input.usesFallbackDefaults || !input.hasFacilityBaseline) {
    return 'engineering-estimate';
  }
  return 'deterministic-calculation';
}

/**
 * Compute the maximum claims that the supplied evidence supports.
 *
 * Fail-closed rules:
 * - no measured claim without measured-live + live provenance;
 * - no calibrated claim unless calibration is explicitly calibrated or
 *   externally validated AND the run has a real facility baseline;
 * - no NVIDIA-runtime claim unless an NVIDIA execution class actually ran and
 *   the provider independently declares `nvidiaIntegrated=true`;
 * - authoritative intent alone never upgrades fidelity.
 */
export function assessSimulationFidelity(
  input: SimulationFidelityInput,
): SimulationFidelityAssessment {
  const evidenceClass = inferEvidenceClass(input);
  const calibrationState = input.calibrationState ?? 'not-calibrated';

  const mayClaimMeasured =
    evidenceClass === 'measured' &&
    input.executionClass === 'measured-live' &&
    input.provenance === 'live';

  const mayClaimCalibrated =
    (calibrationState === 'calibrated' || calibrationState === 'externally-validated') &&
    input.hasFacilityBaseline &&
    !input.usesFallbackDefaults &&
    input.verificationLevel !== 'unverified';

  const mayClaimNvidiaRuntime =
    input.executionClass === 'nvidia-solver' && input.nvidiaIntegrated === true;

  const runOfRecordEligible =
    input.intent === 'authoritative' &&
    evidenceClass !== 'demonstration' &&
    input.hasFacilityBaseline &&
    !input.usesFallbackDefaults &&
    input.verificationLevel !== 'unverified';

  const limitations: string[] = [];
  if (evidenceClass === 'demonstration') {
    limitations.push('Bundled demonstration/fixture output; not a run of record.');
  }
  if (!input.hasFacilityBaseline) {
    limitations.push('No facility/twin baseline was supplied.');
  }
  if (input.usesFallbackDefaults) {
    limitations.push('One or more material inputs use configured defaults or assumptions.');
  }
  if (!mayClaimCalibrated) {
    limitations.push('Physical-model calibration has not been proven for this run.');
  }
  if (!mayClaimNvidiaRuntime) {
    limitations.push('No NVIDIA DSX/Omniverse solver execution is evidenced for this run.');
  }
  if (!mayClaimMeasured) {
    limitations.push('Output is not a measured live observation.');
  }

  const label =
    evidenceClass === 'demonstration'
      ? 'Demonstration model'
      : evidenceClass === 'engineering-estimate'
        ? 'Engineering estimate'
        : evidenceClass === 'deterministic-calculation'
          ? 'Deterministic calculation'
          : evidenceClass === 'external-solver'
            ? 'External solver result'
            : 'Measured live result';

  return {
    evidenceClass,
    calibrationState,
    label,
    runOfRecordEligible,
    mayClaimMeasured,
    mayClaimCalibrated,
    mayClaimNvidiaRuntime,
    limitations,
  };
}

/** Canonical assessment for the current bundled Simulation Preview fixtures. */
export const SIMULATION_PREVIEW_FIDELITY = assessSimulationFidelity({
  executionClass: 'fixture-preview',
  verificationLevel: 'unverified',
  provenance: 'demo',
  intent: 'preview',
  nvidiaIntegrated: false,
  hasFacilityBaseline: false,
  usesFallbackDefaults: true,
  calibrationState: 'not-calibrated',
});
