/**
 * Deterministic workspace scenario engine.
 *
 * Produces SIMULATED before/after KPI sets, timeline events and rule-based
 * recommendations. No randomness at call time: identical inputs always
 * produce identical outputs so runs remain reproducible and auditable.
 */
import {
  DEFAULT_OVERRIDES,
  KPI_DESCRIPTORS,
  clamp,
  deriveKpis,
  seededRandom,
  type ConfigOverrides,
  type FacilityDefinition,
  type KpiKey,
  type KpiValues,
} from './facilityModel';
import { signalStrength, type SignalStrength } from '@/capabilities/recommendationSignal';

export interface ScenarioDescriptor {
  id: string;
  label: string;
  description: string;
  /** Multiplicative or additive stress applied to the modelled overrides. */
  stress: Partial<ConfigOverrides>;
  durationMinutes: number;
}

export const WORKSPACE_SCENARIOS: ScenarioDescriptor[] = [
  {
    id: 'baseline',
    label: 'Baseline operations',
    description: 'Design-point operation with the configured setpoints held constant.',
    stress: {},
    durationMinutes: 60,
  },
  {
    id: 'ai-training-surge',
    label: 'AI training surge',
    description: 'Sustained high-density training workload across all compute rows.',
    stress: { workloadDensityPct: 22 },
    durationMinutes: 120,
  },
  {
    id: 'cooling-loop-degradation',
    label: 'Cooling loop degradation',
    description: 'One cooling loop derated, raising effective supply temperature.',
    stress: { coolingSetpointC: 4 },
    durationMinutes: 90,
  },
  {
    id: 'grid-carbon-peak',
    label: 'Grid carbon peak',
    description: 'Regional grid mix shifts away from renewables during a demand peak.',
    stress: { renewableMixPct: -30 },
    durationMinutes: 180,
  },
  {
    id: 'power-cap-enforcement',
    label: 'Power cap enforcement',
    description: 'GPU power capping applied to hold facility draw under contract limits.',
    stress: { gpuPowerCapPct: -18 },
    durationMinutes: 60,
  },
];

export interface RunEvent {
  atMinute: number;
  subsystem: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface RunRecommendation {
  id: string;
  title: string;
  rationale: string;
  subsystem: string;
  signal: SignalStrength;
}

export type DecisionState = 'pending' | 'accepted' | 'rejected' | 'deferred';

export interface WorkspaceRun {
  id: string;
  scenarioId: string;
  scenarioLabel: string;
  facilityId: string;
  facilityName: string;
  startedAt: string;
  completedAt: string;
  overrides: ConfigOverrides;
  baseline: KpiValues;
  result: KpiValues;
  events: RunEvent[];
  recommendations: RunRecommendation[];
  decisions: Record<string, DecisionState>;
}

export function applyStress(overrides: ConfigOverrides, scenario: ScenarioDescriptor): ConfigOverrides {
  return {
    coolingSetpointC: clamp(overrides.coolingSetpointC + (scenario.stress.coolingSetpointC ?? 0), 16, 34),
    gpuPowerCapPct: clamp(overrides.gpuPowerCapPct + (scenario.stress.gpuPowerCapPct ?? 0), 40, 110),
    workloadDensityPct: clamp(overrides.workloadDensityPct + (scenario.stress.workloadDensityPct ?? 0), 5, 100),
    renewableMixPct: clamp(overrides.renewableMixPct + (scenario.stress.renewableMixPct ?? 0), 0, 100),
  };
}

/** Formats a stable run identifier. Sequence is derived from prior run count. */
export function formatRunId(now: Date, sequence: number): string {
  return `SIM-${now.toISOString().slice(0, 10)}-${String(sequence).padStart(3, '0')}`;
}

export function executeScenario(params: {
  facility: FacilityDefinition;
  overrides: ConfigOverrides;
  scenario: ScenarioDescriptor;
  runId: string;
  startedAt: string;
  completedAt: string;
}): WorkspaceRun {
  const { facility, overrides, scenario, runId, startedAt, completedAt } = params;
  const baseline = deriveKpis(facility, overrides);
  const stressed = applyStress(overrides, scenario);
  const result = deriveKpis(facility, stressed);

  const rng = seededRandom(`${facility.id}:${scenario.id}`);
  const events: RunEvent[] = [
    {
      atMinute: 0,
      subsystem: 'Facility',
      severity: 'info',
      message: `Scenario ${scenario.label} started against the modelled facility configuration.`,
    },
  ];

  if (result.thermalStability < baseline.thermalStability - 2) {
    events.push({
      atMinute: Math.round(scenario.durationMinutes * (0.2 + rng() * 0.2)),
      subsystem: 'Thermal',
      severity: result.thermalStability < 70 ? 'critical' : 'warning',
      message: `Modelled thermal stability falls to ${result.thermalStability.toFixed(0)}% as inlet temperature rises.`,
    });
  }
  if (result.pue > baseline.pue + 0.01) {
    events.push({
      atMinute: Math.round(scenario.durationMinutes * (0.4 + rng() * 0.2)),
      subsystem: 'Power',
      severity: 'warning',
      message: `Modelled PUE moves from ${baseline.pue.toFixed(2)} to ${result.pue.toFixed(2)}.`,
    });
  }
  if (result.carbonIntensity > baseline.carbonIntensity + 1) {
    events.push({
      atMinute: Math.round(scenario.durationMinutes * (0.5 + rng() * 0.2)),
      subsystem: 'Carbon',
      severity: 'warning',
      message: `Modelled carbon intensity increases to ${result.carbonIntensity.toFixed(0)} gCO2e/kWh.`,
    });
  }
  if (result.capacityHeadroom < 15) {
    events.push({
      atMinute: Math.round(scenario.durationMinutes * 0.7),
      subsystem: 'Capacity',
      severity: 'critical',
      message: `Modelled capacity headroom drops to ${result.capacityHeadroom.toFixed(0)}%.`,
    });
  }
  events.push({
    atMinute: scenario.durationMinutes,
    subsystem: 'Facility',
    severity: 'info',
    message: 'Scenario complete. Results frozen against this configuration snapshot.',
  });

  return {
    id: runId,
    scenarioId: scenario.id,
    scenarioLabel: scenario.label,
    facilityId: facility.id,
    facilityName: facility.name,
    startedAt,
    completedAt,
    overrides: stressed,
    baseline,
    result,
    events: events.sort((a, b) => a.atMinute - b.atMinute),
    recommendations: buildRecommendations(baseline, result, stressed),
    decisions: {},
  };
}

function buildRecommendations(
  baseline: KpiValues,
  result: KpiValues,
  overrides: ConfigOverrides,
): RunRecommendation[] {
  const recs: RunRecommendation[] = [];

  const thermalDrop = baseline.thermalStability - result.thermalStability;
  if (thermalDrop > 2) {
    recs.push({
      id: 'lower-setpoint',
      title: `Lower cooling setpoint by ${Math.min(4, Math.ceil(thermalDrop / 3))} C`,
      rationale: `Modelled thermal stability drops ${thermalDrop.toFixed(0)} points under this scenario. Reducing the setpoint restores the modelled margin at a small PUE cost.`,
      subsystem: 'Cooling',
      signal: signalStrength(clamp(60 + thermalDrop * 3, 0, 100)),
    });
  }
  if (result.pue > baseline.pue + 0.02) {
    recs.push({
      id: 'stage-workload',
      title: 'Stage workload ramp across cooling zones',
      rationale: `Modelled PUE rises to ${result.pue.toFixed(2)}. Staging the ramp keeps cooling demand inside the modelled efficiency band.`,
      subsystem: 'Power',
      signal: signalStrength(clamp(55 + (result.pue - baseline.pue) * 400, 0, 100)),
    });
  }
  if (result.capacityHeadroom < 20) {
    recs.push({
      id: 'reserve-headroom',
      title: 'Reserve headroom before further placement',
      rationale: `Modelled headroom is ${result.capacityHeadroom.toFixed(0)}%. Additional placement would exceed the modelled design envelope.`,
      subsystem: 'Capacity',
      signal: signalStrength(clamp(95 - result.capacityHeadroom * 2, 0, 100)),
    });
  }
  if (result.carbonIntensity > baseline.carbonIntensity + 1) {
    recs.push({
      id: 'shift-flexible-load',
      title: 'Shift flexible load away from the grid peak',
      rationale: `Modelled renewable mix of ${overrides.renewableMixPct}% raises carbon intensity to ${result.carbonIntensity.toFixed(0)} gCO2e/kWh.`,
      subsystem: 'Carbon',
      signal: signalStrength(clamp(50 + (result.carbonIntensity - baseline.carbonIntensity), 0, 100)),
    });
  }
  if (recs.length === 0) {
    recs.push({
      id: 'hold-configuration',
      title: 'Hold the current configuration',
      rationale: 'No modelled KPI crossed a defined rule threshold under this scenario.',
      subsystem: 'Facility',
      signal: signalStrength(90),
    });
  }
  return recs;
}

export function kpiDelta(run: WorkspaceRun, key: KpiKey): number {
  return run.result[key] - run.baseline[key];
}

export function deltaDirection(key: KpiKey, delta: number): 'better' | 'worse' | 'flat' {
  if (Math.abs(delta) < Number.EPSILON * 10) return 'flat';
  const better = KPI_DESCRIPTORS[key].lowerIsBetter ? delta < 0 : delta > 0;
  return better ? 'better' : 'worse';
}

export const BASELINE_OVERRIDES = DEFAULT_OVERRIDES;