/**
 * Phase 1B.1 — Simulation Provider Contract
 *
 * Every provider (compatibility / scenario-library / blueprint / omniverse)
 * MUST return a `ProviderOutcome<T>`. Providers NEVER throw across the API
 * boundary; failures, disabled state, cancellation and unsupported operations
 * are all typed outcomes so UI code cannot receive an untagged fabricated
 * value.
 *
 * See ADR-0007 and `docs/remediation/phase-1b-consolidation-design.md`.
 */

import type {
  ScenarioDefinition,
  SimulationEvent,
  SimulationResultSummary,
} from '../types';
import type { DataProvenance } from '@/lib/provenance/types';

/**
 * Stable identifiers. Adding a value is a design change; removing one is a
 * breaking change. `disabled` is reserved for the config-gated case.
 */
export type SimulationProviderId =
  | 'compatibility'
  | 'scenario-library'
  | 'blueprint'
  /** NVIDIA DSX Sim / specialist-solver boundary. Not implemented. */
  | 'nvidia-dsx-sim'
  /** Third-party CFD / electrical specialist solver boundary. Not implemented. */
  | 'specialist-solver'
  /** @deprecated naming alias for `nvidia-dsx-sim`. Kept for existing deep config. */
  | 'omniverse';

/**
 * Who actually executes the run. This is a truth field: it may never be set
 * to an NVIDIA class unless NVIDIA code or an NVIDIA service really runs.
 *
 * NVIDIA operational-readiness Phase 1: this file used to declare its own
 * four-value union containing `nvidia-dsx-sim` and `specialist-solver`, which
 * the hybrid runtime ADR names as non-taxonomy values. The canonical union in
 * `src/simulation/orchestrator/executionClass.ts` is now the only definition;
 * this is a re-export so both simulation surfaces cannot drift apart again.
 */
export type { SimulationExecutionClass } from '@/simulation/orchestrator/executionClass';
import type { SimulationExecutionClass } from '@/simulation/orchestrator/executionClass';

/** Declared capabilities let the facade route without instanceof-dispatch. */
export interface SimulationProviderCapabilities {
  /** Emits `subscribe()` ticks during a run. */
  streaming: boolean;
  /** `seeded` = byte-stable given (seed, input); `best-effort` = repeatable
   *  within a session; `none` = no repeatability guarantee. */
  determinism: 'seeded' | 'best-effort' | 'none';
  /** True when `runScenario` honours `AbortSignal.aborted`. */
  cancellable: boolean;
  /** True when the provider represents an actual live source. Compatibility
   *  and demo fixtures MUST be false. */
  live: boolean;
  /** Who executes the run. Never an NVIDIA class without a proven runtime. */
  executionClass: SimulationExecutionClass;
  /** True only when NVIDIA code or an NVIDIA service actually executes. */
  nvidiaIntegrated: boolean;
}

export interface ScenarioDescriptor {
  id: string;
  name: string;
  description: string;
  durationSeconds: number;
}

export interface ScenarioInput {
  scenarioId: string;
  /** Deterministic PRNG seed. Providers with `determinism='seeded'` MUST
   *  honour this and produce identical output for identical (seed, input). */
  seed?: number;
  /** Optional baseline overrides. Providers MUST NOT mutate the object. */
  baselineKpis?: Readonly<Record<string, number>>;
  /** Wall-clock capture point for `observedAt` in the result envelope. */
  observedAt?: string;
}

/**
 * Discriminated result envelope. `provenance` is REPEATED at the envelope
 * level so a UI accidentally destructuring `value` still carries the
 * provenance downstream. Provenance CANNOT be upgraded past what the
 * provider declares (see `assertOutcomeIntegrity`).
 */
export type ProviderOutcome<T> =
  | {
      kind: 'ok';
      value: T;
      provenance: Extract<DataProvenance, 'simulated' | 'demo'>;
      providerId: SimulationProviderId;
      /** ISO-8601 timestamp; freshness is derived by the provenance layer. */
      observedAt: string;
      isStale?: boolean;
    }
  | {
      kind: 'disabled';
      providerId: SimulationProviderId;
      provenance: Extract<DataProvenance, 'unavailable'>;
      reason: string;
    }
  | {
      kind: 'not-implemented';
      providerId: SimulationProviderId;
      provenance: Extract<DataProvenance, 'unavailable'>;
      reason: string;
    }
  | {
      kind: 'unavailable';
      providerId: SimulationProviderId;
      provenance: Extract<DataProvenance, 'unavailable'>;
      reason: string;
    }
  | {
      kind: 'cancelled';
      providerId: SimulationProviderId;
      provenance: Extract<DataProvenance, 'unavailable'>;
    }
  | {
      kind: 'invalid-input';
      providerId: SimulationProviderId;
      provenance: Extract<DataProvenance, 'unavailable'>;
      /** Sanitized human-readable message. MUST NOT include payload data. */
      message: string;
    }
  | {
      kind: 'error';
      providerId: SimulationProviderId;
      provenance: Extract<DataProvenance, 'unavailable'>;
      /** Sanitized message; stack traces MUST NOT be included. */
      message: string;
      code: string;
    };

/** Result payload for a completed `runScenario` invocation. */
export interface SimulationRunPayload {
  summary: SimulationResultSummary;
  events: SimulationEvent[];
  /** Full scenario definition used, echoed for traceability. */
  scenario: ScenarioDefinition;
  /** Deterministic seed actually applied (may differ from input if provider
   *  falls back to its default seed). */
  seedUsed: number;
}

export type Unsubscribe = () => void;

/** Provider contract. All async methods return outcomes; none throw. */
export interface SimulationProvider {
  readonly id: SimulationProviderId;
  readonly capabilities: SimulationProviderCapabilities;

  listScenarios(): ProviderOutcome<ScenarioDescriptor[]>;

  runScenario(
    input: ScenarioInput,
    signal?: AbortSignal,
  ): Promise<ProviderOutcome<SimulationRunPayload>>;

  subscribe?(
    input: ScenarioInput,
    sink: (evt: SimulationEvent) => void,
  ): Unsubscribe;
}

/**
 * Runtime guard: assert an outcome respects the provenance invariant.
 * Prevents any provider (or future refactor) from smuggling a non-demo /
 * non-simulated value past the facade. Returns the same outcome on success;
 * downgrades to `invalid-input` on violation. NEVER throws.
 */
export function assertOutcomeIntegrity<T>(
  outcome: ProviderOutcome<T>,
): ProviderOutcome<T> {
  if (outcome.kind === 'ok') {
    // A live/derived provenance is forbidden at the simulation boundary.
    if (outcome.provenance !== 'simulated' && outcome.provenance !== 'demo') {
      return {
        kind: 'invalid-input',
        providerId: outcome.providerId,
        provenance: 'unavailable',
        message: 'provider returned forbidden provenance for simulation outcome',
      };
    }
    if (typeof outcome.observedAt !== 'string' || outcome.observedAt.length === 0) {
      return {
        kind: 'invalid-input',
        providerId: outcome.providerId,
        provenance: 'unavailable',
        message: 'provider outcome missing observedAt timestamp',
      };
    }
  } else {
    const nonOk = outcome as Exclude<ProviderOutcome<T>, { kind: 'ok' }>;
    if (nonOk.provenance !== 'unavailable') {
      return {
        kind: 'invalid-input',
        providerId: nonOk.providerId,
        provenance: 'unavailable',
        message: 'non-ok outcome must carry unavailable provenance',
      };
    }
  }
  return outcome;
}