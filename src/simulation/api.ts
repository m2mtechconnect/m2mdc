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
  resolveProviderSelection,
  type ProviderRegistry,
} from './providers/registry';
import type {
  ScenarioDefinition,
  SimulationEvent,
  SimulationResultSummary,
} from './types';
import { simulationOrchestrator } from './orchestrator';
import { PANEL_SUMMARY_PROVIDER_ID } from './orchestrator/providers/panelSummaryProvider';
import type { SimulationProvenance } from './orchestrator/types';

export interface SimulationFacade {
  readonly activeProviderId: SimulationProviderId;
  /**
   * True when the configured provider id was recognized. False when the
   * env var held an unknown value; in that state every call returns a
   * typed `unavailable` outcome (never `ok`).
   */
  readonly isConfigured: boolean;
  listScenarios(): ProviderOutcome<ScenarioDescriptor[]>;
  runScenario(
    input: ScenarioInput,
    signal?: AbortSignal,
  ): Promise<ProviderOutcome<SimulationRunPayload>>;
  /**
   * Panel-oriented adapter. Phase 2: this no longer calls an engine directly;
   * it dispatches through the SimulationOrchestrator, which owns seeding,
   * hashing and provenance. The returned envelope is unchanged for callers.
   */
  generatePanelResult(
    input: PanelResultInput,
    signal?: AbortSignal,
  ): ProviderOutcome<SimulationResultSummary>;
  /** Provenance record for the most recent `generatePanelResult` call. */
  lastPanelProvenance(): SimulationProvenance | null;
}

export interface PanelResultInput {
  scenario: ScenarioDefinition | null;
  events: SimulationEvent[];
  baselineKpis: Record<string, number>;
  currentKpis: Record<string, number>;
  durationSec: number;
  observedAt?: string;
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

function unknownConfigOutcome<T>(rawSanitized: string): ProviderOutcome<T> {
  return {
    kind: 'unavailable',
    providerId: 'compatibility',
    provenance: 'unavailable',
    reason: `unknown simulation provider configured: ${rawSanitized}`,
  };
}

export function createSimulationFacade(opts: FacadeOptions = {}): SimulationFacade {
  const registry = opts.registry ?? createDefaultRegistry();
  let lastPanelProvenance: SimulationProvenance | null = null;

  // If the caller pinned a providerId explicitly, honour it verbatim.
  // Otherwise, use the richer selection helper so unknown env values
  // become typed unavailable outcomes instead of silent compatibility.
  let isConfigured = true;
  let unknownRaw = '';
  let providerId: SimulationProviderId;
  if (opts.providerId) {
    providerId = opts.providerId;
  } else {
    const sel = resolveProviderSelection(opts.env);
    if (sel.kind === 'unknown') {
      isConfigured = false;
      // Sanitize: cap length and strip non-printable/control chars so a
      // hostile env value can never inject into UI or logs.
      unknownRaw = sel.raw
        .replace(/[^\w.\-:/]/g, '?')
        .slice(0, 64);
      providerId = 'compatibility'; // placeholder; never actually invoked
    } else {
      providerId = sel.id;
    }
  }
  const provider: SimulationProvider = registry.get(providerId);

  return {
    activeProviderId: provider.id,
    isConfigured,

    lastPanelProvenance() {
      return lastPanelProvenance;
    },

    listScenarios() {
      if (!isConfigured) return unknownConfigOutcome<ScenarioDescriptor[]>(unknownRaw);
      try {
        return assertOutcomeIntegrity(provider.listScenarios());
      } catch (err) {
        return toErrorOutcome(provider.id, err);
      }
    },

    async runScenario(input, signal) {
      if (!isConfigured) return unknownConfigOutcome<SimulationRunPayload>(unknownRaw);
      try {
        const outcome = await provider.runScenario(input, signal);
        return assertOutcomeIntegrity(outcome);
      } catch (err) {
        return toErrorOutcome(provider.id, err);
      }
    },

    generatePanelResult(input, signal) {
      if (!isConfigured) {
        return unknownConfigOutcome<SimulationResultSummary>(unknownRaw);
      }
      // Phase 1B.2a.1 — honour caller cancellation. Cheap sync check
      // before and after engine invocation so a caller that aborted
      // between scheduling and effect flush receives a typed
      // `cancelled` outcome (never a stale `ok`).
      if (signal?.aborted) {
        return {
          kind: 'cancelled',
          providerId: provider.id,
          provenance: 'unavailable',
        };
      }
      // Input guard — the panel supplies these values from useSimulation,
      // so we validate defensively without leaking payload contents.
      if (
        !input ||
        !input.baselineKpis ||
        !input.currentKpis ||
        typeof input.durationSec !== 'number' ||
        !Number.isFinite(input.durationSec)
      ) {
        return {
          kind: 'invalid-input',
          providerId: provider.id,
          provenance: 'unavailable',
          message: 'panel result requires baselineKpis, currentKpis, and durationSec',
        };
      }
      try {
        const outcome = simulationOrchestrator.runSync<SimulationResultSummary>(
          {
            providerId: PANEL_SUMMARY_PROVIDER_ID,
            analysis: 'panel-summary',
            intent: 'preview',
            input: {
              scenario: input.scenario,
              events: input.events,
              baselineKpis: input.baselineKpis,
              currentKpis: input.currentKpis,
              durationSec: input.durationSec,
            },
          },
          signal,
        );
        lastPanelProvenance = outcome.provenance;
        if (outcome.kind !== 'ok') {
          if (outcome.reason === 'cancelled') {
            return { kind: 'cancelled', providerId: provider.id, provenance: 'unavailable' };
          }
          if (outcome.reason === 'invalid-request' || outcome.reason === 'provider-threw') {
            return {
              kind: 'invalid-input',
              providerId: provider.id,
              provenance: 'unavailable',
              message: outcome.message,
            };
          }
          return {
            kind: 'unavailable',
            providerId: provider.id,
            provenance: 'unavailable',
            reason: outcome.message,
          };
        }
        if (signal?.aborted) {
          return {
            kind: 'cancelled',
            providerId: provider.id,
            provenance: 'unavailable',
          };
        }
        const observedAt = input.observedAt ?? new Date().toISOString();
        return assertOutcomeIntegrity({
          kind: 'ok',
          providerId: provider.id,
          provenance: 'simulated',
          observedAt,
          value: outcome.value,
        });
      } catch (err) {
        return toErrorOutcome<SimulationResultSummary>(provider.id, err);
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
export {
  resolveConfiguredProviderId,
  resolveProviderSelection,
} from './providers/registry';