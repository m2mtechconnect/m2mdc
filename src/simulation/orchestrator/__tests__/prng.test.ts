/**
 * Phase 2 closure - PRNG qualification and fixed test vectors.
 *
 * These vectors pin `mulberry32-v1` and `fnv1a-32-v1`. If a future change
 * alters them, historical runs stop reproducing - so a failure here means the
 * algorithm version must be bumped deliberately, never patched away.
 */

import { describe, expect, it } from 'vitest';

import {
  deriveSeed,
  mulberry32,
  newIdentifier,
  PRNG_ALGORITHM,
  SEED_DERIVATION_ALGORITHM,
} from '../prng';
import { hashCanonical } from '../canonical';

function draw(seed: number, n: number): number[] {
  const rnd = mulberry32(seed);
  return Array.from({ length: n }, () => rnd());
}

describe('PRNG qualification', () => {
  it('declares versioned algorithm names', () => {
    expect(PRNG_ALGORITHM).toBe('mulberry32-v1');
    expect(SEED_DERIVATION_ALGORITHM).toBe('fnv1a-32-v1');
  });

  it('reproduces a fixed sequence for a fixed seed', () => {
    // Frozen vector. Do not edit without bumping PRNG_ALGORITHM.
    expect(draw(1, 4).map((v) => v.toFixed(12))).toEqual([
      '0.627073940588',
      '0.002735721180',
      '0.527447039960',
      '0.981050967472',
    ]);
  });

  it('reproduces a fixed sequence for seed 0 and for a large seed', () => {
    expect(draw(0, 2)).toEqual(draw(0, 2));
    expect(draw(0xdeadbeef, 3)).toEqual(draw(0xdeadbeef, 3));
    expect(draw(0, 3)).not.toEqual(draw(1, 3));
  });

  it('emits values in [0, 1)', () => {
    for (const seed of [0, 1, 7, 4294967295]) {
      for (const v of draw(seed, 200)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    }
  });

  it('derives a stable 32-bit seed from canonical text', () => {
    // Frozen FNV-1a 32-bit vectors.
    expect(deriveSeed('')).toBe(0x811c9dc5);
    expect(deriveSeed('a')).toBe(0xe40c292c);
    expect(deriveSeed('foobar')).toBe(0xbf9cf968);
    expect(deriveSeed('aura')).toBe(deriveSeed('aura'));
    expect(deriveSeed('aura')).not.toBe(deriveSeed('aurb'));
  });

  it('always derives an unsigned 32-bit integer', () => {
    for (const text of ['', 'x', 'a longer piece of canonical seed material |1|2']) {
      const s = deriveSeed(text);
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

describe('seed-space collisions cannot become identity collisions', () => {
  it('run identity is not derived from the PRNG or its 32-bit state', () => {
    // Two ids requested with no distinguishing input at all must still differ.
    const ids = new Set(Array.from({ length: 500 }, () => newIdentifier('run')));
    expect(ids.size).toBe(500);
  });

  it('canonical hashes are 256-bit and independent of the derived seed', () => {
    // Same seed material, different payloads -> different hashes regardless of
    // any seed coincidence.
    const a = hashCanonical({ payload: 'A' });
    const b = hashCanonical({ payload: 'B' });
    expect(a).not.toBe(b);
    expect(a).toHaveLength(64);
    expect(b).toHaveLength(64);
  });

  it('two inputs that happen to share a derived seed still hash differently', () => {
    // Force the collision explicitly: reuse one seed across two payloads.
    const seed = deriveSeed('shared-material');
    const runA = { seed, input: hashCanonical({ v: 1 }) };
    const runB = { seed, input: hashCanonical({ v: 2 }) };
    expect(runA.seed).toBe(runB.seed);
    expect(hashCanonical(runA)).not.toBe(hashCanonical(runB));
  });
});