/**
 * Phase 1B.1 — Omniverse Provider (STUB)
 *
 * This provider is intentionally NON-FUNCTIONAL. It exists so the facade can
 * route `VITE_AURA_SIM_PROVIDER=omniverse` without falling back to demo data
 * silently. It NEVER performs network I/O, NEVER contacts NVIDIA Kit / DSX,
 * and NEVER throws into UI code.
 *
 * Behaviour:
 *   - default state: `disabled` — feature gate off.
 *   - when explicitly enabled via `VITE_AURA_OMNIVERSE_PROVIDER=enabled`:
 *     returns `not-implemented` outcomes.
 *   - all outcomes carry `provenance: 'unavailable'` so UI cannot fabricate
 *     a value.
 *
 * Any future real implementation MUST validate live Kit payloads through the
 * existing Zod schema (ADR-0006) before returning `kind: 'ok'` with
 * `provenance: 'live'` — and that path requires a separate schema exception
 * because today the simulation-provider outcome shape only allows
 * `simulated | demo` at `kind: 'ok'`.
 */

import type {
  ProviderOutcome,
  ScenarioDescriptor,
  ScenarioInput,
  SimulationProvider,
  SimulationRunPayload,
} from './types';

const PROVIDER_ID = 'omniverse' as const;

function isEnabled(): boolean {
  const raw = (import.meta as { env?: Record<string, string | undefined> }).env
    ?.VITE_AURA_OMNIVERSE_PROVIDER;
  return typeof raw === 'string' && raw.toLowerCase() === 'enabled';
}

export function createOmniverseProvider(
  options: { enabled?: boolean } = {},
): SimulationProvider {
  const enabled = options.enabled ?? isEnabled();

  const disabledOutcome = <T>(): ProviderOutcome<T> => ({
    kind: 'disabled',
    providerId: PROVIDER_ID,
    provenance: 'unavailable',
    reason:
      'omniverse provider is disabled (set VITE_AURA_OMNIVERSE_PROVIDER=enabled to route requests to the not-implemented stub)',
  });

  const notImplementedOutcome = <T>(op: string): ProviderOutcome<T> => ({
    kind: 'not-implemented',
    providerId: PROVIDER_ID,
    provenance: 'unavailable',
    reason: `omniverse provider does not yet implement ${op}; no NVIDIA Kit / DSX integration is present in this build`,
  });

  return {
    id: PROVIDER_ID,
    capabilities: {
      streaming: false,
      determinism: 'none',
      cancellable: true,
      live: false, // gated off; even a real Kit implementation would be scored per response
    },

    listScenarios(): ProviderOutcome<ScenarioDescriptor[]> {
      return enabled ? notImplementedOutcome('listScenarios') : disabledOutcome();
    },

    async runScenario(
      _input: ScenarioInput,
      signal?: AbortSignal,
    ): Promise<ProviderOutcome<SimulationRunPayload>> {
      if (signal?.aborted) {
        return { kind: 'cancelled', providerId: PROVIDER_ID, provenance: 'unavailable' };
      }
      return enabled ? notImplementedOutcome('runScenario') : disabledOutcome();
    },
  };
}