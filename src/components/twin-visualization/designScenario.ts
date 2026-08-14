/**
 * Simulated design scenario: SIM-LIQUID-COOLED-RACK-PILOT-001
 *
 * A scenario is a SIMULATED DESIGN OVERLAY. It never mutates the as-built
 * facility baseline and never becomes operational truth:
 *
 *  - the baseline rack array is left untouched; the scenario adds one
 *    scenario-only rack clone at a free position,
 *  - the scenario rack carries no telemetry (no temperature, no power, no
 *    utilisation) because no measurement exists for a rack that is not built,
 *  - every engineering input (flow rate, supply/return temperature, approach
 *    temperature, pressure drop, heat rejection) is explicitly unknown,
 *  - the scenario is opt-in through the URL and is off by default.
 *
 * URL control:  ?designScenario=SIM-LIQUID-COOLED-RACK-PILOT-001
 * Disable:      remove the parameter (or ?designScenario=off)
 */

import type { RackVisual } from './types';

export const LIQUID_RACK_SCENARIO_ID = 'SIM-LIQUID-COOLED-RACK-PILOT-001';

/** Operations derivative used by the scenario rack. */
export const SCENARIO_RACK_ASSET_ID = 'nvidia.rack.42u_a_01.ops';

/** Scenario rack id. The `sim:` prefix keeps it distinguishable everywhere. */
export const SCENARIO_RACK_ID = 'sim:rack:liquid-cooled-pilot-01';

export interface EngineeringInput {
  key: string;
  label: string;
  unit: string;
  /** Null means "no engineering data exists". It is never substituted. */
  value: number | null;
}

export interface DesignScenario {
  id: typeof LIQUID_RACK_SCENARIO_ID;
  label: string;
  /** Always SIMULATED - a design scenario can never be LIVE. */
  dataMode: 'SIMULATED';
  status: 'proposed-design';
  rackId: string;
  assetId: string;
  /** Human-readable statement of what the scenario does and does not assert. */
  description: string;
  /** Unresolved engineering inputs, surfaced verbatim in the UI. */
  engineeringInputs: EngineeringInput[];
  /**
   * Cooling connection state. `unverified` means the rack shows its own
   * rear-door heat exchanger and chilled-water risers as modelled by the
   * source asset, with NO claim that the facility loop is connected to it.
   */
  coolingConnection: 'unverified';
}

const UNRESOLVED_INPUTS: EngineeringInput[] = [
  { key: 'flowRate', label: 'Chilled-water flow rate', unit: 'L/min', value: null },
  { key: 'supplyTemp', label: 'Supply water temperature', unit: '°C', value: null },
  { key: 'returnTemp', label: 'Return water temperature', unit: '°C', value: null },
  { key: 'approachTemp', label: 'Approach temperature', unit: 'K', value: null },
  { key: 'pressureDrop', label: 'Loop pressure drop', unit: 'kPa', value: null },
  { key: 'heatRejection', label: 'Rear-door heat rejection', unit: 'kW', value: null },
];

export function buildLiquidRackScenario(): DesignScenario {
  return {
    id: LIQUID_RACK_SCENARIO_ID,
    label: 'Simulated design scenario - liquid-cooled rack pilot',
    dataMode: 'SIMULATED',
    status: 'proposed-design',
    rackId: SCENARIO_RACK_ID,
    assetId: SCENARIO_RACK_ASSET_ID,
    description:
      'Proposed liquid-cooled cabinet with a rear-door heat exchanger, placed for design review only. ' +
      'It is not part of the as-built facility, carries no telemetry, and asserts no connection to the facility chilled-water loop.',
    engineeringInputs: UNRESOLVED_INPUTS,
    coolingConnection: 'unverified',
  };
}

function readParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

/** Resolve the active design scenario from the URL. Off by default. */
export function resolveDesignScenario(search?: string): DesignScenario | null {
  const params = search === undefined ? readParams() : new URLSearchParams(search);
  const requested = params.get('designScenario');
  return requested === LIQUID_RACK_SCENARIO_ID ? buildLiquidRackScenario() : null;
}

/**
 * Place the scenario rack in free floor space beside the as-built layout so it
 * cannot be mistaken for, or overlap with, a commissioned rack.
 */
export function scenarioRackPosition(baseline: RackVisual[]): [number, number, number] {
  if (baseline.length === 0) return [0, 0, 0];
  const maxX = Math.max(...baseline.map((r) => r.position[0]));
  const zs = baseline.map((r) => r.position[2]);
  const midZ = (Math.min(...zs) + Math.max(...zs)) / 2;
  return [maxX + 2.4, 0, midZ];
}

export interface ScenarioRackVisual extends RackVisual {
  scenarioId: string;
  scenarioOnly: true;
}

export function isScenarioRack(rack: RackVisual): rack is ScenarioRackVisual {
  return (rack as ScenarioRackVisual).scenarioOnly === true;
}

/**
 * Returns the baseline racks plus the scenario rack. The baseline array and
 * every baseline rack object are returned unmodified.
 */
export function applyDesignScenario(
  baseline: RackVisual[],
  scenario: DesignScenario | null,
): RackVisual[] {
  if (!scenario) return baseline;
  const scenarioRack: ScenarioRackVisual = {
    id: scenario.rackId,
    name: 'Proposed liquid-cooled rack (simulated)',
    rowId: 'sim:row:design-scenario',
    position: scenarioRackPosition(baseline),
    heightU: 42,
    // No telemetry exists for a rack that is not built. Zero is not a reading;
    // the scenario rack is excluded from every telemetry overlay.
    utilizationPercent: 0,
    powerKw: 0,
    thermalCelsius: 0,
    isCritical: false,
    isAffected: false,
    cooling: {
      liquidCooled: true,
      rearDoorHeatExchanger: true,
      chilledWaterConnected: false,
    },
    scenarioId: scenario.id,
    scenarioOnly: true,
  };
  return [...baseline, scenarioRack];
}
