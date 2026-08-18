/**
 * Phase 2 - panel summary provider.
 *
 * Wraps `generateSimulationResult`, which builds the RCA / recommendation /
 * KPI-delta envelope shown in simulation panels. That engine draws random
 * numbers for its expected-vs-actual band, so it is `aura-stochastic-seeded`
 * and the orchestrator injects its generator. It ran on `Math.random()` before
 * Phase 2 and was mislabelled deterministic.
 */

import { generateSimulationResult } from '../../generateSimulationResult';
import type {
  ScenarioDefinition,
  SimulationEvent,
  SimulationResultSummary,
} from '../../types';
import type {
  CanonicalSimulationProvider,
  ProviderReadiness,
  ProviderResponse,
  SimulationExecutionContext,
  SimulationProviderDescriptor,
} from '../types';

export const PANEL_SUMMARY_PROVIDER_ID = 'aura-panel-summary' as const;

const descriptor: SimulationProviderDescriptor = {
  id: PANEL_SUMMARY_PROVIDER_ID,
  executionClass: 'aura-stochastic-seeded',
  version: '2.0.0',
  engineModule: 'src/simulation/generateSimulationResult.ts',
  supportedAnalyses: ['panel-summary'],
  supportsPreview: true,
  supportsAuthoritative: false,
  determinism: 'seeded-stochastic',
  requiresSeed: false,
  requiresExternalRuntime: false,
  runtimeEnvironment: 'browser',
  defaultTimeoutMs: 5_000,
  supportsCancellation: true,
  verificationLevel: 'unverified',
};

export interface PanelSummaryInput {
  scenario: ScenarioDefinition | null;
  events: SimulationEvent[];
  baselineKpis: Record<string, number>;
  currentKpis: Record<string, number>;
  durationSec: number;
}

export function createPanelSummaryProvider(): CanonicalSimulationProvider<SimulationResultSummary> {
  return {
    descriptor,
    readiness(): ProviderReadiness {
      return { ready: true, reason: null };
    },
    execute(ctx: SimulationExecutionContext): ProviderResponse<SimulationResultSummary> {
      const input = ctx.request.input as PanelSummaryInput;
      if (
        !input ||
        !input.baselineKpis ||
        !input.currentKpis ||
        typeof input.durationSec !== 'number' ||
        !Number.isFinite(input.durationSec)
      ) {
        throw new Error('panel summary requires baselineKpis, currentKpis and durationSec');
      }
      const value = generateSimulationResult(
        input.scenario,
        input.events ?? [],
        input.baselineKpis,
        input.currentKpis,
        input.durationSec,
        { random: ctx.random },
      );
      return { value };
    },
  };
}