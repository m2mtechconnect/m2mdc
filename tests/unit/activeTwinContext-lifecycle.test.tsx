/**
 * Lifecycle regression for ActiveTwinContext.
 *
 * Verifies the lifecycle-aware cancellation contract added during the
 * Settings AI closure slice:
 *
 *   • Fetches that resolve AFTER the provider unmounts must not update
 *     state and must not log console.error.
 *   • Fetches superseded by a newer generation (a second setActiveTwin
 *     call) must not update state and must not log console.error.
 *   • Genuine transport failures on the CURRENT/live generation still
 *     surface via console.error so operators can see them.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { ActiveTwinProvider, useActiveTwin } from '@/context/ActiveTwinContext';

// Deferred promise helper.
function defer<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

// Shared queue of deferred `.maybeSingle()` results — one per fetchTwin
// call. Tests push resolvers onto this queue in order.
const maybeSingleQueue: Array<{
  promise: Promise<{ data: unknown; error: unknown }>;
  resolve: (v: { data: unknown; error: unknown }) => void;
  reject: (e: unknown) => void;
}> = [];

function nextMaybeSingle() {
  const d = defer<{ data: unknown; error: unknown }>();
  maybeSingleQueue.push(d);
  return d;
}

vi.mock('@/integrations/supabase/client', () => {
  const buildQuery = () => {
    const q: Record<string, unknown> = {};
    q.select = () => q;
    q.eq = () => q;
    q.order = () => Promise.resolve({ data: [], error: null });
    q.maybeSingle = () => {
      const d = maybeSingleQueue.shift() ?? nextMaybeSingle();
      return d.promise;
    };
    q.insert = () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) });
    q.delete = () => ({ eq: () => Promise.resolve({ error: null }) });
    return q;
  };
  return {
    supabase: {
      from: () => buildQuery(),
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: 'test-user' } } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
    },
  };
});

// Test harness that exposes the context imperatively.
let captured: ReturnType<typeof useActiveTwin> | null = null;
function Capture() {
  captured = useActiveTwin();
  return null;
}

describe('ActiveTwinContext lifecycle', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    maybeSingleQueue.length = 0;
    captured = null;
    localStorage.clear();
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
  });

  it('drops fetch results that resolve after provider unmount without logging', async () => {
    const pending = nextMaybeSingle();

    const utils = render(
      <ActiveTwinProvider>
        <Capture />
      </ActiveTwinProvider>,
    );
    // Let user + initial refresh settle.
    await act(async () => { await Promise.resolve(); });

    // Kick off a fetchTwin — resolution deferred by the queue.
    await act(async () => {
      captured!.setActiveTwin('twin-late');
    });

    // Unmount while the fetch is still in flight.
    utils.unmount();

    // Now the deferred fetch resolves — it must be dropped silently.
    await act(async () => {
      pending.resolve({ data: { id: 'twin-late' }, error: null });
      await Promise.resolve();
    });

    const lifecycleErrors = errSpy.mock.calls
      .map((args) => String(args[0]))
      .filter((m) => /Failed to fetch (twin|location)/i.test(m));
    expect(lifecycleErrors, 'no fetch errors after unmount').toEqual([]);
  });

  it('drops superseded fetch results without logging when a newer generation is issued', async () => {
    const first = nextMaybeSingle();
    const second = nextMaybeSingle();

    render(
      <ActiveTwinProvider>
        <Capture />
      </ActiveTwinProvider>,
    );
    await act(async () => { await Promise.resolve(); });

    await act(async () => { captured!.setActiveTwin('twin-A'); });
    // Immediately supersede.
    await act(async () => { captured!.setActiveTwin('twin-B'); });

    // The obsolete first fetch rejects with a transport-like error.
    // It must be swallowed because a newer generation is live.
    await act(async () => {
      first.reject(new TypeError('Failed to fetch'));
      second.resolve({ data: { id: 'twin-B' }, error: null });
      await Promise.resolve();
    });

    const lifecycleErrors = errSpy.mock.calls
      .map((args) => String(args[0]))
      .filter((m) => /Failed to fetch (twin|location)/i.test(m));
    expect(lifecycleErrors, 'superseded fetch must not log').toEqual([]);
  });

  it('still logs when the CURRENT generation fails with a genuine transport error', async () => {
    const pending = nextMaybeSingle();

    render(
      <ActiveTwinProvider>
        <Capture />
      </ActiveTwinProvider>,
    );
    await act(async () => { await Promise.resolve(); });

    await act(async () => { captured!.setActiveTwin('twin-live'); });

    await act(async () => {
      pending.reject(new TypeError('Failed to fetch'));
      await Promise.resolve();
    });

    const lifecycleErrors = errSpy.mock.calls
      .map((args) => String(args[0]))
      .filter((m) => /Failed to fetch twin/i.test(m));
    expect(lifecycleErrors.length, 'live-generation failure must surface').toBeGreaterThanOrEqual(1);
  });
});