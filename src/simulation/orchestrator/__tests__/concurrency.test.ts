/**
 * Phase 2 closure - singleton and concurrency safety.
 *
 * The process-wide orchestrator retains provider registration and nothing
 * else. Two runs in flight at the same time must not observe one another's
 * seed, provenance, tenancy or failure.
 */

import { describe, expect, it } from 'vitest';

import { createDefaultSimulationOrchestrator, simulationOrchestrator } from '../index';
import { createSimulationOrchestrator } from '../orchestrator';
import type { CanonicalSimulationProvider, SimulationProviderDescriptor } from '../types';

const descriptor: SimulationProviderDescriptor = {
  id: 'slow',
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

function slowProvider(): CanonicalSimulationProvider<number> {
  return {
    descriptor,
    readiness: () => ({ ready: true, reason: null }),
    async execute(ctx) {
      const first = ctx.random();
      // Yield so the other in-flight run interleaves here.
      await new Promise((r) => setTimeout(r, 5));
      if ((ctx.request.input as { boom?: boolean })?.boom) throw new Error('deliberate failure');
      return { value: first };
    },
  };
}

describe('singleton and concurrency safety', () => {
  it('registers a provider idempotently', () => {
    const o = createSimulationOrchestrator({});
    const p = slowProvider();
    o.register(p);
    o.register(p);
    expect(o.describeProviders().filter((d) => d.id === 'slow')).toHaveLength(1);
  });

  it('refuses a conflicting registration under the same id', () => {
    const o = createSimulationOrchestrator({ providers: [slowProvider()] });
    expect(() => o.register(slowProvider())).toThrow(/already registered/i);
  });

  it('gives concurrent runs independent seeds and provenance', async () => {
    const o = createSimulationOrchestrator({ providers: [slowProvider()] });
    const [a, b] = await Promise.all([
      o.run<number>({ providerId: 'slow', analysis: 'demo', intent: 'preview', input: { i: 1 } }),
      o.run<number>({ providerId: 'slow', analysis: 'demo', intent: 'preview', input: { i: 2 } }),
    ]);
    expect(a.kind).toBe('ok');
    expect(b.kind).toBe('ok');
    expect(a.provenance.runId).not.toBe(b.provenance.runId);
    expect(a.provenance.seed).not.toBe(b.provenance.seed);
    expect(a.provenance.inputHash).not.toBe(b.provenance.inputHash);
    expect(a.provenance.reproducibilityHash).not.toBe(b.provenance.reproducibilityHash);
  });

  it('does not leak tenant or facility identity between concurrent runs', async () => {
    const o = createSimulationOrchestrator({ providers: [slowProvider()] });
    const [a, b] = await Promise.all([
      o.run({
        providerId: 'slow',
        analysis: 'demo',
        intent: 'preview',
        input: { i: 1 },
        tenantId: 'tenant-a',
        facilityId: 'facility-a',
        twinId: 'twin-a',
      }),
      o.run({
        providerId: 'slow',
        analysis: 'demo',
        intent: 'preview',
        input: { i: 2 },
        tenantId: 'tenant-b',
        facilityId: 'facility-b',
        twinId: 'twin-b',
      }),
    ]);
    expect(a.provenance.tenantId).toBe('tenant-a');
    expect(a.provenance.facilityId).toBe('facility-a');
    expect(a.provenance.twinId).toBe('twin-a');
    expect(b.provenance.tenantId).toBe('tenant-b');
    expect(b.provenance.facilityId).toBe('facility-b');
    expect(b.provenance.twinId).toBe('twin-b');
  });

  it('contains a failure to the run that caused it', async () => {
    const o = createSimulationOrchestrator({ providers: [slowProvider()] });
    const [bad, good] = await Promise.all([
      o.run({ providerId: 'slow', analysis: 'demo', intent: 'preview', input: { boom: true } }),
      o.run({ providerId: 'slow', analysis: 'demo', intent: 'preview', input: { boom: false } }),
    ]);
    expect(bad.kind).toBe('failed');
    expect(good.kind).toBe('ok');
    expect(good.provenance.failureCode).toBeNull();
    expect(bad.provenance.failureCode).toBe('provider-threw');
  });

  it('reproduces identically across separate orchestrator instances', async () => {
    const one = createSimulationOrchestrator({ providers: [slowProvider()] });
    const two = createSimulationOrchestrator({ providers: [slowProvider()] });
    const req = {
      providerId: 'slow',
      analysis: 'demo',
      intent: 'preview' as const,
      input: { i: 7 },
    };
    const a = await one.run(req);
    const b = await two.run(req);
    expect(a.provenance.reproducibilityHash).toBe(b.provenance.reproducibilityHash);
    expect(a.provenance.outputHash).toBe(b.provenance.outputHash);
    // Identity and timing must NOT be shared.
    expect(a.provenance.runId).not.toBe(b.provenance.runId);
  });

  it('lets a test build an isolated registry without touching the singleton', () => {
    const before = simulationOrchestrator.describeProviders().length;
    const isolated = createDefaultSimulationOrchestrator();
    isolated.register(slowProvider());
    expect(isolated.describeProvider('slow')).not.toBeNull();
    expect(simulationOrchestrator.describeProvider('slow')).toBeNull();
    expect(simulationOrchestrator.describeProviders()).toHaveLength(before);
  });

  it('the singleton holds no request-specific state between runs', async () => {
    const req = {
      providerId: 'aura-panel-summary',
      analysis: 'panel-summary',
      intent: 'preview' as const,
      input: {
        scenario: null,
        events: [],
        baselineKpis: { pue: 1.3 },
        currentKpis: { pue: 1.4 },
        durationSec: 60,
      },
      tenantId: 'tenant-x',
    };
    const first = simulationOrchestrator.runSync(req);
    const second = simulationOrchestrator.runSync({ ...req, tenantId: null });
    expect(first.provenance.tenantId).toBe('tenant-x');
    expect(second.provenance.tenantId).toBeNull();
    expect(first.provenance.reproducibilityHash).toBe(second.provenance.reproducibilityHash);
  });
});