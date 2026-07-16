import { describe, it, expect } from 'vitest';
import {
  UNAVAILABLE_META,
  getProvenance,
  provenanceLabel,
  isOperational,
  derivedFrom,
} from '@/lib/provenance';
import type { FacilityProvenanceMap, ProvenanceMeta } from '@/lib/provenance/types';

describe('getProvenance', () => {
  it('returns UNAVAILABLE_META when the map is undefined', () => {
    expect(getProvenance(undefined, 'pue')).toBe(UNAVAILABLE_META);
  });
  it('returns UNAVAILABLE_META when the key is missing', () => {
    const partial: Partial<FacilityProvenanceMap> = {};
    expect(getProvenance(partial, 'pue').provenance).toBe('unavailable');
  });
  it('never lets a missing key default to live', () => {
    expect(getProvenance({}, 'pue').provenance).not.toBe('live');
  });
});

describe('provenanceLabel', () => {
  it('provides a human label for every provenance type', () => {
    for (const p of ['live', 'derived', 'simulated', 'demo', 'static', 'unavailable'] as const) {
      expect(provenanceLabel(p)).toBeTruthy();
    }
  });
});

describe('isOperational', () => {
  it('is true only for live and derived', () => {
    expect(isOperational('live')).toBe(true);
    expect(isOperational('derived')).toBe(true);
    expect(isOperational('demo')).toBe(false);
    expect(isOperational('simulated')).toBe(false);
    expect(isOperational('static')).toBe(false);
    expect(isOperational('unavailable')).toBe(false);
  });
});

describe('derivedFrom', () => {
  it('produces a derived meta when source is live', () => {
    const src: ProvenanceMeta = { provenance: 'live', source: 'kit', at: new Date() };
    const d = derivedFrom(src, 'aggregation');
    expect(d.provenance).toBe('derived');
    expect(d.source).toBe('kit');
  });
  it('does NOT upgrade a demo source to derived', () => {
    const src: ProvenanceMeta = { provenance: 'demo', source: 'demo-fixture' };
    const d = derivedFrom(src);
    expect(d.provenance).toBe('demo');
  });
  it('does NOT upgrade an unavailable source to derived', () => {
    const src: ProvenanceMeta = { provenance: 'unavailable', source: 'kit' };
    const d = derivedFrom(src);
    expect(d.provenance).toBe('unavailable');
  });
});