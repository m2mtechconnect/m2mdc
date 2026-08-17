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

// PR-0.1 Checkpoint B7: browser-side feature flags are not permitted for
// Omniverse. The provider is always disabled in the client build; any
// re-enablement must ship through an authenticated server-side facade.
function isEnabled(): boolean {
  return false;
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
      'omniverse provider is disabled in this build; a server-mediated transport is required to enable it.',
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
      executionClass: 'nvidia-dsx-sim',
      // No NVIDIA code or service executes in this build. This flag may only
      // become true alongside a proven runtime connection and health check.
      nvidiaIntegrated: false,
      executionClass: 'nvidia-dsx-sim',
      // No NVIDIA code or service executes in this build. This flag may only
      // become true alongside a proven runtime connection and health check.
      nvidiaIntegrated: false,
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