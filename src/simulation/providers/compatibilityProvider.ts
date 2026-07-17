/**
 * Phase 1B.1 — Compatibility Provider
 *
 * Default provider selected when `VITE_AURA_SIM_PROVIDER` is unset or set to
 * `compatibility`. Preserves the current deterministic demo/simulation
 * behaviour: scenarios come from the existing registry; a `runScenario` call
 * synthesizes a deterministic result envelope using a seeded PRNG.
 *
 * NOTE: this provider is NOT wired into UI consumers in this slice. Consumer
 * migration is Phase 1B.2+. Today, only the provider tests exercise it.
 */

import type {
  ProviderOutcome,
  ScenarioDescriptor,
  ScenarioInput,
  SimulationProvider,
  SimulationRunPayload,
} from './types';
import { assertOutcomeIntegrity } from './types';
import {
  getAllScenarios,
  getScenarioById,
} from '../scenarioRegistry';
import type {
  KPISnapshot,
  ScenarioDefinition,
  SimulationEvent,
  SimulationResultSummary,
  SimulationKpiDelta,
} from '../types';

const PROVIDER_ID = 'compatibility' as const;
const DEFAULT_SEED = 0xA11A;

/** Mulberry32 — small, fast, seedable PRNG. Same family used by Phase 1A. */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function defaultBaseline(): Record<string, number> {
  return {
    pue: 1.35,
    gpuUtilization: 78,
    thermalStabilityScore: 92,
    powerReliabilityScore: 99,
    sovereignComplianceScore: 95,
    emissionsVsTarget: 88,
    coolingEfficiencyIndex: 90,
    networkIntegrityScore: 97,
    environmentalSafetyScore: 96,
    avgUpsRuntime: 12,
  };
}

/** Apply scenario timeline deltas deterministically. */
function computeFinalKpis(
  scenario: ScenarioDefinition,
  baseline: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = { ...baseline };
  for (const step of scenario.timeline) {
    for (const [k, v] of Object.entries(step.kpiDeltas)) {
      if (typeof v === 'number' && typeof out[k] === 'number') {
        out[k] = Number((out[k] + v).toFixed(3));
      }
    }
  }
  return out;
}

function buildEvents(scenario: ScenarioDefinition): SimulationEvent[] {
  return scenario.timeline.map((step, i) => ({
    id: `${scenario.id}#${i}`,
    timestamp: step.at,
    type: step.type,
    domain: step.domain,
    severity: step.severity,
    title: step.eventTitle,
    description: step.eventDescription,
    affectedRacks: step.affectedRacks,
    affectedZones: step.affectedZones,
    affectedClusters: step.affectedClusters,
  }));
}

function buildDeltas(
  baseline: Record<string, number>,
  finalKpis: Record<string, number>,
): SimulationKpiDelta[] {
  return Object.keys(baseline).map((id) => {
    const before = baseline[id];
    const after = finalKpis[id] ?? before;
    const diff = after - before;
    return {
      id,
      label: id,
      before,
      after,
      trend: Math.abs(diff) < 1e-6 ? 'stable' : diff > 0 ? 'up' : 'down',
      isGood: diff <= 0, // conservative — used only for envelope shape
    };
  });
}

function buildSummary(
  scenario: ScenarioDefinition,
  baseline: Record<string, number>,
  finalKpis: Record<string, number>,
  events: SimulationEvent[],
  rand: () => number,
): SimulationResultSummary {
  const deltas = buildDeltas(baseline, finalKpis);
  return {
    durationSec: scenario.durationSeconds,
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    kpiDeltas: deltas,
    events,
    rcaMarkdown: `Compatibility provider RCA for ${scenario.name}.`,
    recommendationsMarkdown: `Compatibility provider recommendations for ${scenario.name}.`,
    actualVsExpected: deltas.slice(0, 4).map((d) => {
      // Deterministic pseudo-variance from the seeded PRNG (NOT Math.random).
      const jitter = Math.round(rand() * 10 - 5);
      return {
        metric: d.label,
        expected: `${jitter >= 0 ? '+' : ''}${jitter}%`,
        actual: `${d.after >= d.before ? '+' : ''}${(d.after - d.before).toFixed(2)}`,
        withinRange: true,
      };
    }),
  };
}

export function createCompatibilityProvider(): SimulationProvider {
  return {
    id: PROVIDER_ID,
    capabilities: {
      streaming: false,
      determinism: 'seeded',
      cancellable: true,
      live: false,
    },

    listScenarios(): ProviderOutcome<ScenarioDescriptor[]> {
      const scenarios = getAllScenarios();
      return assertOutcomeIntegrity({
        kind: 'ok',
        providerId: PROVIDER_ID,
        provenance: 'demo',
        observedAt: new Date(0).toISOString(),
        value: scenarios.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          durationSeconds: s.durationSeconds,
        })),
      });
    },

    async runScenario(
      input: ScenarioInput,
      signal?: AbortSignal,
    ): Promise<ProviderOutcome<SimulationRunPayload>> {
      // Fail-closed input validation.
      if (!input || typeof input.scenarioId !== 'string' || input.scenarioId.length === 0) {
        return {
          kind: 'invalid-input',
          providerId: PROVIDER_ID,
          provenance: 'unavailable',
          message: 'scenarioId is required',
        };
      }

      if (signal?.aborted) {
        return { kind: 'cancelled', providerId: PROVIDER_ID, provenance: 'unavailable' };
      }

      const scenario = getScenarioById(input.scenarioId);
      if (!scenario) {
        return {
          kind: 'unavailable',
          providerId: PROVIDER_ID,
          provenance: 'unavailable',
          reason: `scenario not found: ${input.scenarioId}`,
        };
      }

      const seed = typeof input.seed === 'number' ? input.seed : DEFAULT_SEED;
      const baseline = { ...defaultBaseline(), ...(input.baselineKpis ?? {}) };
      const rand = mulberry32(seed);

      // Yield to the event loop so `signal` can fire mid-run.
      await Promise.resolve();
      if (signal?.aborted) {
        return { kind: 'cancelled', providerId: PROVIDER_ID, provenance: 'unavailable' };
      }

      const finalKpis = computeFinalKpis(scenario, baseline);
      const events = buildEvents(scenario);
      const summary = buildSummary(scenario, baseline, finalKpis, events, rand);

      const observedAt = typeof input.observedAt === 'string'
        ? input.observedAt
        : new Date(0).toISOString(); // deterministic default; caller supplies wall clock

      const payload: SimulationRunPayload = {
        summary,
        events,
        scenario,
        seedUsed: seed,
      };

      return assertOutcomeIntegrity({
        kind: 'ok',
        providerId: PROVIDER_ID,
        provenance: 'simulated',
        observedAt,
        value: payload,
      });
    },
  };
}

// Re-exports used by tests to stabilize the golden fixture shape.
export type { KPISnapshot };