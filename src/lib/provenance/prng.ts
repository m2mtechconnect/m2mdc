/**
 * Deterministic PRNG utilities (Phase 1A.3.b).
 *
 * Every render-path randomness site inside a KPI-bearing surface must be
 * driven by a seeded PRNG so that identical inputs produce byte-identical
 * output. This is a prerequisite for truthful `demo` labelling: a value that
 * mutates every render is not a defensible demo reading.
 *
 * The PRNG is `mulberry32` — 32-bit, non-cryptographic, fast, and
 * deterministic. It intentionally does NOT satisfy any cryptographic
 * property; do not use it for id generation, tokens, or anything sensitive.
 *
 * `hashString` produces a stable 32-bit integer from an arbitrary string
 * seed (twin id, scenario id, region+industry). Two calls with equal input
 * always return the same seed.
 */

/** Stable 32-bit hash of an arbitrary string. */
export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Seeded PRNG. Returns a function that yields deterministic floats in [0,1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convenience: build a PRNG seeded from a string. */
export function seededRng(seedText: string): () => number {
  return mulberry32(hashString(seedText));
}

/** Uniform float in [min, max). */
export function rngRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Integer in [min, max] inclusive. */
export function rngInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rngRange(rng, min, max + 1));
}