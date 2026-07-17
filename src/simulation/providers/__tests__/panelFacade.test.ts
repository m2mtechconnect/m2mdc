/**
 * Phase 1B.2a — Facade panel-result adapter tests.
 *
 * Verifies that the facade's `generatePanelResult` delegates to the
 * existing `generateSimulationResult` engine (no new estimator), and
 * that an unknown provider configuration surfaces as a typed
 * `unavailable` outcome instead of silently selecting compatibility.
 */

import { describe, it, expect } from 'vitest';

import { createSimulationFacade } from '../../api';
import { generateSimulationResult } from '../../generateSimulationResult';
import { getAllScenarios } from '../../scenarioRegistry';

const baseline = {
  pue: 1.35,
  gpuUtilization: 78,
  thermalStabilityScore: 92,
  powerReliabilityScore: 99,
};
const current = {
  pue: 1.42,
  gpuUtilization: 74,
  thermalStabilityScore: 88,
  powerReliabilityScore: 97,
};

describe('facade.generatePanelResult — engine delegation', () => {
  it('returns simulated ok outcome with the engine summary shape', () => {
    const scenario = getAllScenarios()[0]!;
    const facade = createSimulationFacade({ env: {} });
    const outcome = facade.generatePanelResult({
      scenario,
      events: [],
      baselineKpis: baseline,
      currentKpis: current,
      durationSec: 120,
      observedAt: '2026-07-17T00:00:00.000Z',
    });
    expect(outcome.kind).toBe('ok');
    if (outcome.kind !== 'ok') return;
    expect(outcome.provenance).toBe('simulated');
    expect(outcome.observedAt).toBe('2026-07-17T00:00:00.000Z');
    // Envelope shape matches the legacy engine, field-for-field.
    expect(Object.keys(outcome.value).sort()).toEqual([
      'actualVsExpected',
      'durationSec',
      'events',
      'kpiDeltas',
      'rcaMarkdown',
      'recommendationsMarkdown',
      'scenarioId',
      'scenarioName',
    ]);
  });

  it('produces identical KPI deltas to a direct engine call (golden equivalence)', () => {
    const scenario = getAllScenarios()[0]!;
    const facade = createSimulationFacade({ env: {} });
    const outcome = facade.generatePanelResult({
      scenario,
      events: [],
      baselineKpis: baseline,
      currentKpis: current,
      durationSec: 60,
      observedAt: '2026-07-17T00:00:00.000Z',
    });
    const direct = generateSimulationResult(scenario, [], baseline, current, 60);
    if (outcome.kind !== 'ok') throw new Error('expected ok');
    // KPI deltas are deterministic (no randomness in that path).
    expect(outcome.value.kpiDeltas).toEqual(direct.kpiDeltas);
    expect(outcome.value.scenarioId).toBe(direct.scenarioId);
    expect(outcome.value.scenarioName).toBe(direct.scenarioName);
    expect(outcome.value.durationSec).toBe(direct.durationSec);
  });

  it('returns invalid-input when required inputs are missing', () => {
    const facade = createSimulationFacade({ env: {} });
    const outcome = facade.generatePanelResult({
      scenario: null,
      events: [],
      baselineKpis: null as unknown as Record<string, number>,
      currentKpis: current,
      durationSec: 60,
    });
    expect(outcome.kind).toBe('invalid-input');
    expect(outcome.provenance).toBe('unavailable');
  });
});

describe('facade — unknown provider configuration', () => {
  it('flags isConfigured=false and returns unavailable on generatePanelResult', () => {
    const facade = createSimulationFacade({
      env: { VITE_AURA_SIM_PROVIDER: 'not-a-real-provider' },
    });
    expect(facade.isConfigured).toBe(false);
    const outcome = facade.generatePanelResult({
      scenario: getAllScenarios()[0]!,
      events: [],
      baselineKpis: baseline,
      currentKpis: current,
      durationSec: 30,
    });
    expect(outcome.kind).toBe('unavailable');
    expect(outcome.provenance).toBe('unavailable');
    if (outcome.kind === 'unavailable') {
      expect(outcome.reason).toMatch(/unknown simulation provider/);
    }
  });

  it('unknown-config also downgrades listScenarios and runScenario', async () => {
    const facade = createSimulationFacade({
      env: { VITE_AURA_SIM_PROVIDER: 'nope' },
    });
    const listed = facade.listScenarios();
    expect(listed.kind).toBe('unavailable');
    const ran = await facade.runScenario({ scenarioId: 'x' });
    expect(ran.kind).toBe('unavailable');
  });

  it('known env value still produces ok outcomes (regression guard)', () => {
    const facade = createSimulationFacade({
      env: { VITE_AURA_SIM_PROVIDER: 'compatibility' },
    });
    expect(facade.isConfigured).toBe(true);
    const outcome = facade.generatePanelResult({
      scenario: getAllScenarios()[0]!,
      events: [],
      baselineKpis: baseline,
      currentKpis: current,
      durationSec: 10,
    });
    expect(outcome.kind).toBe('ok');
  });

  it('sanitizes hostile env values in the reason string', () => {
    const facade = createSimulationFacade({
      env: { VITE_AURA_SIM_PROVIDER: '<script>alert(1)</script>' },
    });
    const outcome = facade.generatePanelResult({
      scenario: getAllScenarios()[0]!,
      events: [],
      baselineKpis: baseline,
      currentKpis: current,
      durationSec: 10,
    });
    expect(outcome.kind).toBe('unavailable');
    if (outcome.kind === 'unavailable') {
      expect(outcome.reason).not.toContain('<');
      expect(outcome.reason).not.toContain('>');
    }
  });
});