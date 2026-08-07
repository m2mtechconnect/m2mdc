import { describe, it, expect } from 'vitest';
import { CAPABILITIES, NVIDIA_READINESS, hasCapability } from '../registry';
import { ACTIVE_MODE, OPERATING_MODES, evidenceBoundaryNotice, simulationRunId } from '../operatingState';
import { signalLabel, signalStrength } from '../recommendationSignal';

describe('capability registry', () => {
  it('keeps every unproven NVIDIA/live capability disabled', () => {
    for (const key of ['liveTelemetry', 'openUsdStage', 'simReadyAssets', 'nvidiaRuntime', 'dsxExchange', 'telemetryPrimMapping', 'calibratedSimulation'] as const) {
      expect(hasCapability(key)).toBe(false);
      expect(CAPABILITIES[key].requirement.length).toBeGreaterThan(0);
    }
  });

  it('reports zero proven NVIDIA components', () => {
    expect(NVIDIA_READINESS.staticallyProvenComponents).toBe(0);
    expect(NVIDIA_READINESS.openUsdStages).toBe(0);
    expect(NVIDIA_READINESS.simReadyValidatedAssets).toBe(0);
    expect(NVIDIA_READINESS.productionVerdict).toBe('NO-GO');
  });

  it('operates in simulated mode only', () => {
    expect(ACTIVE_MODE).toBe('SIMULATED');
    expect(OPERATING_MODES.LIVE.enabled).toBe(false);
    expect(OPERATING_MODES.NVIDIA_DSX.enabled).toBe(false);
  });

  it('produces a deterministic run id and evidence boundary', () => {
    const d = new Date('2026-08-07T10:00:00Z');
    expect(simulationRunId(d)).toBe('SIM-2026-08-07-001');
    expect(evidenceBoundaryNotice('SIM-2026-08-07-001')).toContain('No live facility');
  });

  it('labels recommendation strength qualitatively, never as a percentage', () => {
    expect(signalStrength(90)).toBe('Strong');
    expect(signalStrength(70)).toBe('Moderate');
    expect(signalStrength(10)).toBe('Weak');
    expect(signalLabel(90)).not.toMatch(/%/);
  });
});
