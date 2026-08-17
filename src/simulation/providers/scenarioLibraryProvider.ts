/**
 * Phase 1B.5 — Scenario Library Provider (read-only)
 *
 * Folds the three historical scenario libraries behind a single facade seam:
 *
 *   1. `PRESET_SCENARIOS`     (src/simulation/scenarioRegistry.ts)
 *   2. `SIMULATION_SCENARIOS` (src/twins/dataCenter/simulationScenarios.ts)
 *   3. `ENHANCED_SCENARIOS`   (src/twins/sovereignDataCenter/enhancedSimulationEngine.ts)
 *
 * The three libraries have shape-incompatible definitions (see
 * `docs/remediation/phase-1b-plan.md`). Rather than force a lossy schema
 * migration in this slice, this provider exposes them as unified
 * `ScenarioDescriptor`s through a stable, namespaced id space:
 *
 *   preset:<id>     — canonical `ScenarioDefinition` (from scenarioRegistry)
 *   dc:<id>         — legacy `SimulationScenario` (DC master template)
 *   sovereign:<id>  — legacy `EnhancedScenario` (sovereign runner)
 *
 * Namespacing guarantees round-trippable lookup and prevents id collisions
 * across sources. Existing consumers keep importing the original constants;
 * this provider is a NEW read surface exposed via
 * `the simulation-provider selector=scenario-library`. `runScenario` returns a typed
 * `not-implemented` outcome — actual execution stays with `compatibility`
 * (or a future engine-specific provider) per ADR-0007.
 *
 * Provenance is `demo` — every source list is a bundled fixture, not a live
 * feed. This provider NEVER performs I/O and NEVER throws across the API
 * boundary.
 */

import type {
  ProviderOutcome,
  ScenarioDescriptor,
  ScenarioInput,
  SimulationProvider,
  SimulationRunPayload,
} from './types';
import { assertOutcomeIntegrity } from './types';
import { PRESET_SCENARIOS } from '../scenarioRegistry';
import { SIMULATION_SCENARIOS } from '@/twins/dataCenter/simulationScenarios';
import { ENHANCED_SCENARIOS } from '@/twins/sovereignDataCenter/enhancedSimulationEngine';

const PROVIDER_ID = 'scenario-library' as const;

export type ScenarioLibrarySource = 'preset' | 'dc' | 'sovereign';

/** Deterministic epoch — this is a bundled fixture, not a live feed. */
const OBSERVED_AT = new Date(0).toISOString();

function toDescriptors(): ScenarioDescriptor[] {
  const out: ScenarioDescriptor[] = [];
  const seen = new Set<string>();

  const push = (id: string, name: string, description: string, durationSeconds: number) => {
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ id, name, description, durationSeconds });
  };

  for (const s of PRESET_SCENARIOS) {
    push(`preset:${s.id}`, s.name, s.description, s.durationSeconds);
  }
  for (const s of SIMULATION_SCENARIOS) {
    // Legacy `duration` field is seconds per src/types/dataCenterTwin.ts.
    push(`dc:${s.id}`, s.name, s.description, s.duration);
  }
  for (const s of ENHANCED_SCENARIOS) {
    push(`sovereign:${s.id}`, s.name, s.description, s.duration_seconds);
  }

  return out;
}

/** Parse a namespaced id. Returns `null` for malformed / unknown namespaces. */
export function parseScenarioLibraryId(
  id: string,
): { source: ScenarioLibrarySource; localId: string } | null {
  if (typeof id !== 'string') return null;
  const idx = id.indexOf(':');
  if (idx <= 0 || idx === id.length - 1) return null;
  const ns = id.slice(0, idx);
  const localId = id.slice(idx + 1);
  if (ns === 'preset' || ns === 'dc' || ns === 'sovereign') {
    return { source: ns, localId };
  }
  return null;
}

export function createScenarioLibraryProvider(): SimulationProvider {
  return {
    id: PROVIDER_ID,
    capabilities: {
      streaming: false,
      // The descriptor list is a fixture derived from static constants —
      // repeatable across sessions, but not seed-parameterized.
      determinism: 'best-effort',
      cancellable: false,
      live: false,
      executionClass: 'fixture-preview',
      nvidiaIntegrated: false,
    },

    listScenarios(): ProviderOutcome<ScenarioDescriptor[]> {
      return assertOutcomeIntegrity({
        kind: 'ok',
        providerId: PROVIDER_ID,
        provenance: 'demo',
        observedAt: OBSERVED_AT,
        value: toDescriptors(),
      });
    },

    async runScenario(
      input: ScenarioInput,
      signal?: AbortSignal,
    ): Promise<ProviderOutcome<SimulationRunPayload>> {
      if (signal?.aborted) {
        return { kind: 'cancelled', providerId: PROVIDER_ID, provenance: 'unavailable' };
      }
      if (!input || typeof input.scenarioId !== 'string' || input.scenarioId.length === 0) {
        return {
          kind: 'invalid-input',
          providerId: PROVIDER_ID,
          provenance: 'unavailable',
          message: 'scenarioId is required',
        };
      }
      const parsed = parseScenarioLibraryId(input.scenarioId);
      if (!parsed) {
        return {
          kind: 'invalid-input',
          providerId: PROVIDER_ID,
          provenance: 'unavailable',
          message:
            'scenarioId must be namespaced (preset:<id>, dc:<id>, or sovereign:<id>)',
        };
      }
      return {
        kind: 'not-implemented',
        providerId: PROVIDER_ID,
        provenance: 'unavailable',
        reason:
          'scenario-library provider is read-only; run scenarios via the compatibility provider or a future engine-specific provider (ADR-0007)',
      };
    },
  };
}
