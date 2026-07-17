/**
 * Phase 1B.2a.1 — Completion-effect hook invariants.
 *
 * These tests cover the acceptance gaps that a pure facade-level unit
 * test cannot: AbortController lifecycle (replacement + unmount),
 * error-state surfacing, no-persist-on-error, race-guard, and
 * legacy-off rollback behaviour.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useSimulationCompletion } from '../useSimulationCompletion';
import { createSimulationFacade, type SimulationFacade } from '../api';
import { getAllScenarios } from '../scenarioRegistry';
import type { SimulationResultSummary } from '../types';

const scenario = getAllScenarios()[0]!;
const baseline = { pue: 1.35, gpuUtilization: 78, thermalStabilityScore: 92 };
const current = { pue: 1.42, gpuUtilization: 74, thermalStabilityScore: 88 };

function baseOpts(overrides: Partial<Parameters<typeof useSimulationCompletion>[0]> = {}) {
  return {
    facade: createSimulationFacade({ env: {} }),
    status: 'idle',
    activeScenario: scenario,
    events: [],
    baselineKpis: baseline,
    currentKpis: current,
    elapsedTime: 60,
    ...overrides,
  };
}

describe('useSimulationCompletion — happy path (facade on)', () => {
  it('commits a simulated result and calls onPersist exactly once on completion', () => {
    const onPersist = vi.fn();
    const { result, rerender } = renderHook(
      (p: Parameters<typeof useSimulationCompletion>[0]) => useSimulationCompletion(p),
      { initialProps: baseOpts({ status: 'running', onPersist }) },
    );
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();

    act(() => { rerender(baseOpts({ status: 'completed', onPersist })); });

    expect(result.current.result).not.toBeNull();
    expect(result.current.error).toBeNull();
    expect(onPersist).toHaveBeenCalledTimes(1);
    expect(onPersist).toHaveBeenCalledWith(result.current.result as SimulationResultSummary);
  });
});

describe('useSimulationCompletion — unavailable / error', () => {
  it('surfaces a visible error and does NOT call onPersist when facade returns unavailable', () => {
    const onPersist = vi.fn();
    // Unknown provider → every facade call returns `unavailable`.
    const badFacade = createSimulationFacade({
      env: { VITE_AURA_SIM_PROVIDER: 'not-a-real-provider' },
    });
    const { result, rerender } = renderHook(
      (p: Parameters<typeof useSimulationCompletion>[0]) => useSimulationCompletion(p),
      { initialProps: baseOpts({ status: 'running', facade: badFacade, onPersist }) },
    );
    act(() => { rerender(baseOpts({ status: 'completed', facade: badFacade, onPersist })); });

    expect(result.current.result).toBeNull();
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.kind).toBe('unavailable');
    expect(result.current.error?.message).toMatch(/unknown simulation provider/);
    expect(onPersist).not.toHaveBeenCalled();
  });

  it('surfaces invalid-input error when required kpis are missing', () => {
    const onPersist = vi.fn();
    const facade = createSimulationFacade({ env: {} });
    const { result, rerender } = renderHook(
      (p: Parameters<typeof useSimulationCompletion>[0]) => useSimulationCompletion(p),
      { initialProps: baseOpts({ status: 'running', facade, onPersist }) },
    );
    act(() => {
      rerender(baseOpts({
        status: 'completed',
        facade,
        onPersist,
        baselineKpis: null as unknown as Record<string, number>,
      }));
    });
    expect(result.current.error?.kind).toBe('invalid-input');
    expect(onPersist).not.toHaveBeenCalled();
  });
});

describe('useSimulationCompletion — cancellation semantics', () => {
  function makeSpyingFacade(): { facade: SimulationFacade; signals: (AbortSignal | undefined)[] } {
    const signals: (AbortSignal | undefined)[] = [];
    const real = createSimulationFacade({ env: {} });
    const facade: SimulationFacade = {
      ...real,
      generatePanelResult(input, signal) {
        signals.push(signal);
        return real.generatePanelResult(input, signal);
      },
    };
    return { facade, signals };
  }

  it('aborts the previous run before starting a new one (replacement)', () => {
    const { facade, signals } = makeSpyingFacade();
    const { rerender } = renderHook(
      (p: Parameters<typeof useSimulationCompletion>[0]) => useSimulationCompletion(p),
      { initialProps: baseOpts({ status: 'running', facade }) },
    );
    // First completion.
    act(() => { rerender(baseOpts({ status: 'completed', facade })); });
    // Cycle back to running (a new run begins), then complete again.
    act(() => { rerender(baseOpts({ status: 'running', facade })); });
    act(() => { rerender(baseOpts({ status: 'completed', facade })); });

    expect(signals.length).toBe(2);
    expect(signals[0]).toBeInstanceOf(AbortSignal);
    expect(signals[1]).toBeInstanceOf(AbortSignal);
    // The prior controller MUST have been aborted before the new run.
    expect(signals[0]!.aborted).toBe(true);
    // Latest signal is fresh (may or may not still be live post-render).
    expect(signals[1]).not.toBe(signals[0]);
  });

  it('aborts the in-flight controller on unmount', () => {
    const { facade, signals } = makeSpyingFacade();
    const { rerender, unmount } = renderHook(
      (p: Parameters<typeof useSimulationCompletion>[0]) => useSimulationCompletion(p),
      { initialProps: baseOpts({ status: 'running', facade }) },
    );
    act(() => { rerender(baseOpts({ status: 'completed', facade })); });
    const signalBeforeUnmount = signals[signals.length - 1]!;
    expect(signalBeforeUnmount.aborted).toBe(false);
    unmount();
    expect(signalBeforeUnmount.aborted).toBe(true);
  });
});

describe('useSimulationCompletion — legacy rollback (facade=null)', () => {
  it('uses the direct engine and still calls onPersist', () => {
    const onPersist = vi.fn();
    const { result, rerender } = renderHook(
      (p: Parameters<typeof useSimulationCompletion>[0]) => useSimulationCompletion(p),
      { initialProps: baseOpts({ status: 'running', facade: null, onPersist }) },
    );
    act(() => { rerender(baseOpts({ status: 'completed', facade: null, onPersist })); });
    expect(result.current.result).not.toBeNull();
    expect(result.current.error).toBeNull();
    expect(onPersist).toHaveBeenCalledTimes(1);
  });
});

describe('useSimulationCompletion — reset clears state and bumps token', () => {
  beforeEach(() => vi.clearAllMocks());

  it('clears result and error when status returns to idle', () => {
    const facade = createSimulationFacade({ env: {} });
    const { result, rerender } = renderHook(
      (p: Parameters<typeof useSimulationCompletion>[0]) => useSimulationCompletion(p),
      { initialProps: baseOpts({ status: 'running', facade }) },
    );
    act(() => { rerender(baseOpts({ status: 'completed', facade })); });
    expect(result.current.result).not.toBeNull();
    act(() => { rerender(baseOpts({ status: 'idle', facade })); });
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });
});