/**
 * Phase 2 - fail-closed external runtime providers.
 *
 * These providers exist so a request for an NVIDIA or third-party solver is
 * answered with a typed, provenance-carrying failure instead of silently
 * falling back to an AURA engine. They never compute a value locally.
 *
 * `readiness()` returns false in every build. It may only return true when a
 * real solver endpoint answers a health check and the run returns an external
 * job identifier - the orchestrator additionally rejects any response from a
 * `requiresExternalRuntime` provider that lacks that identifier.
 */

import type {
  CanonicalSimulationProvider,
  ProviderReadiness,
  SimulationProviderDescriptor,
} from '../types';

export const NVIDIA_SOLVER_PROVIDER_ID = 'nvidia-solver' as const;
export const EXTERNAL_SOLVER_PROVIDER_ID = 'external-solver' as const;

const NVIDIA_REASON =
  'No NVIDIA solver service is reachable from this build. Simulation results cannot be attributed to NVIDIA until a server-mediated solver endpoint answers a health check.';
const EXTERNAL_REASON =
  'No third-party solver endpoint is configured. External-solver results are unavailable in this build.';

function fixed(descriptor: SimulationProviderDescriptor, reason: string): CanonicalSimulationProvider<never> {
  return {
    descriptor,
    readiness(): ProviderReadiness {
      return { ready: false, reason };
    },
    execute(): never {
      // Unreachable: the orchestrator refuses a provider that is not ready.
      throw new Error(reason);
    },
  };
}

export function createNvidiaSolverProvider(): CanonicalSimulationProvider<never> {
  return fixed(
    {
      id: NVIDIA_SOLVER_PROVIDER_ID,
      executionClass: 'nvidia-solver',
      version: '0.0.0-unavailable',
      engineModule: 'src/simulation/providers/omniverseProvider.ts',
      supportedAnalyses: ['scenario-run', 'thermal-cfd'],
      supportsPreview: false,
      supportsAuthoritative: true,
      determinism: 'none',
      requiresSeed: false,
      requiresExternalRuntime: true,
      runtimeEnvironment: 'external',
      defaultTimeoutMs: 120_000,
      supportsCancellation: true,
      verificationLevel: 'unverified',
    },
    NVIDIA_REASON,
  );
}

export function createExternalSolverProvider(): CanonicalSimulationProvider<never> {
  return fixed(
    {
      id: EXTERNAL_SOLVER_PROVIDER_ID,
      executionClass: 'external-solver',
      version: '0.0.0-unavailable',
      engineModule: 'src/simulation/providers/omniverseProvider.ts',
      supportedAnalyses: ['scenario-run', 'thermal-cfd', 'electrical'],
      supportsPreview: false,
      supportsAuthoritative: true,
      determinism: 'none',
      requiresSeed: false,
      requiresExternalRuntime: true,
      runtimeEnvironment: 'external',
      defaultTimeoutMs: 120_000,
      supportsCancellation: true,
      verificationLevel: 'unverified',
    },
    EXTERNAL_REASON,
  );
}