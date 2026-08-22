import { describe, expect, it } from 'vitest';
import {
  assessCalibrationEvidence,
  type CalibrationEvidencePackage,
} from '../calibrationEvidence';

const sha = (c: string) => `sha256:${c.repeat(64)}`;

function basePackage(
  overrides: Partial<CalibrationEvidencePackage> = {},
): CalibrationEvidencePackage {
  return {
    schemaVersion: 'aura-calibration-evidence-v1',
    id: 'thermal-reference-v1',
    domain: 'thermal-airflow',
    claimScope: 'generic-facility',
    targetState: 'benchmarked',
    claimedObservables: ['rack-inlet-temperature'],
    modelVersion: 'thermal-model-1.0.0',
    facilityBaselineComplete: true,
    usesFallbackDefaults: false,
    verificationLevel: 'server-validated',
    datasets: [
      {
        id: 'holdout-1',
        sourceName: 'facility-sensor-export',
        sourceType: 'measured-facility',
        split: 'validation',
        artifact: {
          uri: 'evidence/thermal/holdout.csv',
          sha256: sha('a'),
          kind: 'reference-data',
        },
        observables: ['rack-inlet-temperature'],
        rightsConfirmed: true,
        observedAt: '2026-08-22T00:00:00Z',
      },
    ],
    acceptanceCriteria: [
      {
        observable: 'rack-inlet-temperature',
        statistic: 'mae',
        operator: 'lte',
        threshold: 1.5,
        observed: 1.0,
        unit: '°C',
        rationale: 'Acceptance threshold documented in the validation plan.',
      },
    ],
    reproducibility: {
      modelVersion: 'thermal-model-1.0.0',
      engineModule: 'src/simulation/SimulationEngine.ts',
      command: 'bun run validate:thermal-reference',
      inputHash: sha('b'),
      configurationHash: sha('c'),
      outputHash: sha('d'),
      seed: null,
      runtimeEnvironment: 'server',
      toolchainVersions: { aura: '1.0.0' },
    },
    artifacts: [],
    ...overrides,
  };
}

describe('SF-6A calibration evidence contract', () => {
  it('allows a benchmark only with traceable data, quantitative criteria and reproducibility evidence', () => {
    const result = assessCalibrationEvidence(basePackage());
    expect(result.valid).toBe(true);
    expect(result.eligibleState).toBe('benchmarked');
    expect(result.dsxReferenceEligible).toBe(false);
    expect(result.passedCriteria).toBe(1);
  });

  it('fails closed when any acceptance criterion misses its declared tolerance', () => {
    const pkg = basePackage({
      acceptanceCriteria: [
        {
          observable: 'rack-inlet-temperature',
          statistic: 'mae',
          operator: 'lte',
          threshold: 1.0,
          observed: 2.25,
          unit: '°C',
          rationale: 'Validation plan threshold.',
        },
      ],
    });
    const result = assessCalibrationEvidence(pkg);
    expect(result.valid).toBe(false);
    expect(result.eligibleState).toBe('not-calibrated');
    expect(result.reasons.some((reason) => reason.includes('did not pass'))).toBe(true);
  });

  it('requires distinct calibration and holdout datasets for calibrated promotion', () => {
    const pkg = basePackage({
      targetState: 'calibrated',
      datasets: [
        {
          id: 'calibration-1',
          sourceName: 'facility-calibration-export',
          sourceType: 'measured-facility',
          split: 'calibration',
          artifact: { uri: 'evidence/calibration.csv', sha256: sha('e'), kind: 'reference-data' },
          observables: ['rack-inlet-temperature'],
          rightsConfirmed: true,
        },
        {
          id: 'holdout-1',
          sourceName: 'facility-holdout-export',
          sourceType: 'measured-facility',
          split: 'validation',
          artifact: { uri: 'evidence/holdout.csv', sha256: sha('f'), kind: 'reference-data' },
          observables: ['rack-inlet-temperature'],
          rightsConfirmed: true,
        },
      ],
    });
    const result = assessCalibrationEvidence(pkg);
    expect(result.valid).toBe(true);
    expect(result.eligibleState).toBe('calibrated');
    expect(result.dsxReferenceEligible).toBe(false);
  });

  it('does not allow a DSX-reference calibration claim without complete exact-role/OpenUSD evidence', () => {
    const pkg = basePackage({
      claimScope: 'nvidia-dsx-reference',
      targetState: 'calibrated',
      datasets: [
        {
          id: 'calibration-1',
          sourceName: 'facility-calibration-export',
          sourceType: 'measured-facility',
          split: 'calibration',
          artifact: { uri: 'evidence/calibration.csv', sha256: sha('1'), kind: 'reference-data' },
          observables: ['rack-inlet-temperature'],
          rightsConfirmed: true,
        },
        {
          id: 'holdout-1',
          sourceName: 'facility-holdout-export',
          sourceType: 'measured-facility',
          split: 'validation',
          artifact: { uri: 'evidence/holdout.csv', sha256: sha('2'), kind: 'reference-data' },
          observables: ['rack-inlet-temperature'],
          rightsConfirmed: true,
        },
      ],
      dsxContext: {
        blueprintGate: 'facility',
        exactRoleCoverageComplete: false,
        usdStageSha256: sha('3'),
        assetManifestSha256: sha('4'),
        semanticBindingsSha256: sha('5'),
        sourceMapSha256: sha('6'),
      },
    });
    const result = assessCalibrationEvidence(pkg);
    expect(result.valid).toBe(false);
    expect(result.dsxReferenceEligible).toBe(false);
    expect(result.reasons.some((reason) => reason.includes('exact-role coverage'))).toBe(true);
  });

  it('requires independent review and independent validation data for externally validated promotion', () => {
    const pkg = basePackage({
      targetState: 'externally-validated',
      verificationLevel: 'externally-validated',
      datasets: [
        {
          id: 'calibration-1',
          sourceName: 'facility-calibration-export',
          sourceType: 'measured-facility',
          split: 'calibration',
          artifact: { uri: 'evidence/calibration.csv', sha256: sha('7'), kind: 'reference-data' },
          observables: ['rack-inlet-temperature'],
          rightsConfirmed: true,
        },
        {
          id: 'independent-1',
          sourceName: 'independent-lab-export',
          sourceType: 'measured-facility',
          split: 'independent-validation',
          artifact: { uri: 'evidence/independent.csv', sha256: sha('8'), kind: 'reference-data' },
          observables: ['rack-inlet-temperature'],
          rightsConfirmed: true,
        },
      ],
      independentReview: {
        verifier: 'Independent Validation Lab',
        reviewedAt: '2026-08-22T00:00:00Z',
        report: {
          uri: 'evidence/review.pdf',
          sha256: sha('9'),
          kind: 'independent-review',
        },
      },
    });
    const result = assessCalibrationEvidence(pkg);
    expect(result.valid).toBe(true);
    expect(result.eligibleState).toBe('externally-validated');
  });
});
