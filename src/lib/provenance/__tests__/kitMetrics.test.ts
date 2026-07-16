import { describe, it, expect } from 'vitest';
import {
  kitMetric,
  targetMetric,
  notAssessedMetric,
  simulatedMetric,
  derivedKitMetric,
  KIT_SOURCE_NAME,
  type KitMetricContext,
} from '@/lib/provenance/kitMetrics';

const CONNECTED_LIVE: KitMetricContext = {
  connectionState: 'connected',
  provenance: 'live',
  observedAt: new Date('2025-01-01T00:00:00Z'),
};
const DISABLED_DEMO: KitMetricContext = { connectionState: 'disabled', provenance: 'demo' };
const UNAVAILABLE:  KitMetricContext = { connectionState: 'unavailable', provenance: 'unavailable' };

describe('kitMetric — provenance mapping', () => {
  it('validated live Kit reading → live', () => {
    const m = kitMetric(1.24, CONNECTED_LIVE, { description: 'PUE' });
    expect(m.provenance).toBe('live');
    expect(m.value).toBe(1.24);
    expect(m.sourceName).toBe(KIT_SOURCE_NAME);
    expect(m.sourceTimestamp).toBe('2025-01-01T00:00:00.000Z');
  });

  it('disabled Kit with demo scaffolding → demo, never live', () => {
    const m = kitMetric(1.5, DISABLED_DEMO);
    expect(m.provenance).toBe('demo');
    expect(m.value).toBe(1.5);
  });

  it('unavailable connection → unavailable with null value', () => {
    const m = kitMetric(1.24, UNAVAILABLE);
    expect(m.provenance).toBe('unavailable');
    expect(m.value).toBeNull();
  });

  it('missing reading on a live connection → unavailable, not live', () => {
    const m = kitMetric(undefined, CONNECTED_LIVE);
    expect(m.provenance).toBe('unavailable');
    expect(m.value).toBeNull();
  });

  it('NaN reading on a live connection → unavailable', () => {
    const m = kitMetric(Number.NaN, CONNECTED_LIVE);
    expect(m.provenance).toBe('unavailable');
  });

  it('missing provenance context defaults to unavailable — never live', () => {
    // Simulate a caller that forgot to pass a real context.
    const missing: KitMetricContext = { connectionState: 'connecting', provenance: 'unavailable' };
    const m = kitMetric(1.24, missing);
    expect(m.provenance).not.toBe('live');
  });
});

describe('targetMetric / notAssessedMetric / simulatedMetric', () => {
  it('targetMetric is always static', () => {
    const t = targetMetric(1.3, 'kpi-config', 'PUE target');
    expect(t.provenance).toBe('static');
  });

  it('notAssessedMetric is unavailable with null value', () => {
    const n = notAssessedMetric<string>('sovereignty-engine');
    expect(n.provenance).toBe('unavailable');
    expect(n.value).toBeNull();
  });

  it('simulatedMetric records modelVersion', () => {
    const s = simulatedMetric(4.2, 'thermal-sim', 'v1.0.0', 'peak-outlet-delta');
    expect(s.provenance).toBe('simulated');
    expect(s.modelVersion).toBe('v1.0.0');
  });
});

describe('derivedKitMetric — refuses to upgrade non-live sources', () => {
  it('live source → derived', () => {
    const src = kitMetric(500, CONNECTED_LIVE);
    const d = derivedKitMetric(src, v => v / 1000, 'kW → MW');
    expect(d.provenance).toBe('derived');
    expect(d.value).toBe(0.5);
  });

  it('demo source → stays demo (not derived)', () => {
    const src = kitMetric(500, DISABLED_DEMO);
    const d = derivedKitMetric(src, v => v / 1000, 'kW → MW');
    expect(d.provenance).toBe('demo');
  });

  it('unavailable source → unavailable', () => {
    const src = kitMetric(undefined, CONNECTED_LIVE);
    const d = derivedKitMetric(src, v => v * 2, 'x2');
    expect(d.provenance).toBe('unavailable');
    expect(d.value).toBeNull();
  });
});