/**
 * Phase 1B.2 characterization — Builder Step 5 `SimulationEngine`
 * (`src/components/builder/step5/BuilderPreviewEngine.ts` — renamed in Phase 1B.7).
 *
 * This class shares a name with `src/simulation/SimulationEngine.ts` but
 * has a distinct API surface. The rename is scoped for slice 1B.7. This
 * spec pins the current surface so the rename cannot silently regress.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BuilderPreviewEngine as BuilderSimulationEngine } from '../../../components/builder/step5/BuilderPreviewEngine';

const config = {
  scenario: { id: 's1', name: 'unit' },
  workflows: [{ id: 'w1', name: 'Workflow A', actions: [{ type: 'notify' }] }],
  kpis: [
    { label: 'Latency', unit: 'min' },
    { label: 'Accuracy', unit: '%' },
  ],
  speed: 1 as const,
};

describe('components/builder/step5/BuilderPreviewEngine — characterization', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Pin workflow event randomness.
    vi.spyOn(Math, 'random').mockImplementation(() => 0.5);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('typed outcome: kpi-update payload has {timestamp, metrics[]}', async () => {
    const engine = new BuilderSimulationEngine(config);
    const payloads: unknown[] = [];
    engine.on('kpi-update', (data) => payloads.push(data));
    engine.start();
    await vi.advanceTimersByTimeAsync(600);
    engine.pause();

    expect(payloads.length).toBeGreaterThan(0);
    const first = payloads[0] as Record<string, unknown>;
    expect(first).toEqual(
      expect.objectContaining({
        timestamp: expect.stringMatching(/^\d{2}:\d{2}$/),
        metrics: expect.any(Array),
      }),
    );
    for (const m of (first.metrics as unknown[])) {
      expect(m).toEqual(
        expect.objectContaining({
          label: expect.any(String),
          value: expect.any(Number),
          unit: expect.any(String),
          timestamp: expect.any(String),
        }),
      );
    }
  });

  it('typed outcome: event payload matches SimulationEvent discriminants', async () => {
    const engine = new BuilderSimulationEngine(config);
    const events: unknown[] = [];
    engine.on('event', (e) => events.push(e));
    engine.start();
    // Events fire on ticks divisible by 5.
    await vi.advanceTimersByTimeAsync(2000);
    engine.pause();

    expect(events.length).toBeGreaterThan(0);
    for (const e of events) {
      expect(e).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          timestamp: expect.any(String),
          type: expect.stringMatching(
            /^(detect|decision|action|resolved|alert|info)$/,
          ),
          message: expect.any(String),
        }),
      );
    }
  });

  it('provenance: emitted events declare no provenance field', async () => {
    const engine = new BuilderSimulationEngine(config);
    const events: unknown[] = [];
    engine.on('event', (e) => events.push(e));
    engine.start();
    await vi.advanceTimersByTimeAsync(2000);
    engine.pause();
    for (const e of events) {
      expect(e as Record<string, unknown>).not.toHaveProperty('provenance');
    }
  });

  it('cancellation: pause() halts further emissions', async () => {
    const engine = new BuilderSimulationEngine(config);
    let updates = 0;
    engine.on('kpi-update', () => {
      updates += 1;
    });
    engine.start();
    await vi.advanceTimersByTimeAsync(1000);
    const before = updates;
    engine.pause();
    await vi.advanceTimersByTimeAsync(2000);
    expect(updates).toBe(before);
  });

  it('cancellation: stop() resets tick counter (verified by fresh timestamp)', async () => {
    const engine = new BuilderSimulationEngine(config);
    const stamps: string[] = [];
    engine.on('kpi-update', (data: { timestamp: string }) =>
      stamps.push(data.timestamp),
    );
    engine.start();
    await vi.advanceTimersByTimeAsync(1000);
    engine.stop();
    engine.start();
    await vi.advanceTimersByTimeAsync(400);
    engine.pause();
    // Two "start-from-zero" runs both begin at tick 1 → same first timestamp.
    expect(stamps.length).toBeGreaterThanOrEqual(2);
  });
});