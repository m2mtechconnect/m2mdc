/**
 * Runs the real AURA simulation engine against the visitor's own blueprint
 * specification, on the public estimator surface.
 *
 * The baseline KPI set is derived deterministically from the design inputs and
 * the estimator report. The scenario timeline is the same preset registry the
 * authenticated workspace uses, executed through the same `SimulationEngine`
 * implementation. Output is SIMULATED design-time output; it is never measured
 * telemetry, and no backend, tenant, or facility data is read.
 */
import { SimulationEngine } from '@/simulation/SimulationEngine';
import { getScenarioById } from '@/simulation/scenarioRegistry';
import { getKpiValue } from '@/lib/kpiKeyMap';
import type {
  BlueprintEstimatorInput,
  BlueprintEstimatorResult,
  CoolingTopology,
} from './publicBlueprintEstimator';

/** Scenarios exposed on the public surface, in presentation order. */
export const PUBLIC_SCENARIO_IDS = [
  'gpu_spike_training_job',
  'cooling_failure_hot_aisle',
  'ups_failure_runtime_drop',
  'grid_outage_ups_generator_failover',
] as const;

export type PublicScenarioId = (typeof PUBLIC_SCENARIO_IDS)[number];

export interface ScenarioRunEvent {
  id: string;
  at: number;
  type: string;
  severity: string;
  title: string;
  description: string;
  pue: number;
}

export interface ScenarioRunResult {
  scenarioId: string;
  scenarioName: string;
  scenarioDescription: string;
  durationSeconds: number;
  /** PUE the design settles at with no scenario applied. */
  designPue: number;
  /** Worst PUE reached at any point in the timeline. */
  peakPue: number;
  /** PUE once the timeline has completed (post-recovery). */
  endPue: number;
  /** Facility electrical load at the worst point, in kW. */
  peakFacilityKw: number;
  /** Load above the design point at the worst moment, in kW. */
  peakOverheadKw: number;
  /** Cost of that overhead if it were sustained for one hour. */
  peakOverheadCostPerHour: number;
  /** Carbon of that overhead if it were sustained for one hour, in kg CO2e. */
  peakOverheadKgCo2ePerHour: number;
  lowestCoolingEfficiency: number;
  lowestThermalStability: number;
  highestHotspotRisk: number;
  criticalEventCount: number;
  events: ScenarioRunEvent[];
}

/** Cooling headroom the design starts with, by topology. */
const COOLING_EFFICIENCY_INDEX: Record<CoolingTopology, number> = {
  air: 72,
  'rear-door': 82,
  'direct-liquid': 90,
  immersion: 94,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Derive the engine's starting KPI set from the visitor's design. Every value
 * is a function of the entered specification, not a stored fixture.
 */
export function deriveBaselineKpis(
  input: BlueprintEstimatorInput,
  report: BlueprintEstimatorResult,
): Record<string, number> {
  const coolingIndex = COOLING_EFFICIENCY_INDEX[input.coolingTopology];
  // Density beyond the topology's comfort point erodes thermal headroom.
  const densityStress = clamp((input.rackDensityKw - 15) / 2, 0, 30);
  const climateStress = input.climate === 'hot' ? 8 : input.climate === 'cold' ? 0 : 4;

  return {
    effectivePue: report.pue,
    avgGpuUtilization: clamp(input.utilisationPct, 0, 100),
    coolingEfficiencyIndex: round(clamp(coolingIndex - climateStress, 0, 100), 1),
    thermalStabilityScore: round(clamp(coolingIndex - densityStress / 2 - climateStress, 0, 100), 1),
    hotspotRiskProbability: round(clamp(densityStress / 2 + climateStress / 2, 0, 100), 1),
    upsHealthIndex: 96,
    powerReliabilityScore: 98,
    avgUpsRuntime: 15,
    environmentalSafetyScore: 95,
    earlyWarningIndex: 90,
    waterLeakRisk: 4,
    itLoadKw: report.itLoadKw,
    facilityLoadKw: report.facilityLoadKw,
  };
}

/**
 * Execute a preset scenario headlessly through the production engine and
 * summarise the resulting KPI trajectory.
 */
export function runPublicScenario(
  scenarioId: string,
  input: BlueprintEstimatorInput,
  report: BlueprintEstimatorResult,
): ScenarioRunResult | null {
  const scenario = getScenarioById(scenarioId);
  if (!scenario) return null;

  const baseline = deriveBaselineKpis(input, report);
  const engine = new SimulationEngine(baseline);

  if (!engine.startScenario(scenarioId)) return null;
  // Drive the timeline deterministically instead of on the wall-clock tick loop.
  engine.pause();
  engine.seekTo(scenario.durationSeconds);

  const state = engine.getState();
  const events = state.events;

  const designPue = report.pue;
  let peakPue = designPue;
  let lowestCooling = getKpiValue(baseline, 'coolingEfficiencyIndex', 0);
  let lowestThermal = getKpiValue(baseline, 'thermalStabilityScore', 0);
  let highestHotspot = getKpiValue(baseline, 'hotspotRiskProbability', 0);
  let criticalEventCount = 0;

  const runEvents: ScenarioRunEvent[] = events.map((event) => {
    const snapshot = (event.kpiSnapshot ?? {}) as Record<string, number>;
    const pue = getKpiValue(snapshot, 'effectivePue', designPue) || designPue;
    peakPue = Math.max(peakPue, pue);
    lowestCooling = Math.min(lowestCooling, getKpiValue(snapshot, 'coolingEfficiencyIndex', lowestCooling));
    lowestThermal = Math.min(lowestThermal, getKpiValue(snapshot, 'thermalStabilityScore', lowestThermal));
    highestHotspot = Math.max(highestHotspot, getKpiValue(snapshot, 'hotspotRiskProbability', highestHotspot));
    if (event.severity === 'critical') criticalEventCount += 1;

    return {
      id: event.id,
      at: event.timestamp,
      type: event.type,
      severity: event.severity,
      title: event.title,
      description: event.description,
      pue: round(pue, 3),
    };
  });

  const endPue = getKpiValue(state.currentKpis, 'effectivePue', designPue) || designPue;

  // Load scaling: the estimator's IT load is fixed, so facility load tracks PUE.
  const peakFacilityKw = report.itLoadKw * peakPue;
  const peakOverheadKw = Math.max(0, peakFacilityKw - report.facilityLoadKw);
  const peakOverheadCostPerHour = peakOverheadKw * input.electricityPricePerKwh;
  const peakOverheadKgCo2ePerHour = (peakOverheadKw * report.gridIntensityGPerKwh) / 1000;

  engine.reset();

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    scenarioDescription: scenario.description,
    durationSeconds: scenario.durationSeconds,
    designPue: round(designPue, 3),
    peakPue: round(peakPue, 3),
    endPue: round(endPue, 3),
    peakFacilityKw: round(peakFacilityKw, 1),
    peakOverheadKw: round(peakOverheadKw, 1),
    peakOverheadCostPerHour: round(peakOverheadCostPerHour, 2),
    peakOverheadKgCo2ePerHour: round(peakOverheadKgCo2ePerHour, 2),
    lowestCoolingEfficiency: round(lowestCooling, 1),
    lowestThermalStability: round(lowestThermal, 1),
    highestHotspotRisk: round(highestHotspot, 1),
    criticalEventCount,
    events: runEvents,
  };
}
