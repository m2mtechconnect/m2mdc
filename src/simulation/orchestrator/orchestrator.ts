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

import { hashCanonical } from './canonical';
import { deriveSeed, mulberry32, newIdentifier, PRNG_ALGORITHM } from './prng';
import { isSimulationExecutionClass } from './executionClass';
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

export interface OrchestratorOptions {
  providers?: CanonicalSimulationProvider[];
  previewProviders?: PreviewSessionProvider[];
  /** Injected clock so provenance timestamps are testable. */
  now?: () => Date;
}

export interface SimulationOrchestrator {
  describeProviders(): SimulationProviderDescriptor[];
  describeProvider(id: string): SimulationProviderDescriptor | null;
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
}

type FailedOutcome = Extract<SimulationOutcome<never>, { kind: 'failed' }>;

type PrepareResult =
  | { ok: true; prepared: Prepared; failure?: undefined }
  | { ok: false; prepared?: undefined; failure: FailedOutcome };

function fail<T>(
  base: SimulationProvenance,
  reason: SimulationFailureReason,
  message: string,
  completedAt: string,
): SimulationOutcome<T> & { kind: 'failed' } {
  return {
    kind: 'failed',
    reason,
    message: message.slice(0, 300),
    provenance: {
      ...base,
      executionClass: 'unavailable',
      outputHash: null,
      completedAt,
      durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(base.startedAt)),
      failureReason: reason,
    },
  };
}

export function createSimulationOrchestrator(
  options: OrchestratorOptions = {},
): SimulationOrchestrator {
  const now = options.now ?? (() => new Date());
  const providers = new Map<string, CanonicalSimulationProvider>();
  for (const p of options.providers ?? []) providers.set(p.descriptor.id, p);
  const previewProviders = new Map<string, PreviewSessionProvider>();
  for (const p of options.previewProviders ?? []) previewProviders.set(p.descriptor.id, p);

  function blankProvenance(request: SimulationRequest, startedAt: string): SimulationProvenance {
    return {
      runId: newIdentifier('run'),
      tenantId: request?.tenantId ?? null,
      facilityId: request?.facilityId ?? null,
      twinId: request?.twinId ?? null,
      providerId: typeof request?.providerId === 'string' ? request.providerId : 'unknown',
      executionClass: 'unavailable',
      providerVersion: 'unknown',
      engineModule: 'unknown',
      analysis: typeof request?.analysis === 'string' ? request.analysis : 'unknown',
      intent: request?.intent === 'authoritative' ? 'authoritative' : 'preview',
      seed: null,
      prngAlgorithm: null,
      inputHash: hashCanonical(request?.input ?? null),
      configurationHash: hashCanonical(request?.configuration ?? null),
      outputHash: null,
      startedAt,
      completedAt: startedAt,
      durationMs: 0,
      runtimeEnvironment: 'browser',
      externalJobId: null,
      verificationLevel: 'unverified',
      failureReason: null,
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
    const startedAt = now().toISOString();
    const base = blankProvenance(request ?? ({} as SimulationRequest), startedAt);

    const bail = (reason: SimulationFailureReason, message: string) => ({
      ok: false as const,
      failure: fail<never>(base, reason, message, now().toISOString()),
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
    if (!isSimulationExecutionClass(d.executionClass)) {
      return bail(
        'provider-contract-violation',
        `provider ${d.id} declares a non-canonical execution class`,
      );
    }
    if (!d.supportedAnalyses.includes(request.analysis)) {
      return bail('analysis-unsupported', `provider ${d.id} does not support ${request.analysis}`);
    }
    if (request.intent === 'preview' && !d.supportsPreview) {
      return bail('intent-unsupported', `provider ${d.id} does not produce previews`);
    }
    if (request.intent === 'authoritative') {
      if (!d.supportsAuthoritative) {
        return bail('intent-unsupported', `provider ${d.id} may only produce previews`);
      }
      if (d.runtimeEnvironment === 'browser') {
        return bail(
          'authoritative-runtime-unavailable',
          'authoritative runs must execute on a server, worker or external runtime; the browser may only produce previews',
        );
      }
    }

    const readiness = provider.readiness();
    if (!readiness.ready) {
      return bail(
        'provider-not-ready',
        readiness.reason ?? `provider ${d.id} is not ready and gave no reason`,
      );
    }

    if (signal?.aborted) return bail('cancelled', 'request was cancelled before execution');

    // Seeding. Deterministic providers get no seed at all; seeded providers
    // get an explicit seed or one derived from the request (never the clock).
    let seed: number | null = null;
    if (d.determinism === 'seeded-stochastic' || d.requiresSeed) {
      if (typeof request.seed === 'number' && Number.isFinite(request.seed)) {
        seed = request.seed >>> 0;
      } else if (d.requiresSeed && d.determinism !== 'seeded-stochastic') {
        return bail('seed-missing', `provider ${d.id} requires an explicit seed`);
      } else {
        seed = deriveSeed(`${d.id}|${d.version}|${base.inputHash}|${base.configurationHash}`);
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

    return {
      ok: true,
      prepared: {
        provider,
        ctx,
        base: {
          ...base,
          executionClass: d.executionClass,
          providerVersion: d.version,
          engineModule: d.engineModule,
          runtimeEnvironment: d.runtimeEnvironment,
          verificationLevel: d.verificationLevel,
          seed,
          prngAlgorithm: seed === null ? null : PRNG_ALGORITHM,
        },
      },
    };
  }

  function finish<T>(
    prepared: Prepared,
    response: ProviderResponse<T>,
    signal?: AbortSignal,
  ): SimulationOutcome<T> {
    const d = prepared.provider.descriptor;
    const completedAt = now().toISOString();
    if (signal?.aborted) {
      return fail<T>(prepared.base, 'cancelled', 'request was cancelled during execution', completedAt);
    }
    if (!response || typeof response !== 'object' || !('value' in response)) {
      return fail<T>(
        prepared.base,
        'provider-contract-violation',
        `provider ${d.id} returned no value envelope`,
        completedAt,
      );
    }
    if (d.requiresExternalRuntime && !response.externalJobId) {
      return fail<T>(
        prepared.base,
        'provider-contract-violation',
        `provider ${d.id} requires an external runtime but returned no external job identifier`,
        completedAt,
      );
    }
    return {
      kind: 'ok',
      value: response.value,
      provenance: {
        ...prepared.base,
        outputHash: hashCanonical(response.value),
        externalJobId: response.externalJobId ?? null,
        completedAt,
        durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(prepared.base.startedAt)),
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

    async run<T>(request: SimulationRequest, signal?: AbortSignal): Promise<SimulationOutcome<T>> {
      const p = prepare(request, 'value', signal);
      if (!p.ok) return p.failure as SimulationOutcome<T>;
      const provider = p.prepared.provider as CanonicalSimulationProvider<T>;
      try {
        const response = await provider.execute(p.prepared.ctx);
        return finish<T>(p.prepared, response, signal);
      } catch (err) {
        return fail<T>(p.prepared.base, 'provider-threw', sanitize(err), now().toISOString());
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
            now().toISOString(),
          );
        }
        return finish<T>(p.prepared, response, signal);
      } catch (err) {
        return fail<T>(p.prepared.base, 'provider-threw', sanitize(err), now().toISOString());
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
        const completedAt = now().toISOString();
        return {
          kind: 'ok',
          session,
          provenance: {
            ...p.prepared.base,
            // A session produces no single output value to hash.
            outputHash: null,
            completedAt,
            durationMs: 0,
          },
        };
      } catch (err) {
        const f = fail<never>(
          p.prepared.base,
          'provider-threw',
          sanitize(err),
          now().toISOString(),
        );
        return { kind: 'failed', reason: f.reason, message: f.message, provenance: f.provenance };
      }
    },
  };
}