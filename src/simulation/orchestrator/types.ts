/**
 * Phase 2 - canonical simulation contracts.
 *
 * One request type, one result type, one provenance record, one provider
 * interface. Every active simulation or preview consumer goes through the
 * orchestrator that implements these types.
 */

import type { SimulationExecutionClass } from './executionClass';
import type { SeededRandom } from './prng';

/** Preview output may inform a user; authoritative output may be a record. */
export type SimulationIntent = 'preview' | 'authoritative';

export type RuntimeEnvironment = 'browser' | 'server' | 'worker' | 'external';

export type VerificationLevel =
  | 'unverified'
  | 'self-reported'
  | 'server-validated'
  | 'externally-validated';

export type DeterminismClass = 'deterministic' | 'seeded-stochastic' | 'none';

export interface SimulationProviderDescriptor {
  /** Stable orchestrator-level provider id. */
  id: string;
  executionClass: SimulationExecutionClass;
  /** Version of the provider AND the engine it dispatches to. */
  version: string;
  /** Module implementing the actual computation, for the engine registry. */
  engineModule: string;
  /** Analyses this provider accepts. An unlisted analysis is rejected. */
  supportedAnalyses: readonly string[];
  supportsPreview: boolean;
  supportsAuthoritative: boolean;
  determinism: DeterminismClass;
  /** True when the provider cannot run without a seed. */
  requiresSeed: boolean;
  /** True when an external runtime must answer for the run to succeed. */
  requiresExternalRuntime: boolean;
  runtimeEnvironment: RuntimeEnvironment;
  defaultTimeoutMs: number;
  supportsCancellation: boolean;
  verificationLevel: VerificationLevel;
}

export interface ProviderReadiness {
  ready: boolean;
  /** Required when `ready` is false. Shown to users verbatim. */
  reason: string | null;
}

export interface SimulationRequest {
  providerId: string;
  /** Named analysis, e.g. `scenario-run`, `panel-summary`, `sovereign-scenario`. */
  analysis: string;
  intent: SimulationIntent;
  /** Everything that materially determines the result. Hashed verbatim. */
  input: unknown;
  /** Tuning that is not part of the physical input. Hashed separately. */
  configuration?: Record<string, unknown>;
  /** Explicit seed for stochastic providers. Derived from the request if absent. */
  seed?: number;
  tenantId?: string | null;
  facilityId?: string | null;
  twinId?: string | null;
  requestedAt?: string;
  timeoutMs?: number;
}

export interface SimulationProvenance {
  runId: string;
  tenantId: string | null;
  facilityId: string | null;
  twinId: string | null;
  providerId: string;
  executionClass: SimulationExecutionClass;
  providerVersion: string;
  engineModule: string;
  analysis: string;
  intent: SimulationIntent;
  /** Null only for `deterministic` providers. */
  seed: number | null;
  prngAlgorithm: string | null;
  inputHash: string;
  configurationHash: string;
  /** Hash of the returned value; `null` when nothing was produced. */
  outputHash: string | null;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  runtimeEnvironment: RuntimeEnvironment;
  externalJobId: string | null;
  verificationLevel: VerificationLevel;
  failureReason: string | null;
}

export type SimulationFailureReason =
  | 'provider-unknown'
  | 'provider-not-ready'
  | 'analysis-unsupported'
  | 'intent-unsupported'
  | 'authoritative-runtime-unavailable'
  | 'invalid-request'
  | 'cancelled'
  | 'timeout'
  | 'provider-threw'
  | 'provider-contract-violation'
  | 'provider-not-synchronous'
  | 'seed-missing';

export type SimulationOutcome<T> =
  | { kind: 'ok'; value: T; provenance: SimulationProvenance }
  | {
      kind: 'failed';
      reason: SimulationFailureReason;
      /** Sanitized, safe to render. Never contains payload data or stacks. */
      message: string;
      provenance: SimulationProvenance;
    };

export interface SimulationExecutionContext {
  runId: string;
  request: SimulationRequest;
  /** Present for seeded providers; null for pure deterministic providers. */
  seed: number | null;
  /** Only source of randomness a provider may use. */
  random: SeededRandom;
  signal?: AbortSignal;
  startedAt: string;
}

export interface ProviderResponse<T = unknown> {
  value: T;
  /** Session/job identifier from an external runtime, when one exists. */
  externalJobId?: string | null;
}

export interface CanonicalSimulationProvider<T = unknown> {
  readonly descriptor: SimulationProviderDescriptor;
  readiness(): ProviderReadiness;
  execute(ctx: SimulationExecutionContext): ProviderResponse<T> | Promise<ProviderResponse<T>>;
}

/* ------------------------------------------------- streaming preview seam */

/**
 * Builder step 5 and other tick-driven previews do not return a value; they
 * open a session that emits events. They are still orchestrated, so they still
 * declare a descriptor, readiness and provenance.
 */
export interface PreviewSessionProvider<S = unknown> {
  readonly descriptor: SimulationProviderDescriptor;
  readiness(): ProviderReadiness;
  openSession(ctx: SimulationExecutionContext): S;
}

export type PreviewSessionOutcome<S> =
  | { kind: 'ok'; session: S; provenance: SimulationProvenance }
  | { kind: 'failed'; reason: SimulationFailureReason; message: string; provenance: SimulationProvenance };