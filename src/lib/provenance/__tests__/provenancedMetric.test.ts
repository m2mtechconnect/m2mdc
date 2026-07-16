import { describe, it, expect } from 'vitest';
import {
  demoMetric,
  deriveMetric,
  isOperationalMetric,
  liveMetric,
  staticMetric,
  unavailableMetric,
} from '@/lib/provenance';

describe('ProvenancedMetric<T>', () => {
  it('unavailableMetric produces a null value with unavailable provenance', () => {
    const m = unavailableMetric<number>('omniverse-kit', 'PUE');
    expect(m.value).toBeNull();
    expect(m.provenance).toBe('unavailable');
    expect(isOperationalMetric(m)).toBe(false);
  });

  it('liveMetric records source + timestamp and is operational', () => {
    const t = new Date('2025-01-01T00:00:00Z');
    const m = liveMetric(1.24, 'omniverse-kit', t);
    expect(m.value).toBe(1.24);
    expect(m.provenance).toBe('live');
    expect(m.sourceTimestamp).toBe(t.toISOString());
    expect(isOperationalMetric(m)).toBe(true);
  });

  it('demoMetric never presents as operational', () => {
    const m = demoMetric(42, 'demo-fixture');
    expect(m.provenance).toBe('demo');
    expect(isOperationalMetric(m)).toBe(false);
  });

  it('staticMetric is not operational (it is a target, not a reading)', () => {
    const m = staticMetric(1.2, 'kpi-target');
    expect(m.provenance).toBe('static');
    expect(isOperationalMetric(m)).toBe(false);
  });

  it('deriveMetric upgrades a live source to derived and records derivation', () => {
    const src = liveMetric(500, 'omniverse-kit', new Date());
    const derived = deriveMetric(src, v => v / 1000, 'kW → MW');
    expect(derived.value).toBe(0.5);
    expect(derived.provenance).toBe('derived');
    expect(derived.derivation).toBe('kW → MW');
    expect(isOperationalMetric(derived)).toBe(true);
  });

  it('deriveMetric refuses to upgrade a non-live source to derived', () => {
    const src = demoMetric(500, 'demo-fixture');
    const derived = deriveMetric(src, v => v / 1000, 'kW → MW');
    // Value is still computed, but provenance stays `demo` — never `derived`/`live`.
    expect(derived.value).toBe(0.5);
    expect(derived.provenance).toBe('demo');
    expect(isOperationalMetric(derived)).toBe(false);
  });

  it('deriveMetric collapses to unavailable when source is unavailable', () => {
    const src = unavailableMetric<number>('omniverse-kit');
    const derived = deriveMetric(src, v => v * 2, 'x2');
    expect(derived.value).toBeNull();
    expect(derived.provenance).toBe('unavailable');
  });
});