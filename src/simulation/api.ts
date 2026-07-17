/**
 * Phase 1B.1 — Simulation Facade
 *
 * Public entry point for future consumer migrations (Phase 1B.2+). Today
 * this facade is exercised ONLY by provider tests; no UI consumer imports
 * it yet, so behaviour of the running app is unchanged.
 *
 * Guarantees:
 *   - Flag selection via `resolveConfiguredProviderId`; unknown fails
 *     closed to `compatibility`.
 *   - Every outcome passes `assertOutcomeIntegrity`; provenance cannot be
 *     upgraded past what the provider declared.
 *   - The facade NEVER throws. A thrown provider error becomes a sanitized
 *     `kind: 'error'` outcome with `provenance: 'unavailable'`.
 */

import { assertOutcomeIntegrity } from './providers/types';
import type {
  ProviderOutcome,
  ScenarioDescriptor,
  ScenarioInput,
  SimulationProvider,
  SimulationProviderId,
  SimulationRunPayload,
} from './providers/types';
import {
  createDefaultRegistry,
  resolveConfiguredProviderId,
  type ProviderRegistry,
} from './providers/registry';

export interface SimulationFacade {
  readonly activeProviderId: SimulationProviderId;
  listScenarios(): ProviderOutcome<ScenarioDescriptor[]>;
  runScenario(
    input: ScenarioInput,
    signal?: AbortSignal,
  ): Promise<ProviderOutcome<SimulationRunPayload>>;
}

export interface FacadeOptions {
  registry?: ProviderRegistry;
  providerId?: SimulationProviderId;
  env?: Record<string, string | undefined>;
}

function toErrorOutcome<T>(
  providerId: SimulationProviderId,
  err: unknown,
): ProviderOutcome<T> {
  const message =
    err instanceof Error && typeof err.message === 'string'
      ? err.message.slice(0, 200)
      : 'provider raised a non-error value';
  return {
    kind: 'error',
    providerId,
    provenance: 'unavailable',
    message,
    code: 'PROVIDER_THREW',
  };
}

export function createSimulationFacade(opts: FacadeOptions = {}): SimulationFacade {
  const registry = opts.registry ?? createDefaultRegistry();
  const providerId = opts.providerId ?? resolveConfiguredProviderId(opts.env);
  const provider: SimulationProvider = registry.get(providerId);

  return {
    activeProviderId: provider.id,

    listScenarios() {
      try {
        return assertOutcomeIntegrity(provider.listScenarios());
      } catch (err) {
        return toErrorOutcome(provider.id, err);
      }
    },

    async runScenario(input, signal) {
      try {
        const outcome = await provider.runScenario(input, signal);
        return assertOutcomeIntegrity(outcome);
      } catch (err) {
        return toErrorOutcome(provider.id, err);
      }
    },
  };
}

// Re-exports for provider tests / future consumers.
export type {
  ProviderOutcome,
  ScenarioDescriptor,
  ScenarioInput,
  SimulationProvider,
  SimulationProviderId,
  SimulationRunPayload,
} from './providers/types';
export { resolveConfiguredProviderId } from './providers/registry';