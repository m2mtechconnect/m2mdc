/**
 * Phase 1B.2 characterization — Builder Step 5 `MockSimulationEngine`
 * (canonical path now `src/components/builder/step5/fixtures/builderMock.ts`
 * after the Phase 1B.7 migration).
 *
 * Config-scripted preview engine used when no backend endpoint is
 * configured. Phase 1B.7 relocated the source under `fixtures/builderMock`;
 * this spec pins the wire format.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MockSimulationEngine } from '../../../components/builder/step5/fixtures/builderMock';

const previewConfig = {
  baseline_metrics: {
    accuracy_rate: 92,
    wait_time: 15,
  },
  scenarios: {
    peak_load: {
      label: 'Peak Load',
      duration_seconds: 3,
      ticks: [
        { t: 0, accuracy_rate: 92, wait_time: 15 },
        { t: 3, accuracy_rate: 88, wait_time: 22 },
      ],
      events: ['Anomaly detected in cluster', 'Resolved via failover'],
    },
  },
};

describe('components/builder/step5/MockSimulationEngine — characterization', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Force event emission by pinning Math.random above the threshold.
    vi.spyOn(Math, 'random').mockImplementation(() => 0.99);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('typed outcome: getBaselineMetrics returns {label,value,unit}[]', () => {
    const engine = new MockSimulationEngine({
      scenario: { id: 'peak_load' },
      previewConfig,
      speed: 1,
    });
    const baseline = engine.getBaselineMetrics();
    expect(baseline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: expect.any(String),
          value: expect.any(Number),
          unit: expect.any(String),
        }),
      ]),
    );
  });

  it('typed outcome: kpi-update payload shape matches builder wire format', async () => {
    const engine = new MockSimulationEngine({
      scenario: { id: 'peak_load' },
      previewConfig,
      speed: 1,
    });
    const payloads: unknown[] = [];
    engine.on('kpi-update', (data) => payloads.push(data));
    engine.start();
    await vi.advanceTimersByTimeAsync(1200);
    engine.pause();

    expect(payloads.length).toBeGreaterThan(0);
    const first = payloads[0] as Record<string, unknown>;
    expect(first).toEqual(
      expect.objectContaining({
        timestamp: expect.stringMatching(/^\d{2}:\d{2}$/),
        metrics: expect.any(Array),
      }),
    );
  });

  it('typed outcome: events derive type/severity from message keywords', async () => {
    const engine = new MockSimulationEngine({
      scenario: { id: 'peak_load' },
      previewConfig,
      speed: 1,
    });
    const events: unknown[] = [];
    engine.on('event', (e) => events.push(e));
    engine.start();
    await vi.advanceTimersByTimeAsync(3500);
    engine.pause();

    // At least one scripted event should have fired.
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
          severity: expect.stringMatching(/^(low|medium|high)$/),
        }),
      );
    }
  });

  it('provenance: emitted payloads declare no provenance field', async () => {
    const engine = new MockSimulationEngine({
      scenario: { id: 'peak_load' },
      previewConfig,
      speed: 1,
    });
    const events: unknown[] = [];
    engine.on('event', (e) => events.push(e));
    engine.start();
    await vi.advanceTimersByTimeAsync(3500);
    engine.pause();
    for (const e of events) {
      expect(e as Record<string, unknown>).not.toHaveProperty('provenance');
    }
  });

  it('cancellation: complete fires exactly once at scenario duration', async () => {
    const engine = new MockSimulationEngine({
      scenario: { id: 'peak_load' },
      previewConfig,
      speed: 1,
    });
    let completions = 0;
    engine.on('complete', () => {
      completions += 1;
    });
    engine.start();
    // Duration is 3s at 1s tick — allow a small buffer.
    await vi.advanceTimersByTimeAsync(4000);
    expect(completions).toBe(1);
  });
});