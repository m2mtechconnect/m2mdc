import { describe, it, expect } from 'vitest';
import {
  LIQUID_RACK_SCENARIO_ID,
  SCENARIO_RACK_ASSET_ID,
  applyDesignScenario,
  isScenarioRack,
  resolveDesignScenario,
  scenarioRackPosition,
} from '../designScenario';
import type { RackVisual } from '../types';

const baseline: RackVisual[] = [
  {
    id: 'rack-1', name: 'R1', rowId: 'row-a', position: [0, 0, 0], heightU: 42,
    utilizationPercent: 60, powerKw: 8, thermalCelsius: 24, isCritical: false, isAffected: false,
  },
  {
    id: 'rack-2', name: 'R2', rowId: 'row-a', position: [1.2, 0, 2], heightU: 42,
    utilizationPercent: 55, powerKw: 7, thermalCelsius: 23, isCritical: false, isAffected: false,
  },
];

describe('design scenario', () => {
  it('is off by default and only enabled by its exact id', () => {
    expect(resolveDesignScenario('')).toBeNull();
    expect(resolveDesignScenario('?designScenario=off')).toBeNull();
    expect(resolveDesignScenario('?designScenario=SIM-OTHER')).toBeNull();
    expect(resolveDesignScenario(`?designScenario=${LIQUID_RACK_SCENARIO_ID}`)).not.toBeNull();
  });

  it('never mutates the as-built baseline', () => {
    const snapshot = JSON.parse(JSON.stringify(baseline));
    const scenario = resolveDesignScenario(`?designScenario=${LIQUID_RACK_SCENARIO_ID}`);
    const racks = applyDesignScenario(baseline, scenario);
    expect(baseline).toEqual(snapshot);
    expect(racks).toHaveLength(baseline.length + 1);
    expect(racks.slice(0, 2)).toEqual(baseline);
  });

  it('marks the scenario rack as simulated with no telemetry and no loop connection', () => {
    const scenario = resolveDesignScenario(`?designScenario=${LIQUID_RACK_SCENARIO_ID}`)!;
    const rack = applyDesignScenario(baseline, scenario).at(-1)!;
    expect(isScenarioRack(rack)).toBe(true);
    expect(rack.cooling?.chilledWaterConnected).toBe(false);
    expect(scenario.coolingConnection).toBe('unverified');
    expect(scenario.dataMode).toBe('SIMULATED');
    expect(scenario.assetId).toBe(SCENARIO_RACK_ASSET_ID);
    expect(scenario.engineeringInputs.every((i) => i.value === null)).toBe(true);
  });

  it('places the scenario rack clear of the as-built layout', () => {
    const [x] = scenarioRackPosition(baseline);
    expect(x).toBeGreaterThan(Math.max(...baseline.map((r) => r.position[0])));
  });
});
