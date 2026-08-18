/**
 * Phase 2 closure - sovereign data-centre scenario provider.
 *
 * Wraps the frozen sovereign compat engine (`runSimulation`), which is a pure
 * function over KPI inputs and draws no randomness at all - so it is genuinely
 * `aura-deterministic` and the orchestrator gives it no generator. Registering
 * it here removes the last application path that reached a simulation engine
 * without orchestration: `facadeBridge.runSovereignScenario` now dispatches
 * through the orchestrator and performs no calculation of its own.
 *
 * No NVIDIA code or NVIDIA service participates in these runs.
 */

import {
  runSimulation as runSovereignEngine,
  type SimulationParams,
  type SimulationResult,
} from '../../compat/sovereignDataCenterEngine';
import type {
  SovereignDCFacility,
  SovereignKpis,
  SimulationType,
} from '@/types/sovereignDataCenterTwin';
import type {
  CanonicalSimulationProvider,
  ProviderReadiness,
  ProviderResponse,
  SimulationExecutionContext,
  SimulationProviderDescriptor,
} from '../types';

export const SOVEREIGN_SCENARIO_PROVIDER_ID = 'aura-sovereign-scenario' as const;

const descriptor: SimulationProviderDescriptor = {
  id: SOVEREIGN_SCENARIO_PROVIDER_ID,
  executionClass: 'aura-deterministic',
  version: '2.0.0',
  engineModule: 'src/simulation/compat/sovereignDataCenterEngine.ts',
  supportedAnalyses: ['sovereign-scenario'],
  supportsPreview: true,
  supportsAuthoritative: false,
  determinism: 'deterministic',
  requiresSeed: false,
  requiresExternalRuntime: false,
  runtimeEnvironment: 'browser',
  defaultTimeoutMs: 5_000,
  supportsCancellation: false,
  verificationLevel: 'unverified',
};

export interface SovereignScenarioProviderInput {
  baseKpis: SovereignKpis;
  type: SimulationType;
  params?: SimulationParams;
  facility?: SovereignDCFacility;
}

export function createSovereignScenarioProvider(): CanonicalSimulationProvider<SimulationResult> {
  return {
    descriptor,
    readiness(): ProviderReadiness {
      return { ready: true, reason: null };
    },
    execute(ctx: SimulationExecutionContext): ProviderResponse<SimulationResult> {
      const input = ctx.request.input as SovereignScenarioProviderInput;
      if (!input?.baseKpis || !input?.type) {
        throw new Error('sovereign scenario requires baseKpis and a scenario type');
      }
      return {
        value: runSovereignEngine(input.baseKpis, input.type, input.params ?? {}, input.facility),
      };
    },
  };
}