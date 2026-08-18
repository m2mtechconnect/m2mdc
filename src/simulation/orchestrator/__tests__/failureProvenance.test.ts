/**
 * Phase 2 closure - failure provenance retains BOTH what was requested and
 * what actually happened. A refused NVIDIA run must still show that NVIDIA
 * was requested; it may not be flattened to `unavailable` everywhere.
 */

import { describe, expect, it } from 'vitest';

import { createDefaultSimulationOrchestrator } from '../index';
import { NVIDIA_SOLVER_PROVIDER_ID } from '../providers/failClosedProviders';

describe('failure provenance', () => {
  const orchestrator = createDefaultSimulationOrchestrator();

  it('retains the requested NVIDIA identity on a refused run', async () => {
    const out = await orchestrator.run({
      providerId: NVIDIA_SOLVER_PROVIDER_ID,
      analysis: 'thermal-cfd',
      intent: 'authoritative',
      input: { rackId: 'R-01' },
    });

    expect(out.kind).toBe('failed');
    const p = out.provenance;

    // What was requested.
    expect(p.requestedProviderId).toBe('nvidia-solver');
    expect(p.requestedExecutionClass).toBe('nvidia-solver');
    expect(p.analysis).toBe('thermal-cfd');
    expect(p.intent).toBe('authoritative');

    // What actually happened.
    expect(p.executionClass).toBe('unavailable');
    expect(p.providerReady).toBe(false);
    expect(p.providerReadinessReason).toMatch(/NVIDIA solver service/i);
    expect(p.failureCode).toBe('provider-not-ready');
    expect(p.failureMessage).toBeTruthy();
    expect(p.externalJobId).toBeNull();
    expect(p.outputHash).toBeNull();
    if (out.kind === 'failed') expect(out.reason).toBe('provider-not-ready');
  });

  it('never fabricates an external job id for an unavailable external runtime', async () => {
    const out = await orchestrator.run({
      providerId: 'external-solver',
      analysis: 'electrical',
      intent: 'authoritative',
      input: {},
    });
    expect(out.kind).toBe('failed');
    expect(out.provenance.externalJobId).toBeNull();
    expect(out.provenance.requestedExecutionClass).toBe('external-solver');
  });

  it('keeps the requested provider id even when the provider is unknown', async () => {
    const out = await orchestrator.run({
      providerId: 'does-not-exist',
      analysis: 'demo',
      intent: 'preview',
      input: {},
    });
    expect(out.kind).toBe('failed');
    expect(out.provenance.requestedProviderId).toBe('does-not-exist');
    expect(out.provenance.requestedExecutionClass).toBeNull();
    expect(out.provenance.failureCode).toBe('provider-unknown');
  });

  it('rejects an uncanonicalizable request instead of hashing a partial view', async () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const out = await orchestrator.run({
      providerId: 'aura-panel-summary',
      analysis: 'panel-summary',
      intent: 'preview',
      input: cyclic,
    });
    expect(out.kind).toBe('failed');
    expect(out.provenance.failureCode).toBe('invalid-request');
    expect(out.provenance.inputHash).toBe('unhashable');
  });
});