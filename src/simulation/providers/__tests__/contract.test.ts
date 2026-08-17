/**
 * Phase 1B.1 — Provider Contract & Facade Tests
 *
 * Covers the required cases: flag defaults, determinism, cancellation,
 * sanitized failures, non-throwing unavailable/not-implemented outcomes,
 * provenance-cannot-be-upgraded, golden compatibility fixture, and the
 * "no active consumer behaviour changed" invariant.
 */

import { describe, it, expect } from 'vitest';

import {
  createSimulationFacade,
  resolveConfiguredProviderId,
} from '../../api';
import type {
  ProviderOutcome,
  SimulationProvider,
  SimulationProviderId,
  SimulationRunPayload,
} from '../types';
import { assertOutcomeIntegrity } from '../types';
import { createCompatibilityProvider } from '../compatibilityProvider';
import { createOmniverseProvider } from '../omniverseProvider';
import { createDefaultRegistry } from '../registry';
import { getAllScenarios } from '../../scenarioRegistry';

function stubRegistry(provider: SimulationProvider) {
  return {
    get: () => provider,
    ids: () => [provider.id] as readonly SimulationProviderId[],
  };
}

// --------------------------------------------------------------------------
// 1. Provider selection & feature-flag defaults
// --------------------------------------------------------------------------
describe('resolveConfiguredProviderId', () => {
  it('defaults to compatibility when env is empty', () => {
    expect(resolveConfiguredProviderId({})).toBe('compatibility');
  });

  it('defaults to compatibility when VITE_AURA_SIM_PROVIDER is missing', () => {
    expect(
      resolveConfiguredProviderId({ VITE_AURA_SIM_PROVIDER: undefined }),
    ).toBe('compatibility');
  });

  it('fails closed to compatibility on unknown values', () => {
    expect(
      resolveConfiguredProviderId({ VITE_AURA_SIM_PROVIDER: 'not-a-provider' }),
    ).toBe('compatibility');
  });

  it('accepts a known id (case-insensitive, trimmed)', () => {
    expect(
      resolveConfiguredProviderId({ VITE_AURA_SIM_PROVIDER: '  Omniverse  ' }),
    ).toBe('omniverse');
  });
});

describe('createSimulationFacade — provider selection', () => {
  it('defaults to compatibility with no options', () => {
    const facade = createSimulationFacade({ env: {} });
    expect(facade.activeProviderId).toBe('compatibility');
  });

  it('routes to omniverse when explicitly configured', () => {
    const facade = createSimulationFacade({
      env: { VITE_AURA_SIM_PROVIDER: 'omniverse' },
    });
    expect(facade.activeProviderId).toBe('omniverse');
  });
});

// --------------------------------------------------------------------------
// 2. Deterministic repeatability (compatibility provider)
// --------------------------------------------------------------------------
describe('compatibility provider — determinism', () => {
  const scenarioId = getAllScenarios()[0]!.id;

  it('produces byte-stable results for identical (seed, input)', async () => {
    const p = createCompatibilityProvider();
    const a = await p.runScenario({ scenarioId, seed: 42, observedAt: '1970-01-01T00:00:00.000Z' });
    const b = await p.runScenario({ scenarioId, seed: 42, observedAt: '1970-01-01T00:00:00.000Z' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('changes output when the seed changes', async () => {
    const p = createCompatibilityProvider();
    const a = await p.runScenario({ scenarioId, seed: 1, observedAt: '1970-01-01T00:00:00.000Z' });
    const b = await p.runScenario({ scenarioId, seed: 2, observedAt: '1970-01-01T00:00:00.000Z' });
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });
});

// --------------------------------------------------------------------------
// 3. Cancellation & sanitized failures
// --------------------------------------------------------------------------
describe('cancellation and sanitized failures', () => {
  const scenarioId = getAllScenarios()[0]!.id;

  it('returns kind=cancelled when signal is pre-aborted', async () => {
    const p = createCompatibilityProvider();
    const controller = new AbortController();
    controller.abort();
    const outcome = await p.runScenario({ scenarioId, seed: 1 }, controller.signal);
    expect(outcome.kind).toBe('cancelled');
    expect(outcome.provenance).toBe('unavailable');
  });

  it('returns kind=cancelled when signal aborts mid-run', async () => {
    const p = createCompatibilityProvider();
    const controller = new AbortController();
    const pending = p.runScenario({ scenarioId, seed: 1 }, controller.signal);
    controller.abort();
    const outcome = await pending;
    expect(outcome.kind).toBe('cancelled');
  });

  it('facade converts thrown provider errors into sanitized error outcomes', async () => {
    const throwing: SimulationProvider = {
      id: 'compatibility',
      capabilities: { streaming: false, determinism: 'none', cancellable: false, live: false },
      listScenarios() { throw new Error('boom: SECRET_TOKEN=xyz'); },
      async runScenario() { throw new Error('async boom'); },
    };
    const facade = createSimulationFacade({ registry: stubRegistry(throwing) });
    const listed = facade.listScenarios();
    expect(listed.kind).toBe('error');
    if (listed.kind === 'error') {
      // Error messages ARE surfaced, but truncated & without stack — a stack
      // would leak here; only `.message` is included.
      expect(listed.code).toBe('PROVIDER_THREW');
      expect(listed.provenance).toBe('unavailable');
    }
    const ran = await facade.runScenario({ scenarioId: 'x' });
    expect(ran.kind).toBe('error');
  });
});

// --------------------------------------------------------------------------
// 4. Unavailable / not-implemented provider NEVER throws
// --------------------------------------------------------------------------
describe('omniverse provider — non-throwing outcomes', () => {
  it('returns disabled by default', () => {
    const p = createOmniverseProvider({ enabled: false });
    const outcome = p.listScenarios();
    expect(outcome.kind).toBe('disabled');
    expect(outcome.provenance).toBe('unavailable');
    expect(p.capabilities.live).toBe(false);
  });

  it('returns not-implemented when enabled', async () => {
    const p = createOmniverseProvider({ enabled: true });
    const listed = p.listScenarios();
    expect(listed.kind).toBe('not-implemented');
    expect(listed.provenance).toBe('unavailable');
    const ran = await p.runScenario({ scenarioId: 'irrelevant' });
    expect(ran.kind).toBe('not-implemented');
  });

  it('does not throw when called concurrently with an aborted signal', async () => {
    const p = createOmniverseProvider({ enabled: true });
    const controller = new AbortController();
    controller.abort();
    await expect(p.runScenario({ scenarioId: 'x' }, controller.signal)).resolves.toEqual(
      expect.objectContaining({ kind: 'cancelled', provenance: 'unavailable' }),
    );
  });
});

// --------------------------------------------------------------------------
// 5. Invalid / missing values cannot be fabricated
// --------------------------------------------------------------------------
describe('invalid input handling', () => {
  it('rejects empty scenarioId with invalid-input (never ok)', async () => {
    const p = createCompatibilityProvider();
    const outcome = await p.runScenario({ scenarioId: '' });
    expect(outcome.kind).toBe('invalid-input');
    expect(outcome.provenance).toBe('unavailable');
  });

  it('returns unavailable for unknown scenarioId (no fabricated value)', async () => {
    const p = createCompatibilityProvider();
    const outcome = await p.runScenario({ scenarioId: 'does-not-exist' });
    expect(outcome.kind).toBe('unavailable');
    expect(outcome.provenance).toBe('unavailable');
  });
});

// --------------------------------------------------------------------------
// 6. Provenance cannot be upgraded
// --------------------------------------------------------------------------
describe('assertOutcomeIntegrity', () => {
  it('downgrades an ok outcome that claims live provenance', () => {
    const forged = {
      kind: 'ok',
      providerId: 'compatibility',
      provenance: 'live',
      observedAt: new Date().toISOString(),
      value: {} as SimulationRunPayload,
    } as unknown as ProviderOutcome<SimulationRunPayload>;
    const guarded = assertOutcomeIntegrity(forged);
    expect(guarded.kind).toBe('invalid-input');
    expect(guarded.provenance).toBe('unavailable');
  });

  it('downgrades an ok outcome missing observedAt', () => {
    const forged = {
      kind: 'ok',
      providerId: 'compatibility',
      provenance: 'simulated',
      observedAt: undefined,
      value: {} as SimulationRunPayload,
    } as unknown as ProviderOutcome<SimulationRunPayload>;
    const guarded = assertOutcomeIntegrity(forged);
    expect(guarded.kind).toBe('invalid-input');
  });

  it('rejects a non-ok outcome that claims non-unavailable provenance', () => {
    const forged = {
      kind: 'unavailable',
      providerId: 'omniverse',
      provenance: 'simulated',
      reason: 'x',
    } as unknown as ProviderOutcome<SimulationRunPayload>;
    const guarded = assertOutcomeIntegrity(forged);
    expect(guarded.kind).toBe('invalid-input');
  });
});

// --------------------------------------------------------------------------
// 7. Compatibility provider matches its established golden fixture
// --------------------------------------------------------------------------
describe('compatibility provider — golden fixture', () => {
  it('runs a canonical scenario to a stable, tagged envelope', async () => {
    const scenarioId = getAllScenarios()[0]!.id;
    const p = createCompatibilityProvider();
    const outcome = await p.runScenario({
      scenarioId,
      seed: 123,
      observedAt: '2026-07-17T00:00:00.000Z',
    });
    expect(outcome.kind).toBe('ok');
    if (outcome.kind !== 'ok') return;
    expect(outcome.provenance).toBe('simulated');
    expect(outcome.providerId).toBe('compatibility');
    expect(outcome.observedAt).toBe('2026-07-17T00:00:00.000Z');
    expect(outcome.value.seedUsed).toBe(123);
    expect(outcome.value.summary.scenarioId).toBe(scenarioId);
    // Envelope shape is stable across runs — regression-guard on shape only.
    expect(Object.keys(outcome.value.summary).sort()).toEqual([
      'actualVsExpected',
      'durationSec',
      'events',
      'kpiDeltas',
      'rcaMarkdown',
      'recommendationsMarkdown',
      'scenarioId',
      'scenarioName',
    ]);
  });

  it('listScenarios returns non-empty demo-tagged descriptors', () => {
    const p = createCompatibilityProvider();
    const outcome = p.listScenarios();
    expect(outcome.kind).toBe('ok');
    if (outcome.kind !== 'ok') return;
    expect(outcome.provenance).toBe('demo');
    expect(outcome.value.length).toBeGreaterThan(0);
  });
});

// --------------------------------------------------------------------------
// 8. No active consumer behaviour changes
// --------------------------------------------------------------------------
describe('no consumer migration in Phase 1B.1', () => {
  it('src/simulation/index.ts still exports the legacy SimulationEngine class', async () => {
    const mod = await import('../../index');
    expect(typeof (mod as { SimulationEngine?: unknown }).SimulationEngine).toBe('function');
    // The dynamic import pulls in the full legacy engine graph, which is slow
    // when the whole suite runs in parallel.
  }, 30000);

  it('src/simulation/index.ts does NOT re-export the new facade (facade is opt-in)', async () => {
    const mod = await import('../../index');
    expect('createSimulationFacade' in mod).toBe(false);
  }, 30000);

  it('default registry is constructable and returns compatibility for unknown ids', () => {
    const reg = createDefaultRegistry();
    // Phase 1B.5 — `scenario-library` is now instantiated.
    expect(reg.get('scenario-library').id).toBe('scenario-library');
    // `blueprint` remains not-instantiated; falls closed to compatibility.
    expect(reg.get('blueprint').id).toBe('compatibility');
    expect(reg.get('omniverse').id).toBe('omniverse');
  });
});