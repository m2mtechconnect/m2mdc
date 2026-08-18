/**
 * Phase 2 - the SimulationOrchestrator.
 *
 * The single runtime entry point for starting simulation or preview
 * execution. It validates the request, selects an eligible provider, refuses
 * providers that are not ready or not permitted for the requested intent,
 * builds the execution context (including the seeded generator), runs the
 * provider, validates the response and emits provenance for every outcome -
 * success or failure.
 *
 * Nothing here fabricates a value. A provider that cannot run yields a
 * `failed` outcome whose provenance records execution class `unavailable`.
 */

import { CANONICAL_SCHEMA_VERSION, hashCanonical } from './canonical';
import {
  deriveSeed,
  mulberry32,
  newIdentifier,
  PRNG_ALGORITHM,
  SEED_DERIVATION_ALGORITHM,
} from './prng';
import { isSimulationExecutionClass } from './executionClass';
import { startExecutionTimer, UNAVAILABLE_DURATION, type ExecutionTimer } from './timing';
import type {
  CanonicalSimulationProvider,
  PreviewSessionOutcome,
  PreviewSessionProvider,
  ProviderResponse,
  SimulationExecutionContext,
  SimulationFailureReason,
  SimulationOutcome,
  SimulationProvenance,
  SimulationProviderDescriptor,
  SimulationRequest,
} from './types';
import { SIMULATION_REQUEST_SCHEMA_VERSION } from './types';

export interface OrchestratorOptions {
  providers?: CanonicalSimulationProvider[];
  previewProviders?: PreviewSessionProvider[];
  /** Injected clock so provenance timestamps are testable. */
  now?: () => Date;
}

export interface SimulationOrchestrator {
  describeProviders(): SimulationProviderDescriptor[];
  describeProvider(id: string): SimulationProviderDescriptor | null;
  /**
   * Registers a provider. Idempotent for an identical registration; a second,
   * conflicting registration under the same id throws rather than silently
   * replacing a provider mid-flight.
   */
  register(provider: CanonicalSimulationProvider | PreviewSessionProvider): void;
  /** Async entry point. Use for any provider that may await. */
  run<T = unknown>(request: SimulationRequest, signal?: AbortSignal): Promise<SimulationOutcome<T>>;
  /** Synchronous entry point for providers that declare synchronous execution. */
  runSync<T = unknown>(request: SimulationRequest, signal?: AbortSignal): SimulationOutcome<T>;
  /** Tick-driven preview sessions (builder step 5). */
  openPreviewSession<S = unknown>(request: SimulationRequest): PreviewSessionOutcome<S>;
}

interface Prepared {
  provider: CanonicalSimulationProvider | PreviewSessionProvider;
  ctx: SimulationExecutionContext;
  base: SimulationProvenance;
  timer: ExecutionTimer;
}

type FailedOutcome = Extract<SimulationOutcome<never>, { kind: 'failed' }>;

type PrepareResult =
  | { ok: true; prepared: Prepared; failure?: undefined }
  | { ok: false; prepared?: undefined; failure: FailedOutcome };

/**
 * Terminal failure. The outcome execution class becomes `unavailable`, but the
 * requested provider identity is preserved: `requestedProviderId` and
 * `requestedExecutionClass` still say what was asked for, and the readiness
 * answer, structured code and message say what happened instead.
 */
function fail<T>(
  base: SimulationProvenance,
  reason: SimulationFailureReason,
  message: string,
  timer: ExecutionTimer,
): SimulationOutcome<T> & { kind: 'failed' } {
  const t = timer.stop();
  const clipped = message.slice(0, 300);
  return {
    kind: 'failed',
    reason,
    message: clipped,
    provenance: {
      ...base,
      executionClass: 'unavailable',
      outputHash: null,
      externalJobId: null,
      completedAt: t.completedAt,
      durationMs: t.durationMs,
      durationSource: t.durationSource,
      failureCode: reason,
      failureMessage: clipped,
    },
  };
}

/**
 * Reproducibility hash input. Timestamps, run ids and tenancy are excluded on
 * purpose: two faithful reproductions of the same run must agree here.
 */
function reproducibilityInput(p: SimulationProvenance) {
  return {
    requestSchemaVersion: p.requestSchemaVersion,
    canonicalSchemaVersion: p.canonicalSchemaVersion,
    providerId: p.providerId,
    providerVersion: p.providerVersion,
    executionClass: p.executionClass,
    analysis: p.analysis,
    intent: p.intent,
    inputHash: p.inputHash,
    configurationHash: p.configurationHash,
    seed: p.seed,
    seedDerivation: p.seedDerivation,
    prngAlgorithm: p.prngAlgorithm,
  };
}

export function createSimulationOrchestrator(
  options: OrchestratorOptions = {},
): SimulationOrchestrator {
  const now = options.now ?? (() => new Date());
  // The ONLY state the orchestrator retains: immutable provider registration.
  // No request, tenant, seed or provenance state is held between calls, so
  // concurrent runs cannot observe one another.
  const providers = new Map<string, CanonicalSimulationProvider>();
  for (const p of options.providers ?? []) providers.set(p.descriptor.id, p);
  const previewProviders = new Map<string, PreviewSessionProvider>();
  for (const p of options.previewProviders ?? []) previewProviders.set(p.descriptor.id, p);

  function blankProvenance(
    request: SimulationRequest,
    startedAt: string,
    inputHash: string,
    configurationHash: string,
  ): SimulationProvenance {
    const requestedProviderId =
      typeof request?.providerId === 'string' ? request.providerId : 'unknown';
    return {
      runId: newIdentifier('run'),
      requestSchemaVersion: SIMULATION_REQUEST_SCHEMA_VERSION,
      canonicalSchemaVersion: CANONICAL_SCHEMA_VERSION,
      tenantId: request?.tenantId ?? null,
      facilityId: request?.facilityId ?? null,
      twinId: request?.twinId ?? null,
      requestedProviderId,
      requestedExecutionClass: null,
      providerId: requestedProviderId,
      executionClass: 'unavailable',
      providerVersion: 'unknown',
      engineModule: 'unknown',
      analysis: typeof request?.analysis === 'string' ? request.analysis : 'unknown',
      intent: request?.intent === 'authoritative' ? 'authoritative' : 'preview',
      providerReady: null,
      providerReadinessReason: null,
      seed: null,
      seedMaterial: null,
      seedSource: null,
      seedDerivation: null,
      prngAlgorithm: null,
      inputHash,
      configurationHash,
      reproducibilityHash: '',
      outputHash: null,
      startedAt,
      completedAt: startedAt,
      ...UNAVAILABLE_DURATION,
      runtimeEnvironment: 'browser',
      externalJobId: null,
      verificationLevel: 'unverified',
      failureCode: null,
      failureMessage: null,
    };
  }

  /**
   * Shared validation and context construction for both execution kinds.
   * Returns either a prepared context or a terminal failure outcome.
   */
  function prepare(
    request: SimulationRequest,
    kind: 'value' | 'session',
    signal?: AbortSignal,
  ): PrepareResult {
    const timer = startExecutionTimer(now);
    const startedAt = timer.startedAt;

    // Hash the request first: a value with no canonical form (a cyclic
    // structure) is an invalid request, not a silent partial hash.
    let inputHash: string;
    let configurationHash: string;
    try {
      inputHash = hashCanonical(request?.input ?? null);
      configurationHash = hashCanonical(request?.configuration ?? null);
    } catch (err) {
      const base = blankProvenance(
        request ?? ({} as SimulationRequest),
        startedAt,
        'unhashable',
        'unhashable',
      );
      return {
        ok: false,
        failure: fail<never>(
          base,
          'invalid-request',
          err instanceof Error ? err.message : 'request could not be canonicalized',
          timer,
        ),
      };
    }

    const base = blankProvenance(
      request ?? ({} as SimulationRequest),
      startedAt,
      inputHash,
      configurationHash,
    );

    const bail = (
      reason: SimulationFailureReason,
      message: string,
      extra: Partial<SimulationProvenance> = {},
    ) => ({
      ok: false as const,
      failure: fail<never>({ ...base, ...extra }, reason, message, timer),
    });

    if (!request || typeof request !== 'object') {
      return bail('invalid-request', 'a simulation request object is required');
    }
    if (typeof request.providerId !== 'string' || request.providerId.length === 0) {
      return bail('invalid-request', 'request.providerId is required');
    }
    if (typeof request.analysis !== 'string' || request.analysis.length === 0) {
      return bail('invalid-request', 'request.analysis is required');
    }
    if (request.intent !== 'preview' && request.intent !== 'authoritative') {
      return bail('invalid-request', 'request.intent must be preview or authoritative');
    }

    const provider =
      kind === 'session'
        ? previewProviders.get(request.providerId)
        : providers.get(request.providerId);
    if (!provider) {
      return bail('provider-unknown', `no registered provider with id ${request.providerId}`);
    }

    const d = provider.descriptor;
    // From here on the requested provider identity is known and is retained on
    // every outcome, including failures.
    const identity: Partial<SimulationProvenance> = {
      requestedExecutionClass: isSimulationExecutionClass(d.executionClass)
        ? d.executionClass
        : null,
      providerVersion: d.version,
      engineModule: d.engineModule,
      runtimeEnvironment: d.runtimeEnvironment,
    };
    if (!isSimulationExecutionClass(d.executionClass)) {
      return bail(
        'provider-contract-violation',
        `provider ${d.id} declares a non-canonical execution class`,
        identity,
      );
    }
    if (!d.supportedAnalyses.includes(request.analysis)) {
      return bail(
        'analysis-unsupported',
        `provider ${d.id} does not support ${request.analysis}`,
        identity,
      );
    }
    if (request.intent === 'preview' && !d.supportsPreview) {
      return bail('intent-unsupported', `provider ${d.id} does not produce previews`, identity);
    }
    if (request.intent === 'authoritative') {
      if (!d.supportsAuthoritative) {
        return bail('intent-unsupported', `provider ${d.id} may only produce previews`, identity);
      }
      if (d.runtimeEnvironment === 'browser') {
        return bail(
          'authoritative-runtime-unavailable',
          'authoritative runs must execute on a server, worker or external runtime; the browser may only produce previews',
          identity,
        );
      }
    }

    const readiness = provider.readiness();
    if (!readiness.ready) {
      return bail(
        'provider-not-ready',
        readiness.reason ?? `provider ${d.id} is not ready and gave no reason`,
        {
          ...identity,
          providerReady: false,
          providerReadinessReason: readiness.reason ?? null,
        },
      );
    }

    if (signal?.aborted) {
      return bail('cancelled', 'request was cancelled before execution', {
        ...identity,
        providerReady: true,
      });
    }

    // Seeding. Deterministic providers get no seed at all; seeded providers
    // get an explicit seed or one derived from the request (never the clock).
    let seed: number | null = null;
    let seedMaterial: string | null = null;
    let seedSource: 'request' | 'derived' | null = null;
    if (d.determinism === 'seeded-stochastic' || d.requiresSeed) {
      if (typeof request.seed === 'number' && Number.isFinite(request.seed)) {
        seed = request.seed >>> 0;
        seedSource = 'request';
      } else if (d.requiresSeed && d.determinism !== 'seeded-stochastic') {
        return bail('seed-missing', `provider ${d.id} requires an explicit seed`, {
          ...identity,
          providerReady: true,
        });
      } else {
        seedMaterial = `${d.id}|${d.version}|${base.inputHash}|${base.configurationHash}`;
        seed = deriveSeed(seedMaterial);
        seedSource = 'derived';
      }
    }

    const ctx: SimulationExecutionContext = {
      runId: base.runId,
      request,
      seed,
      random:
        seed === null
          ? () => {
              throw new Error(
                `provider ${d.id} declared itself deterministic and may not draw random numbers`,
              );
            }
          : mulberry32(seed),
      signal,
      startedAt,
    };

    const resolved: SimulationProvenance = {
      ...base,
      ...identity,
      executionClass: d.executionClass,
      verificationLevel: d.verificationLevel,
      providerReady: true,
      providerReadinessReason: readiness.reason ?? null,
      seed,
      seedMaterial,
      seedSource,
      seedDerivation: seedSource === 'derived' ? SEED_DERIVATION_ALGORITHM : null,
      prngAlgorithm: seed === null ? null : PRNG_ALGORITHM,
    };

    return {
      ok: true,
      prepared: {
        provider,
        ctx,
        timer,
        base: { ...resolved, reproducibilityHash: hashCanonical(reproducibilityInput(resolved)) },
      },
    };
  }

  function finish<T>(
    prepared: Prepared,
    response: ProviderResponse<T>,
    signal?: AbortSignal,
  ): SimulationOutcome<T> {
    const d = prepared.provider.descriptor;
    if (signal?.aborted) {
      return fail<T>(
        prepared.base,
        'cancelled',
        'request was cancelled during execution',
        prepared.timer,
      );
    }
    if (!response || typeof response !== 'object' || !('value' in response)) {
      return fail<T>(
        prepared.base,
        'provider-contract-violation',
        `provider ${d.id} returned no value envelope`,
        prepared.timer,
      );
    }
    if (d.requiresExternalRuntime && !response.externalJobId) {
      return fail<T>(
        prepared.base,
        'provider-contract-violation',
        `provider ${d.id} requires an external runtime but returned no external job identifier`,
        prepared.timer,
      );
    }
    // Only `value` and `externalJobId` are read. Any timing a provider tried to
    // attach to its response is ignored: duration is orchestrator-owned.
    const t = prepared.timer.stop();
    let outputHash: string | null;
    try {
      outputHash = hashCanonical(response.value);
    } catch {
      return fail<T>(
        prepared.base,
        'provider-contract-violation',
        `provider ${d.id} returned a value with no canonical form`,
        prepared.timer,
      );
    }
    return {
      kind: 'ok',
      value: response.value,
      provenance: {
        ...prepared.base,
        outputHash,
        externalJobId: response.externalJobId ?? null,
        completedAt: t.completedAt,
        durationMs: t.durationMs,
        durationSource: t.durationSource,
      },
    };
  }

  function sanitize(err: unknown): string {
    return err instanceof Error && typeof err.message === 'string'
      ? err.message.slice(0, 200)
      : 'provider raised a non-error value';
  }

  return {
    describeProviders() {
      return [
        ...Array.from(providers.values()).map((p) => p.descriptor),
        ...Array.from(previewProviders.values()).map((p) => p.descriptor),
      ];
    },

    describeProvider(id) {
      return providers.get(id)?.descriptor ?? previewProviders.get(id)?.descriptor ?? null;
    },

    register(provider) {
      const id = provider.descriptor.id;
      const isSession = typeof (provider as PreviewSessionProvider).openSession === 'function';
      const target = isSession
        ? (previewProviders as Map<string, unknown>)
        : (providers as Map<string, unknown>);
      const existing = target.get(id);
      if (existing) {
        // Idempotent: re-registering the very same instance is a no-op.
        if (existing === provider) return;
        throw new Error(
          `a different provider is already registered under id ${id}; unregister it explicitly instead of replacing it`,
        );
      }
      target.set(id, provider);
    },

    async run<T>(request: SimulationRequest, signal?: AbortSignal): Promise<SimulationOutcome<T>> {
      const p = prepare(request, 'value', signal);
      if (!p.ok) return p.failure as SimulationOutcome<T>;
      const provider = p.prepared.provider as CanonicalSimulationProvider<T>;
      try {
        const response = await provider.execute(p.prepared.ctx);
        return finish<T>(p.prepared, response, signal);
      } catch (err) {
        return fail<T>(p.prepared.base, 'provider-threw', sanitize(err), p.prepared.timer);
      }
    },

    runSync<T>(request: SimulationRequest, signal?: AbortSignal): SimulationOutcome<T> {
      const p = prepare(request, 'value', signal);
      if (!p.ok) return p.failure as SimulationOutcome<T>;
      const provider = p.prepared.provider as CanonicalSimulationProvider<T>;
      try {
        const response = provider.execute(p.prepared.ctx);
        if (response instanceof Promise) {
          return fail<T>(
            p.prepared.base,
            'provider-not-synchronous',
            `provider ${provider.descriptor.id} is asynchronous; use run() instead`,
            p.prepared.timer,
          );
        }
        return finish<T>(p.prepared, response, signal);
      } catch (err) {
        return fail<T>(p.prepared.base, 'provider-threw', sanitize(err), p.prepared.timer);
      }
    },

    openPreviewSession<S>(request: SimulationRequest): PreviewSessionOutcome<S> {
      const p = prepare(request, 'session');
      if (!p.ok) {
        const f = p.failure;
        return { kind: 'failed', reason: f.reason, message: f.message, provenance: f.provenance };
      }
      const provider = p.prepared.provider as PreviewSessionProvider<S>;
      try {
        const session = provider.openSession(p.prepared.ctx);
        const t = p.prepared.timer.stop();
        return {
          kind: 'ok',
          session,
          provenance: {
            ...p.prepared.base,
            // A session produces no single output value to hash.
            outputHash: null,
            completedAt: t.completedAt,
            // This measures session construction, not the streamed run.
            durationMs: t.durationMs,
            durationSource: t.durationSource,
          },
        };
      } catch (err) {
        const f = fail<never>(p.prepared.base, 'provider-threw', sanitize(err), p.prepared.timer);
        return { kind: 'failed', reason: f.reason, message: f.message, provenance: f.provenance };
      }
    },
  };
}