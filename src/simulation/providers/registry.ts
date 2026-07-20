/**
 * Phase 1B.1 — Provider Registry + Selection
 */

import type { SimulationProvider, SimulationProviderId } from './types';
import { createCompatibilityProvider } from './compatibilityProvider';
import { createOmniverseProvider } from './omniverseProvider';
import { createScenarioLibraryProvider } from './scenarioLibraryProvider';

export interface ProviderRegistry {
  get(id: SimulationProviderId): SimulationProvider;
  ids(): readonly SimulationProviderId[];
}

export function createDefaultRegistry(): ProviderRegistry {
  const providers = new Map<SimulationProviderId, SimulationProvider>();
  providers.set('compatibility', createCompatibilityProvider());
  providers.set('omniverse', createOmniverseProvider());
  // Phase 1B.5 — read-only scenario library provider (folds the three
  // historical scenario constants behind the facade seam).
  providers.set('scenario-library', createScenarioLibraryProvider());
  // `blueprint` remains declared-but-not-instantiated; requests for it
  // fail closed to compatibility below (Phase 1B.6+).
  return {
    get(id) {
      return providers.get(id) ?? providers.get('compatibility')!;
    },
    ids() {
      return Array.from(providers.keys());
    },
  };
}

const KNOWN_IDS: readonly SimulationProviderId[] = [
  'compatibility',
  'scenario-library',
  'blueprint',
  'omniverse',
];

/**
 * Resolve the configured provider id. Unknown / missing values fail closed
 * to `compatibility`. Only place env parsing happens.
 */
export function resolveConfiguredProviderId(
  env?: Record<string, string | undefined>,
): SimulationProviderId {
  const raw = (env ?? (import.meta as { env?: Record<string, string | undefined> }).env)
    ?.VITE_AURA_SIM_PROVIDER;
  if (typeof raw !== 'string') return 'compatibility';
  const normalized = raw.trim().toLowerCase() as SimulationProviderId;
  return KNOWN_IDS.includes(normalized) ? normalized : 'compatibility';
}

/**
 * Phase 1B.2a — richer selection helper used by the facade.
 *
 * Unlike `resolveConfiguredProviderId` (which fails closed to
 * `compatibility` for back-compat with Phase 1B.1 tests and callers),
 * this returns a discriminated result so the facade can convert an
 * unknown configuration into a typed `unavailable` outcome instead of
 * silently selecting compatibility.
 */
export type ProviderSelection =
  | { kind: 'default'; id: SimulationProviderId }
  | { kind: 'known'; id: SimulationProviderId; raw: string }
  | { kind: 'unknown'; raw: string };

export function resolveProviderSelection(
  env?: Record<string, string | undefined>,
): ProviderSelection {
  const raw = (env ?? (import.meta as { env?: Record<string, string | undefined> }).env)
    ?.VITE_AURA_SIM_PROVIDER;
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { kind: 'default', id: 'compatibility' };
  }
  const normalized = raw.trim().toLowerCase() as SimulationProviderId;
  if (KNOWN_IDS.includes(normalized)) {
    return { kind: 'known', id: normalized, raw };
  }
  return { kind: 'unknown', raw };
}