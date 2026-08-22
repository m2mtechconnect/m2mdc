import { afterEach, describe, expect, it, vi } from 'vitest';
import { SimulationEngine } from '../SimulationEngine';
import { PRESET_SCENARIOS } from '../scenarioRegistry';

describe('SimulationEngine preflight', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('refuses a valid scenario when no baseline KPIs are configured', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const engine = new SimulationEngine();
    const scenarioId = PRESET_SCENARIOS[0]?.id;

    expect(scenarioId).toBeTruthy();
    expect(engine.startScenario(scenarioId!)).toBe(false);
    expect(engine.getState().status).toBe('idle');
    expect(engine.getState().activeScenarioId).toBeNull();
    expect(error).toHaveBeenCalledWith(
      '[SimulationEngine] AURA_SIM_BASELINE_REQUIRED: refusing simulation start',
      ['No baseline KPIs configured'],
    );
  });

  it('starts when a non-empty baseline is configured', () => {
    const engine = new SimulationEngine({ pue: 1.3 });
    const scenarioId = PRESET_SCENARIOS[0]?.id;

    expect(scenarioId).toBeTruthy();
    expect(engine.startScenario(scenarioId!)).toBe(true);
    expect(engine.getState().status).toBe('running');
    engine.reset();
  });
});
