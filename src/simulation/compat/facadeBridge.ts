/**
 * AURA_ARCHITECTURE_CONSOLIDATION_AND_NVIDIA_ALIGNMENT - Phase 4.
 *
 * Facade bridge for the frozen compatibility engines.
 *
 * The legacy data-centre and sovereign engines are pure functions that throw
 * on bad input and return untagged values. Every remaining consumer must go
 * through this bridge instead of importing the engines directly, so that:
 *
 *   - results carry an explicit `ProviderOutcome` envelope with provenance
 *     (`simulated`, never `measured`);
 *   - the declared execution class is `aura-deterministic` - no NVIDIA code
 *     or NVIDIA service participates in these runs;
 *   - a thrown engine error becomes a typed `error` outcome instead of
 *     crashing a React render.
 *
 * This is the migration seam recorded as `migrationTarget` for the frozen
 * engines in `src/simulation/engineRegistry.ts`. Behaviour of the engines
 * themselves is unchanged.
 */

import { assertOutcomeIntegrity } from '../providers/types';
import type {
  ProviderOutcome,
  SimulationExecutionClass,
} from '../providers/types';
import type {
  SovereignDCFacility,
  SovereignKpis,
  SimulationType,
} from '@/types/sovereignDataCenterTwin';
import {
  runSimulation as runSovereignEngine,
  createSimulationRun as createSovereignRunRecord,
  type SimulationParams as SovereignSimulationParams,
  type SimulationResult as SovereignSimulationResult,
} from './sovereignDataCenterEngine';

/** Every compat path is executed by AURA's own deterministic code. */
export const COMPAT_EXECUTION_CLASS: SimulationExecutionClass = 'aura-deterministic';

function okOutcome<T>(value: T, observedAt?: string): ProviderOutcome<T> {
  return {
    kind: 'ok',
    value,
    provenance: 'simulated',
    providerId: 'compatibility',
    observedAt: observedAt ?? new Date().toISOString(),
  };
}

function errorOutcome<T>(err: unknown): ProviderOutcome<T> {
  const message =
    err instanceof Error && typeof err.message === 'string'
      ? err.message.slice(0, 200)
      : 'compatibility engine raised a non-error value';
  return {
    kind: 'error',
    providerId: 'compatibility',
    provenance: 'unavailable',
    message,
    code: 'COMPAT_ENGINE_THREW',
  };
}

/** Wraps a compat engine call so it can never throw across the boundary. */
export function runCompatEngine<T>(fn: () => T, observedAt?: string): ProviderOutcome<T> {
  try {
    return assertOutcomeIntegrity(okOutcome(fn(), observedAt));
  } catch (err) {
    return errorOutcome<T>(err);
  }
}

export interface SovereignScenarioInput {
  baseKpis: SovereignKpis;
  type: SimulationType;
  params?: SovereignSimulationParams;
  facility?: SovereignDCFacility;
  observedAt?: string;
}

/**
 * Sovereign DC scenario run, routed through the facade envelope.
 * Consumers must branch on `outcome.kind` - there is no unwrapped value.
 */
export function runSovereignScenario(
  input: SovereignScenarioInput,
): ProviderOutcome<SovereignSimulationResult> {
  return runCompatEngine(
    () => runSovereignEngine(input.baseKpis, input.type, input.params ?? {}, input.facility),
    input.observedAt,
  );
}

/** Sovereign run record creation, wrapped in the same envelope. */
export function createSovereignRun(
  facilityId: string,
  type: SimulationType,
  params: Record<string, unknown>,
  result: SovereignSimulationResult,
  observedAt?: string,
) {
  return runCompatEngine(
    () => createSovereignRunRecord(facilityId, type, params as SovereignSimulationParams, result),
    observedAt,
  );
}
