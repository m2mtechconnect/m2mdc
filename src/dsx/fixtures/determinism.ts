/**
 * Deterministic helpers for the Evidence Beta fixtures.
 * No Math.random() anywhere: every fixture value is reproducible from a seed.
 */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a 32-bit hash — used for stable ids and payload hashes. */
export function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic RFC-4122-shaped v4 UUID derived from a namespace string. */
export function stableUuid(key: string): string {
  const rand = mulberry32(fnv1a(key));
  const hex: string[] = [];
  for (let i = 0; i < 16; i++) hex.push(Math.floor(rand() * 256).toString(16).padStart(2, '0'));
  const bytes = hex.slice();
  bytes[6] = ((parseInt(bytes[6], 16) & 0x0f) | 0x40).toString(16).padStart(2, '0');
  bytes[8] = ((parseInt(bytes[8], 16) & 0x3f) | 0x80).toString(16).padStart(2, '0');
  const s = bytes.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

/** Stable content hash string for an original payload. */
export function payloadHash(payload: unknown): string {
  return `fnv1a32:${fnv1a(JSON.stringify(payload)).toString(16).padStart(8, '0')}`;
}

export function roundTo(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}