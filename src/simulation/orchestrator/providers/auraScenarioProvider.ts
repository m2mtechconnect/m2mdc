/**
 * Phase 2 - AURA scenario provider.
 *
 * Thin adapter over the existing compatibility provider (scenario registry +
 * seeded KPI deltas). It performs no simulation logic of its own; it exists so
 * the orchestrator owns seeding, hashing and provenance for that engine.
 *
 * Execution class is `aura-stochastic-seeded`, not `aura-deterministic`: the
 * engine draws from a PRNG for its actual-vs-expected band. The seed is always
 * recorded, so runs remain reproducible.
 */

import { createCompatibilityProvider } from '../../providers/compatibilityProvider';
import type { SimulationRunPayload } from '../../providers/types';
import type {
  CanonicalSimulationProvider,
  ProviderReadiness,
  ProviderResponse,
  SimulationExecutionContext,
  SimulationProviderDescriptor,
} from '../types';

export const AURA_SCENARIO_PROVIDER_ID = 'aura-scenario' as const;

const descriptor: SimulationProviderDescriptor = {
  id: AURA_SCENARIO_PROVIDER_ID,
  executionClass: 'aura-stochastic-seeded',
  version: '2.0.0',
  engineModule: 'src/simulation/providers/compatibilityProvider.ts',
  supportedAnalyses: ['scenario-run'],
  supportsPreview: true,
  // Browser execution may only produce previews. A server/worker deployment of
  // this same engine is Phase 3 work and will register its own descriptor.
  supportsAuthoritative: false,
  determinism: 'seeded-stochastic',
  requiresSeed: false,
  requiresExternalRuntime: false,
  runtimeEnvironment: 'browser',
  defaultTimeoutMs: 15_000,
  supportsCancellation: true,
  verificationLevel: 'unverified',
};

export interface AuraScenarioInput {
  scenarioId: string;
  baselineKpis?: Readonly<Record<string, number>>;
  observedAt?: string;
}

export function createAuraScenarioProvider(): CanonicalSimulationProvider<SimulationRunPayload> {
  const inner = createCompatibilityProvider();
  return {
    descriptor,
    readiness(): ProviderReadiness {
      return { ready: true, reason: null };
    },
    async execute(
      ctx: SimulationExecutionContext,
    ): Promise<ProviderResponse<SimulationRunPayload>> {
      const input = (ctx.request.input ?? {}) as AuraScenarioInput;
      const outcome = await inner.runScenario(
        {
          scenarioId: input.scenarioId,
          seed: ctx.seed ?? undefined,
          baselineKpis: input.baselineKpis,
          observedAt: input.observedAt,
        },
        ctx.signal,
      );
      if (outcome.kind !== 'ok') {
        const detail =
          'reason' in outcome ? outcome.reason : 'message' in outcome ? outcome.message : outcome.kind;
        throw new Error(`scenario engine returned ${outcome.kind}: ${detail}`);
      }
      return { value: outcome.value };
    },
  };
}