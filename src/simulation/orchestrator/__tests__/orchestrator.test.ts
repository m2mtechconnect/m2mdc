/**
 * Phase 2 - orchestrator behavioural contract.
 *
 * These tests assert the guarantees the rest of the platform relies on:
 * one entry point, refusal instead of fabrication, recorded seeds, stable
 * hashes and provenance on every outcome including failures.
 */

import { describe, expect, it } from 'vitest';
import { createSimulationOrchestrator } from '../orchestrator';
import type {
  CanonicalSimulationProvider,
  PreviewSessionProvider,
  SimulationProviderDescriptor,
} from '../types';

const baseDescriptor: SimulationProviderDescriptor = {
  id: 'test-seeded',
  executionClass: 'aura-stochastic-seeded',
  version: '1.0.0',
  engineModule: 'test',
  supportedAnalyses: ['demo'],
  supportsPreview: true,
  supportsAuthoritative: false,
  determinism: 'seeded-stochastic',
  requiresSeed: false,
  requiresExternalRuntime: false,
  runtimeEnvironment: 'browser',
  defaultTimeoutMs: 1000,
  supportsCancellation: true,
  verificationLevel: 'unverified',
};

function seededProvider(
  overrides: Partial<SimulationProviderDescriptor> = {},
  ready = true,
): CanonicalSimulationProvider<number[]> {
  return {
    descriptor: { ...baseDescriptor, ...overrides },
    readiness: () => ({ ready, reason: ready ? null : 'engine offline' }),
    execute: (ctx) => ({ value: [ctx.random(), ctx.random()] }),
  };
}

const request = { providerId: 'test-seeded', analysis: 'demo', intent: 'preview' as const, input: { a: 1 } };

describe('SimulationOrchestrator', () => {
  it('runs a seeded provider and records seed, algorithm and hashes', async () => {
    const o = createSimulationOrchestrator({ providers: [seededProvider()] });
    const out = await o.run<number[]>(request);

    expect(out.kind).toBe('ok');
    expect(out.provenance.seed).toBeTypeOf('number');
    expect(out.provenance.prngAlgorithm).toBe('mulberry32-v1');
    expect(out.provenance.executionClass).toBe('aura-stochastic-seeded');
    expect(out.provenance.inputHash).toHaveLength(64);
    expect(out.provenance.outputHash).toHaveLength(64);
  });

  it('is reproducible: the same input yields the same output hash', async () => {
    const o = createSimulationOrchestrator({ providers: [seededProvider()] });
    const a = await o.run<number[]>(request);
    const b = await o.run<number[]>(request);
    expect(a.provenance.outputHash).toBe(b.provenance.outputHash);
    expect(a.provenance.seed).toBe(b.provenance.seed);
  });

  it('produces different results for different inputs', async () => {
    const o = createSimulationOrchestrator({ providers: [seededProvider()] });
    const a = await o.run<number[]>(request);
    const b = await o.run<number[]>({ ...request, input: { a: 2 } });
    expect(a.provenance.outputHash).not.toBe(b.provenance.outputHash);
  });

  it('honours an explicit seed', async () => {
    const o = createSimulationOrchestrator({ providers: [seededProvider()] });
    const a = await o.run<number[]>({ ...request, seed: 42 });
    const b = await o.run<number[]>({ ...request, input: { totally: 'different' }, seed: 42 });
    expect(a.provenance.seed).toBe(42);
    expect(a.value).toEqual(b.value);
  });

  it('refuses an unknown provider with provenance, not a fabricated value', async () => {
    const o = createSimulationOrchestrator({ providers: [] });
    const out = await o.run({ ...request, providerId: 'nope' });
    expect(out.kind).toBe('failed');
    if (out.kind !== 'failed') return;
    expect(out.reason).toBe('provider-unknown');
    expect(out.provenance.executionClass).toBe('unavailable');
    expect(out.provenance.outputHash).toBeNull();
  });

  it('refuses a provider that is not ready and surfaces its reason', async () => {
    const o = createSimulationOrchestrator({ providers: [seededProvider({}, false)] });
    const out = await o.run(request);
    expect(out.kind).toBe('failed');
    if (out.kind !== 'failed') return;
    expect(out.reason).toBe('provider-not-ready');
    expect(out.message).toBe('engine offline');
  });

  it('refuses an unsupported analysis', async () => {
    const o = createSimulationOrchestrator({ providers: [seededProvider()] });
    const out = await o.run({ ...request, analysis: 'thermal-cfd' });
    expect(out.kind === 'failed' && out.reason).toBe('analysis-unsupported');
  });

  it('never allows a browser provider to produce an authoritative run', async () => {
    const o = createSimulationOrchestrator({
      providers: [seededProvider({ supportsAuthoritative: true })],
    });
    const out = await o.run({ ...request, intent: 'authoritative' });
    expect(out.kind === 'failed' && out.reason).toBe('authoritative-runtime-unavailable');
  });

  it('rejects an external-runtime response with no external job id', async () => {
    const provider: CanonicalSimulationProvider<string> = {
      descriptor: {
        ...baseDescriptor,
        id: 'ext',
        executionClass: 'external-solver',
        requiresExternalRuntime: true,
        runtimeEnvironment: 'external',
        determinism: 'none',
      },
      readiness: () => ({ ready: true, reason: null }),
      execute: () => ({ value: 'suspicious local result' }),
    };
    const o = createSimulationOrchestrator({ providers: [provider] });
    const out = await o.run({ ...request, providerId: 'ext' });
    expect(out.kind === 'failed' && out.reason).toBe('provider-contract-violation');
  });

  it('denies randomness to a provider that declared itself deterministic', async () => {
    const o = createSimulationOrchestrator({
      providers: [seededProvider({ id: 'det', determinism: 'deterministic', executionClass: 'aura-deterministic' })],
    });
    const out = await o.run({ ...request, providerId: 'det' });
    expect(out.kind === 'failed' && out.reason).toBe('provider-threw');
  });

  it('reports cancellation before execution', async () => {
    const controller = new AbortController();
    controller.abort();
    const o = createSimulationOrchestrator({ providers: [seededProvider()] });
    const out = await o.run(request, controller.signal);
    expect(out.kind === 'failed' && out.reason).toBe('cancelled');
  });

  it('converts a provider throw into a sanitized failure', async () => {
    const provider: CanonicalSimulationProvider<never> = {
      descriptor: baseDescriptor,
      readiness: () => ({ ready: true, reason: null }),
      execute: () => {
        throw new Error('engine exploded');
      },
    };
    const o = createSimulationOrchestrator({ providers: [provider] });
    const out = await o.run(request);
    expect(out.kind === 'failed' && out.message).toBe('engine exploded');
  });

  it('rejects an async provider on the synchronous entry point', () => {
    const provider: CanonicalSimulationProvider<number> = {
      descriptor: baseDescriptor,
      readiness: () => ({ ready: true, reason: null }),
      execute: async () => ({ value: 1 }),
    };
    const o = createSimulationOrchestrator({ providers: [provider] });
    const out = o.runSync(request);
    expect(out.kind === 'failed' && out.reason).toBe('provider-not-synchronous');
  });

  it('opens preview sessions with provenance', () => {
    const provider: PreviewSessionProvider<{ ticks: number }> = {
      descriptor: { ...baseDescriptor, id: 'session', executionClass: 'fixture-preview' },
      readiness: () => ({ ready: true, reason: null }),
      openSession: () => ({ ticks: 0 }),
    };
    const o = createSimulationOrchestrator({ previewProviders: [provider] });
    const out = o.openPreviewSession<{ ticks: number }>({ ...request, providerId: 'session' });
    expect(out.kind).toBe('ok');
    expect(out.provenance.executionClass).toBe('fixture-preview');
    expect(out.provenance.runId).toMatch(/^run-/);
  });
});