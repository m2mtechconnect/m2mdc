import { describe, expect, it } from 'vitest';
import {
  assertTrendAllowed,
  isTrendRenderable,
  presentationFor,
  seriesClassificationFor,
  type SeriesDescriptor,
} from '../chartSemantics';

const pointInTime: SeriesDescriptor = {
  classification: 'POINT_IN_TIME',
  unit: 'kW',
  source: 'nvidia-dsx-blueprint',
  observations: [{ timestamp: '2026-01-01T00:00:00.000Z', value: 120 }],
  timeRange: null,
};

describe('chart semantics', () => {
  it('never lets a single reference value enter a trend renderer', () => {
    expect(isTrendRenderable(pointInTime)).toBe(false);
    expect(presentationFor(pointInTime)).toBe('snapshot-kpi');
    expect(() => assertTrendAllowed(pointInTime, 'sparkline')).toThrow(/Refusing to render/);
    expect(() => assertTrendAllowed(pointInTime, 'trend-arrow')).toThrow();
  });

  it('renders a terminal unavailable state rather than substituting history', () => {
    const s: SeriesDescriptor = { ...pointInTime, classification: 'UNAVAILABLE', observations: [] };
    expect(presentationFor(s)).toBe('unavailable-state');
    expect(() => assertTrendAllowed(s, 'line')).toThrow();
  });

  it('allows a true time series only with units, source and a range', () => {
    const base: SeriesDescriptor = {
      classification: 'TRUE_TIME_SERIES',
      unit: 'kW',
      source: 'facility-historian',
      observations: [
        { timestamp: '2026-01-01T00:00:00.000Z', value: 1 },
        { timestamp: '2026-01-01T01:00:00.000Z', value: 2 },
      ],
      timeRange: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-01T01:00:00.000Z' },
    };
    expect(isTrendRenderable(base)).toBe(true);
    expect(isTrendRenderable({ ...base, unit: null })).toBe(false);
    expect(isTrendRenderable({ ...base, timeRange: null })).toBe(false);
  });

  it('requires run identity for simulated and derived series', () => {
    const sim: SeriesDescriptor = {
      classification: 'SIMULATED_SERIES',
      unit: 'kW',
      source: 'aura-simulation',
      observations: [
        { timestamp: '2026-01-01T00:00:00.000Z', value: 1 },
        { timestamp: '2026-01-01T01:00:00.000Z', value: 2 },
      ],
      timeRange: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-01T01:00:00.000Z' },
    };
    expect(isTrendRenderable(sim)).toBe(false);
    expect(isTrendRenderable({ ...sim, runId: 'run-1' })).toBe(true);
  });

  it('maps value classifications conservatively', () => {
    expect(seriesClassificationFor('REFERENCE_VALUE')).toBe('POINT_IN_TIME');
    expect(seriesClassificationFor('SIMULATED_RESULT')).toBe('SIMULATED_SERIES');
    expect(seriesClassificationFor('NOT_CONNECTED')).toBe('UNAVAILABLE');
  });
});
