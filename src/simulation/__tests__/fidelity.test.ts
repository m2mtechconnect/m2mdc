import { describe, expect, it } from 'vitest';
import {
  SIMULATION_PREVIEW_FIDELITY,
  assessSimulationFidelity,
} from '../fidelity';
import type { CalibrationEvidenceDecision } from '../calibrationEvidence';

const calibratedDecision: CalibrationEvidenceDecision = {
  valid: true,
  eligibleState: 'calibrated',
  dsxReferenceEligible: false,
  nvidiaRuntimeEligible: false,
  passedCriteria: 3,
  totalCriteria: 3,
  reasons: [],
};

const dsxCalibratedDecision: CalibrationEvidenceDecision = {
  ...calibratedDecision,
  eligibleState: 'externally-validated',
  dsxReferenceEligible: true,
};

describe('simulation fidelity qualification', () => {
  it('keeps bundled preview fixtures explicitly non-authoritative', () => {
    expect(SIMULATION_PREVIEW_FIDELITY.evidenceClass).toBe('demonstration');
    expect(SIMULATION_PREVIEW_FIDELITY.runOfRecordEligible).toBe(false);
    expect(SIMULATION_PREVIEW_FIDELITY.mayClaimMeasured).toBe(false);
    expect(SIMULATION_PREVIEW_FIDELITY.mayClaimCalibrated).toBe(false);
    expect(SIMULATION_PREVIEW_FIDELITY.mayClaimDsxCalibrated).toBe(false);
    expect(SIMULATION_PREVIEW_FIDELITY.mayClaimNvidiaRuntime).toBe(false);
  });

  it('does not let authoritative intent promote default-backed output', () => {
    const result = assessSimulationFidelity({
      executionClass: 'aura-deterministic',
      verificationLevel: 'server-validated',
      provenance: 'simulated',
      intent: 'authoritative',
      nvidiaIntegrated: false,
      hasFacilityBaseline: true,
      usesFallbackDefaults: true,
      calibrationEvidence: calibratedDecision,
    });

    expect(result.evidenceClass).toBe('engineering-estimate');
    expect(result.runOfRecordEligible).toBe(false);
    expect(result.mayClaimCalibrated).toBe(false);
  });

  it('does not trust a caller-provided calibration label without validated evidence', () => {
    const result = assessSimulationFidelity({
      executionClass: 'external-solver',
      verificationLevel: 'externally-validated',
      provenance: 'simulated',
      intent: 'authoritative',
      nvidiaIntegrated: false,
      hasFacilityBaseline: true,
      usesFallbackDefaults: false,
      calibrationState: 'externally-validated',
    });

    expect(result.calibrationState).toBe('not-calibrated');
    expect(result.mayClaimCalibrated).toBe(false);
    expect(result.limitations.some((line) => line.includes('not promoted'))).toBe(true);
  });

  it('requires a validated calibration decision and complete facility baseline', () => {
    const unverified = assessSimulationFidelity({
      executionClass: 'aura-deterministic',
      verificationLevel: 'unverified',
      provenance: 'simulated',
      intent: 'authoritative',
      nvidiaIntegrated: false,
      hasFacilityBaseline: true,
      usesFallbackDefaults: false,
      calibrationEvidence: calibratedDecision,
    });
    expect(unverified.mayClaimCalibrated).toBe(false);

    const calibrated = assessSimulationFidelity({
      executionClass: 'external-solver',
      verificationLevel: 'externally-validated',
      provenance: 'simulated',
      intent: 'authoritative',
      nvidiaIntegrated: false,
      hasFacilityBaseline: true,
      usesFallbackDefaults: false,
      calibrationEvidence: calibratedDecision,
    });
    expect(calibrated.mayClaimCalibrated).toBe(true);
    expect(calibrated.mayClaimDsxCalibrated).toBe(false);
    expect(calibrated.runOfRecordEligible).toBe(true);
  });

  it('separates generic calibration from NVIDIA DSX-reference calibration', () => {
    const result = assessSimulationFidelity({
      executionClass: 'external-solver',
      verificationLevel: 'externally-validated',
      provenance: 'simulated',
      intent: 'authoritative',
      nvidiaIntegrated: false,
      hasFacilityBaseline: true,
      usesFallbackDefaults: false,
      calibrationEvidence: dsxCalibratedDecision,
    });

    expect(result.mayClaimCalibrated).toBe(true);
    expect(result.mayClaimDsxCalibrated).toBe(true);
  });

  it('requires an actually executed NVIDIA solver before an NVIDIA-runtime claim', () => {
    const stub = assessSimulationFidelity({
      executionClass: 'nvidia-solver',
      verificationLevel: 'unverified',
      provenance: 'unavailable',
      intent: 'preview',
      nvidiaIntegrated: false,
      hasFacilityBaseline: false,
      usesFallbackDefaults: false,
    });
    expect(stub.mayClaimNvidiaRuntime).toBe(false);

    const executed = assessSimulationFidelity({
      executionClass: 'nvidia-solver',
      verificationLevel: 'externally-validated',
      provenance: 'simulated',
      intent: 'authoritative',
      nvidiaIntegrated: true,
      hasFacilityBaseline: true,
      usesFallbackDefaults: false,
      calibrationEvidence: dsxCalibratedDecision,
    });
    expect(executed.mayClaimNvidiaRuntime).toBe(true);
  });

  it('allows measured claims only for measured-live execution with live provenance', () => {
    const simulated = assessSimulationFidelity({
      executionClass: 'aura-deterministic',
      verificationLevel: 'server-validated',
      provenance: 'simulated',
      intent: 'authoritative',
      nvidiaIntegrated: false,
      hasFacilityBaseline: true,
      usesFallbackDefaults: false,
    });
    expect(simulated.mayClaimMeasured).toBe(false);

    const measured = assessSimulationFidelity({
      executionClass: 'measured-live',
      verificationLevel: 'externally-validated',
      provenance: 'live',
      intent: 'authoritative',
      nvidiaIntegrated: false,
      hasFacilityBaseline: true,
      usesFallbackDefaults: false,
    });
    expect(measured.evidenceClass).toBe('measured');
    expect(measured.mayClaimMeasured).toBe(true);
  });
});
