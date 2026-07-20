/**
 * Phase 1B.5 — Scenario Library Provider tests.
 *
 * Pins the read-only descriptor surface, namespacing, and typed
 * `not-implemented` behaviour so future refactors (1B.6+) cannot silently
 * downgrade provenance or leak un-namespaced ids into the facade.
 */

import { describe, it, expect } from 'vitest';
import {
  createScenarioLibraryProvider,
  parseScenarioLibraryId,
} from '../scenarioLibraryProvider';
import { PRESET_SCENARIOS } from '../../scenarioRegistry';
import { SIMULATION_SCENARIOS } from '@/twins/dataCenter/simulationScenarios';
import { ENHANCED_SCENARIOS } from '@/twins/sovereignDataCenter/enhancedSimulationEngine';

describe('scenarioLibraryProvider', () => {
  const p = createScenarioLibraryProvider();

  it('declares the correct id and capabilities', () => {
    expect(p.id).toBe('scenario-library');
    expect(p.capabilities.live).toBe(false);
    expect(p.capabilities.streaming).toBe(false);
    expect(p.capabilities.cancellable).toBe(false);
    expect(p.capabilities.determinism).toBe('best-effort');
  });

  it('listScenarios merges all three sources with namespaced ids', () => {
    const outcome = p.listScenarios();
    expect(outcome.kind).toBe('ok');
    if (outcome.kind !== 'ok') return;
    expect(outcome.provenance).toBe('demo');
    expect(outcome.providerId).toBe('scenario-library');

    const ids = outcome.value.map((d) => d.id);
    const expected =
      PRESET_SCENARIOS.length + SIMULATION_SCENARIOS.length + ENHANCED_SCENARIOS.length;
    expect(ids.length).toBe(expected);

    // Every id MUST be namespaced.
    for (const id of ids) {
      expect(id).toMatch(/^(preset|dc|sovereign):.+/);
    }

    // Spot-check one id per source.
    expect(ids).toContain(`preset:${PRESET_SCENARIOS[0]!.id}`);
    expect(ids).toContain(`dc:${SIMULATION_SCENARIOS[0]!.id}`);
    expect(ids).toContain(`sovereign:${ENHANCED_SCENARIOS[0]!.id}`);
  });

  it('listScenarios preserves duration semantics per source', () => {
    const outcome = p.listScenarios();
    if (outcome.kind !== 'ok') throw new Error('expected ok');
    const byId = new Map(outcome.value.map((d) => [d.id, d]));
    expect(byId.get(`preset:${PRESET_SCENARIOS[0]!.id}`)!.durationSeconds).toBe(
      PRESET_SCENARIOS[0]!.durationSeconds,
    );
    expect(byId.get(`dc:${SIMULATION_SCENARIOS[0]!.id}`)!.durationSeconds).toBe(
      SIMULATION_SCENARIOS[0]!.duration,
    );
    expect(byId.get(`sovereign:${ENHANCED_SCENARIOS[0]!.id}`)!.durationSeconds).toBe(
      ENHANCED_SCENARIOS[0]!.duration_seconds,
    );
  });

  it('runScenario returns not-implemented for a valid namespaced id', async () => {
    const outcome = await p.runScenario({
      scenarioId: `preset:${PRESET_SCENARIOS[0]!.id}`,
    });
    expect(outcome.kind).toBe('not-implemented');
    expect(outcome.provenance).toBe('unavailable');
  });

  it('runScenario rejects un-namespaced ids with invalid-input', async () => {
    const outcome = await p.runScenario({ scenarioId: 'gpu_spike_training_job' });
    expect(outcome.kind).toBe('invalid-input');
    expect(outcome.provenance).toBe('unavailable');
  });

  it('runScenario rejects empty scenarioId with invalid-input', async () => {
    const outcome = await p.runScenario({ scenarioId: '' });
    expect(outcome.kind).toBe('invalid-input');
  });

  it('runScenario honours a pre-aborted signal', async () => {
    const ac = new AbortController();
    ac.abort();
    const outcome = await p.runScenario(
      { scenarioId: 'preset:anything' },
      ac.signal,
    );
    expect(outcome.kind).toBe('cancelled');
    expect(outcome.provenance).toBe('unavailable');
  });

  it('never throws for a hostile input shape', async () => {
    // deliberately violate the type contract at runtime
    const outcome = await p.runScenario({
      scenarioId: 12345 as unknown as string,
    });
    expect(outcome.kind).toBe('invalid-input');
  });
});

describe('parseScenarioLibraryId', () => {
  it('parses each supported namespace', () => {
    expect(parseScenarioLibraryId('preset:abc')).toEqual({
      source: 'preset',
      localId: 'abc',
    });
    expect(parseScenarioLibraryId('dc:scenario-gpu-spike')).toEqual({
      source: 'dc',
      localId: 'scenario-gpu-spike',
    });
    expect(parseScenarioLibraryId('sovereign:gpu_overload')).toEqual({
      source: 'sovereign',
      localId: 'gpu_overload',
    });
  });

  it('rejects unknown namespaces and malformed ids', () => {
    expect(parseScenarioLibraryId('unknown:foo')).toBeNull();
    expect(parseScenarioLibraryId('no-colon')).toBeNull();
    expect(parseScenarioLibraryId(':leading')).toBeNull();
    expect(parseScenarioLibraryId('preset:')).toBeNull();
    expect(parseScenarioLibraryId('')).toBeNull();
  });
});
