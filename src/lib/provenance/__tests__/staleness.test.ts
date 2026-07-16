import { describe, it, expect } from 'vitest';
import { isStale, withStalenessCheck, deriveIfFresh, FRESHNESS_BUDGET_MS } from '../staleness';
import { liveMetric, demoMetric, unavailableMetric } from '@/lib/provenance';

const T0 = new Date('2026-07-16T12:00:00.000Z');
const fresh = (ms: number) => new Date(T0.getTime() - ms).toISOString();

describe('staleness', () => {
  it('treats missing timestamp as stale', () => {
    expect(isStale(undefined, 'gpu', T0)).toBe(true);
    expect(isStale('not-a-date', 'gpu', T0)).toBe(true);
  });

  it('fresh within budget', () => {
    expect(isStale(fresh(FRESHNESS_BUDGET_MS.gpu - 1), 'gpu', T0)).toBe(false);
  });

  it('stale beyond budget', () => {
    expect(isStale(fresh(FRESHNESS_BUDGET_MS.gpu + 1), 'gpu', T0)).toBe(true);
  });

  it('at boundary is fresh (not >)', () => {
    expect(isStale(fresh(FRESHNESS_BUDGET_MS.gpu), 'gpu', T0)).toBe(false);
  });

  it('withStalenessCheck flips a live metric to stale', () => {
    const m = liveMetric(0.61, 'gpu-agent', fresh(FRESHNESS_BUDGET_MS.gpu + 1_000));
    const checked = withStalenessCheck(m, 'gpu', T0);
    expect(checked.isStale).toBe(true);
    expect(checked.provenance).toBe('live'); // provenance untouched, only stale flag
  });

  it('withStalenessCheck leaves demo/unavailable alone', () => {
    const d = demoMetric(0.5, 'fixture');
    expect(withStalenessCheck(d, 'gpu', T0)).toBe(d);
    const u = unavailableMetric<number>('gpu-agent');
    expect(withStalenessCheck(u, 'gpu', T0)).toBe(u);
  });

  it('deriveIfFresh withholds derivation when input is stale', () => {
    const src = liveMetric(0.6, 'gpu-agent', fresh(FRESHNESS_BUDGET_MS.gpu + 1_000));
    const out = deriveIfFresh(src, 'gpu', (v) => v * 100, 'gpu_pct = util * 100', T0);
    expect(out.value).toBeNull();
    expect(out.provenance).toBe('unavailable');
    expect(out.description).toMatch(/stale/i);
  });

  it('deriveIfFresh withholds derivation when input is demo', () => {
    const src = demoMetric(0.6, 'fixture');
    const out = deriveIfFresh(src, 'gpu', (v) => v * 100, 'x', T0);
    expect(out.provenance).toBe('unavailable');
    expect(out.description).toMatch(/provenance "demo"/);
  });

  it('deriveIfFresh produces derived when input is live+fresh', () => {
    const src = liveMetric(0.6, 'gpu-agent', fresh(1_000));
    const out = deriveIfFresh(src, 'gpu', (v) => v * 100, 'x', T0);
    expect(out.value).toBe(60);
    expect(out.provenance).toBe('derived');
    expect(out.isStale).toBe(false);
  });

  it('deriveIfFresh withholds when input value is null', () => {
    const src = unavailableMetric<number>('gpu-agent');
    const out = deriveIfFresh(src, 'gpu', (v) => v * 100, 'x', T0);
    expect(out.value).toBeNull();
    expect(out.provenance).toBe('unavailable');
  });
});