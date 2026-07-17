/**
 * Phase 1B.1 — Provider Registry + Selection
 */

import type { SimulationProvider, SimulationProviderId } from './types';
import { createCompatibilityProvider } from './compatibilityProvider';
import { createOmniverseProvider } from './omniverseProvider';

export interface ProviderRegistry {
  get(id: SimulationProviderId): SimulationProvider;
  ids(): readonly SimulationProviderId[];
}

export function createDefaultRegistry(): ProviderRegistry {
  const providers = new Map<SimulationProviderId, SimulationProvider>();
  providers.set('compatibility', createCompatibilityProvider());
  providers.set('omniverse', createOmniverseProvider());
  // `scenario-library` and `blueprint` are declared but not instantiated;
  // requests for them fail closed to compatibility below.
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