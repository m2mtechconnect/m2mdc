import { describe, expect, it } from 'vitest';
import {
  SIMULATION_PREVIEW_FIDELITY,
  assessSimulationFidelity,
} from '../fidelity';

describe('simulation fidelity qualification', () => {
  it('keeps bundled preview fixtures explicitly non-authoritative', () => {
    expect(SIMULATION_PREVIEW_FIDELITY.evidenceClass).toBe('demonstration');
    expect(SIMULATION_PREVIEW_FIDELITY.runOfRecordEligible).toBe(false);
    expect(SIMULATION_PREVIEW_FIDELITY.mayClaimMeasured).toBe(false);
    expect(SIMULATION_PREVIEW_FIDELITY.mayClaimCalibrated).toBe(false);
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
      calibrationState: 'not-calibrated',
    });

    expect(result.evidenceClass).toBe('engineering-estimate');
    expect(result.runOfRecordEligible).toBe(false);
    expect(result.mayClaimCalibrated).toBe(false);
  });

  it('requires explicit calibration evidence and a complete facility baseline', () => {
    const unverified = assessSimulationFidelity({
      executionClass: 'aura-deterministic',
      verificationLevel: 'unverified',
      provenance: 'simulated',
      intent: 'authoritative',
      nvidiaIntegrated: false,
      hasFacilityBaseline: true,
      usesFallbackDefaults: false,
      calibrationState: 'calibrated',
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
      calibrationState: 'externally-validated',
    });
    expect(calibrated.mayClaimCalibrated).toBe(true);
    expect(calibrated.runOfRecordEligible).toBe(true);
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
      calibrationState: 'externally-validated',
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
