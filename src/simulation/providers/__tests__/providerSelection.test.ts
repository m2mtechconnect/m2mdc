/**
 * Phase 1B.8 — Provider selection wiring tests.
 *
 * Verifies that VITE_AURA_SIM_PROVIDER routes the facade to the
 * omniverse stub, that the stub returns typed unavailable outcomes
 * (disabled by default, not-implemented when explicitly enabled),
 * and that unknown values still fail closed via the facade layer.
 */

import { describe, it, expect } from 'vitest';

import { createSimulationFacade } from '../../api';
import {
  createDefaultRegistry,
  resolveConfiguredProviderId,
  resolveProviderSelection,
} from '../registry';
import { createOmniverseProvider } from '../omniverseProvider';

describe('resolveConfiguredProviderId', () => {
  it('defaults to compatibility when unset', () => {
    expect(resolveConfiguredProviderId({})).toBe('compatibility');
  });
  it('recognizes each known provider id', () => {
    for (const id of ['compatibility', 'scenario-library', 'blueprint', 'omniverse'] as const) {
      expect(resolveConfiguredProviderId({ VITE_AURA_SIM_PROVIDER: id })).toBe(id);
    }
  });
  it('falls back to compatibility for unknown values', () => {
    expect(resolveConfiguredProviderId({ VITE_AURA_SIM_PROVIDER: 'nope' })).toBe('compatibility');
  });
});

describe('resolveProviderSelection', () => {
  it('reports known ids without downgrading', () => {
    const sel = resolveProviderSelection({ VITE_AURA_SIM_PROVIDER: 'omniverse' });
    expect(sel.kind).toBe('known');
    if (sel.kind === 'known') expect(sel.id).toBe('omniverse');
  });
  it('flags unknown ids as unknown (facade converts to unavailable)', () => {
    const sel = resolveProviderSelection({ VITE_AURA_SIM_PROVIDER: 'garbage' });
    expect(sel.kind).toBe('unknown');
  });
  it('treats empty string as default, not unknown', () => {
    expect(resolveProviderSelection({ VITE_AURA_SIM_PROVIDER: '' }).kind).toBe('default');
  });
});

describe('facade wired to omniverse provider', () => {
  it('activeProviderId is omniverse when VITE_AURA_SIM_PROVIDER=omniverse', () => {
    const facade = createSimulationFacade({ env: { VITE_AURA_SIM_PROVIDER: 'omniverse' } });
    expect(facade.isConfigured).toBe(true);
    expect(facade.activeProviderId).toBe('omniverse');
  });

  it('listScenarios on omniverse returns disabled by default', () => {
    // Pin provider explicitly to bypass ambient env in the test runner.
    const registry = {
      get: () => createOmniverseProvider({ enabled: false }),
      ids: () => ['omniverse'] as const,
    };
    const facade = createSimulationFacade({ registry, providerId: 'omniverse' });
    const outcome = facade.listScenarios();
    expect(outcome.kind).toBe('disabled');
    expect(outcome.provenance).toBe('unavailable');
    expect(outcome.providerId).toBe('omniverse');
  });

  it('runScenario on omniverse returns not-implemented when explicitly enabled', async () => {
    const registry = {
      get: () => createOmniverseProvider({ enabled: true }),
      ids: () => ['omniverse'] as const,
    };
    const facade = createSimulationFacade({ registry, providerId: 'omniverse' });
    const outcome = await facade.runScenario({ scenarioId: 'anything' });
    expect(outcome.kind).toBe('not-implemented');
    expect(outcome.provenance).toBe('unavailable');
  });

  it('runScenario honours AbortSignal on omniverse (returns cancelled)', async () => {
    const registry = {
      get: () => createOmniverseProvider({ enabled: true }),
      ids: () => ['omniverse'] as const,
    };
    const facade = createSimulationFacade({ registry, providerId: 'omniverse' });
    const ctl = new AbortController();
    ctl.abort();
    const outcome = await facade.runScenario({ scenarioId: 'x' }, ctl.signal);
    expect(outcome.kind).toBe('cancelled');
    expect(outcome.provenance).toBe('unavailable');
  });

  it('omniverse can never surface an ok/live value through the facade', async () => {
    const facade = createSimulationFacade({ env: { VITE_AURA_SIM_PROVIDER: 'omniverse' } });
    const listed = facade.listScenarios();
    const ran = await facade.runScenario({ scenarioId: 'x' });
    expect(listed.kind).not.toBe('ok');
    expect(ran.kind).not.toBe('ok');
    expect(listed.provenance).toBe('unavailable');
    expect(ran.provenance).toBe('unavailable');
  });
});

describe('facade — unknown VITE_AURA_SIM_PROVIDER fails closed', () => {
  it('returns unavailable outcomes for both list and run', async () => {
    const facade = createSimulationFacade({
      env: { VITE_AURA_SIM_PROVIDER: 'dsx-live' },
    });
    expect(facade.isConfigured).toBe(false);
    expect(facade.listScenarios().kind).toBe('unavailable');
    expect((await facade.runScenario({ scenarioId: 'x' })).kind).toBe('unavailable');
  });
});

describe('default registry exposes the omniverse provider', () => {
  it('registry.ids() includes omniverse', () => {
    const reg = createDefaultRegistry();
    expect(reg.ids()).toContain('omniverse');
  });
  it('registry.get("omniverse") returns the stub with live=false capability', () => {
    const reg = createDefaultRegistry();
    const p = reg.get('omniverse');
    expect(p.id).toBe('omniverse');
    expect(p.capabilities.live).toBe(false);
  });
});