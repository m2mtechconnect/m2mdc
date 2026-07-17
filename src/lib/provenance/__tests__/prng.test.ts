import { describe, it, expect } from 'vitest';
import { hashString, mulberry32, seededRng, rngRange, rngInt } from '../prng';

describe('provenance/prng', () => {
  it('hashString is stable', () => {
    expect(hashString('foo')).toBe(hashString('foo'));
    expect(hashString('foo')).not.toBe(hashString('bar'));
  });

  it('mulberry32 is deterministic for equal seeds', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 8 }, () => a());
    const seqB = Array.from({ length: 8 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('mulberry32 produces different sequences for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  it('seededRng from equal strings produces identical output', () => {
    const a = seededRng('CA-QC/ai_hpc');
    const b = seededRng('CA-QC/ai_hpc');
    for (let i = 0; i < 16; i++) expect(a()).toBe(b());
  });

  it('rngRange stays within bounds', () => {
    const r = seededRng('bounds');
    for (let i = 0; i < 100; i++) {
      const v = rngRange(r, 10, 20);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThan(20);
    }
  });

  it('rngInt is inclusive on both bounds', () => {
    const r = seededRng('int');
    for (let i = 0; i < 200; i++) {
      const v = rngInt(r, 0, 3);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(3);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});