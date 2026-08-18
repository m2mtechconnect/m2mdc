/**
 * Phase 2 closure - orchestrator-owned execution timing.
 *
 * Duration is measured centrally with a monotonic clock. A provider cannot
 * supply it, a clock adjustment cannot invalidate it, and an unmeasured
 * interval is `null` (never zero).
 */

import { describe, expect, it } from 'vitest';

import { createSimulationOrchestrator } from '../orchestrator';
import { startExecutionTimer, UNAVAILABLE_DURATION } from '../timing';
import type { CanonicalSimulationProvider, SimulationProviderDescriptor } from '../types';

const descriptor: SimulationProviderDescriptor = {
  id: 'timed',
  executionClass: 'aura-deterministic',
  version: '1.0.0',
  engineModule: 'test',
  supportedAnalyses: ['demo'],
  supportsPreview: true,
  supportsAuthoritative: false,
  determinism: 'deterministic',
  requiresSeed: false,
  requiresExternalRuntime: false,
  runtimeEnvironment: 'browser',
  defaultTimeoutMs: 1000,
  supportsCancellation: false,
  verificationLevel: 'unverified',
};

const request = {
  providerId: 'timed',
  analysis: 'demo',
  intent: 'preview' as const,
  input: { a: 1 },
};

function provider(
  execute: CanonicalSimulationProvider['execute'],
): CanonicalSimulationProvider {
  return { descriptor, readiness: () => ({ ready: true, reason: null }), execute };
}

describe('execution duration', () => {
  it('is non-negative and measured monotonically', async () => {
    const o = createSimulationOrchestrator({
      providers: [provider(() => ({ value: 1 }))],
    });
    const out = await o.run(request);
    expect(out.kind).toBe('ok');
    expect(out.provenance.durationSource).toBe('monotonic');
    expect(out.provenance.durationMs).not.toBeNull();
    expect(out.provenance.durationMs as number).toBeGreaterThanOrEqual(0);
  });

  it('never reports completion earlier than start', async () => {
    const o = createSimulationOrchestrator({ providers: [provider(() => ({ value: 1 }))] });
    for (let i = 0; i < 25; i += 1) {
      const out = await o.run(request);
      expect(Date.parse(out.provenance.completedAt)).toBeGreaterThanOrEqual(
        Date.parse(out.provenance.startedAt),
      );
    }
  });

  it('stays non-negative when the wall clock jumps backwards mid-run', async () => {
    // The injected clock runs backwards between start and completion. A
    // wall-clock subtraction would go negative; the monotonic reading does not.
    let call = 0;
    const times = [new Date('2026-01-01T00:00:10.000Z'), new Date('2026-01-01T00:00:00.000Z')];
    const o = createSimulationOrchestrator({
      providers: [provider(() => ({ value: 1 }))],
      now: () => times[Math.min(call++, times.length - 1)],
    });
    const out = await o.run(request);
    expect(out.kind).toBe('ok');
    expect(out.provenance.durationMs as number).toBeGreaterThanOrEqual(0);
    expect(out.provenance.durationSource).toBe('monotonic');
  });

  it('ignores a provider-supplied duration', async () => {
    const o = createSimulationOrchestrator({
      providers: [
        provider(
          () =>
            ({
              value: 1,
              // A provider trying to assert authoritative timing.
              durationMs: 999_999,
              startedAt: '1999-01-01T00:00:00.000Z',
              completedAt: '1999-01-01T02:00:00.000Z',
              durationSource: 'monotonic',
            }) as never,
        ),
      ],
    });
    const out = await o.run(request);
    expect(out.kind).toBe('ok');
    expect(out.provenance.durationMs).not.toBe(999_999);
    expect(out.provenance.durationMs as number).toBeLessThan(60_000);
    expect(out.provenance.startedAt).not.toBe('1999-01-01T00:00:00.000Z');
    expect(out.provenance.completedAt).not.toBe('1999-01-01T02:00:00.000Z');
  });

  it('records duration on failures too, and never fabricates one', async () => {
    const o = createSimulationOrchestrator({ providers: [] });
    const out = await o.run(request);
    expect(out.kind).toBe('failed');
    expect(out.provenance.durationMs as number).toBeGreaterThanOrEqual(0);
    expect(out.provenance.durationSource).not.toBe('unavailable');
  });

  it('uses null, not zero, for an unmeasurable interval', () => {
    expect(UNAVAILABLE_DURATION.durationMs).toBeNull();
    expect(UNAVAILABLE_DURATION.durationSource).toBe('unavailable');
  });

  it('falls back to the wall clock only when no monotonic clock exists', () => {
    const perf = (globalThis as { performance?: unknown }).performance;
    try {
      // Simulate a host with no `performance.now`.
      (globalThis as { performance?: unknown }).performance = undefined;
      const t = startExecutionTimer(() => new Date('2026-01-01T00:00:00.000Z'));
      const m = t.stop();
      expect(m.durationSource).toBe('wall-clock');
      expect(m.durationMs).toBe(0);
    } finally {
      (globalThis as { performance?: unknown }).performance = perf;
    }
  });

  it('legacy records with no measured interval carry null, not zero', async () => {
    const { createSimulationRun } = await import('../../compat/sovereignDataCenterEngine');
    const run = createSimulationRun(
      'facility-1',
      'gpu_overload',
      {},
      { kpiDeltas: {}, resultsSummary: 'x', warnings: [], recommendations: [] },
    );
    expect(run.durationMs).toBeNull();
  });
});