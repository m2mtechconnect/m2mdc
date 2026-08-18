/**
 * Phase 2 - the single seeded PRNG used by every stochastic AURA run.
 *
 * Truth rules:
 *   - No simulation code may call `Math.random()`.
 *   - A stochastic run must receive its generator from the orchestrator and
 *     must persist the seed that produced it.
 *   - The algorithm is versioned. Changing it is a breaking change and the
 *     fixed vectors in `__tests__/prng.test.ts` must be updated deliberately.
 */

export const PRNG_ALGORITHM = 'mulberry32-v1' as const;

export type SeededRandom = () => number;

/** Mulberry32. Small, fast, and stable across engines. */
export function mulberry32(seed: number): SeededRandom {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Derive a 32-bit seed from arbitrary canonical text (FNV-1a).
 * Used when a stochastic run is requested without an explicit seed: the seed
 * is then a function of the request, never of the wall clock.
 */
export function deriveSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * A fresh unpredictable seed, for cases where reproducibility must start from
 * a new draw rather than from the request. Never uses `Date.now()` alone.
 */
export function freshSeed(): number {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.getRandomValues === 'function') {
    const buf = new Uint32Array(1);
    c.getRandomValues(buf);
    return buf[0] >>> 0;
  }
  // Fail closed to a derived seed rather than an unrecorded Math.random().
  return deriveSeed(`fallback:${Date.now()}:${SEED_COUNTER++}`);
}

let SEED_COUNTER = 0;

/** Stable identifier generation. Not part of any numeric result. */
export function newIdentifier(prefix: string): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  const uuid =
    c && typeof c.randomUUID === 'function'
      ? c.randomUUID()
      : `${deriveSeed(`${Date.now()}:${SEED_COUNTER++}`).toString(36)}${SEED_COUNTER.toString(36)}`;
  return prefix ? `${prefix}-${uuid}` : uuid;
}