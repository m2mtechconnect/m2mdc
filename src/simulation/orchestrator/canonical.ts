/**
 * Phase 2 - canonical serialization and hashing.
 *
 * Hashes are part of the provenance contract, so serialization must be stable:
 * object key order, `undefined` members and numeric formatting may not change
 * a hash. SHA-256 is implemented here synchronously because provenance is
 * generated on synchronous preview paths as well as async provider paths.
 */

/** Deterministic JSON: object keys sorted, undefined dropped, NaN/Inf tagged. */
export function canonicalize(value: unknown): string {
  return serialize(value);
}

function serialize(value: unknown): string {
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'number') {
    const n = value as number;
    if (Number.isNaN(n)) return '"@NaN"';
    if (!Number.isFinite(n)) return n > 0 ? '"@Infinity"' : '"@-Infinity"';
    return JSON.stringify(n);
  }
  if (t === 'string' || t === 'boolean') return JSON.stringify(value);
  if (t === 'bigint') return JSON.stringify(`@bigint:${(value as bigint).toString()}`);
  if (t === 'undefined' || t === 'function' || t === 'symbol') return '"@undefined"';
  if (value instanceof Date) return JSON.stringify(`@date:${value.toISOString()}`);
  if (Array.isArray(value)) return `[${value.map(serialize).join(',')}]`;
  if (value instanceof Map) {
    const entries = Array.from(value.entries()).map(
      ([k, v]) => [String(k), v] as [string, unknown],
    );
    entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${serialize(v)}`).join(',')}}`;
  }
  if (value instanceof Set) {
    const items = Array.from(value.values()).map(serialize);
    items.sort();
    return `[${items.join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => typeof obj[k] !== 'undefined' && typeof obj[k] !== 'function')
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${serialize(obj[k])}`).join(',')}}`;
}

/* ---------------------------------------------------------------- SHA-256 */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function utf8Bytes(input: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(input);
  const out: number[] = [];
  for (let i = 0; i < input.length; i += 1) out.push(input.charCodeAt(i) & 0xff);
  return Uint8Array.from(out);
}

/** Synchronous SHA-256, hex encoded. */
export function sha256Hex(input: string): string {
  const msg = utf8Bytes(input);
  const bitLen = msg.length * 8;
  const withPad = new Uint8Array((((msg.length + 9) >> 6) + 1) << 6);
  withPad.set(msg);
  withPad[msg.length] = 0x80;
  const view = new DataView(withPad.buffer);
  view.setUint32(withPad.length - 8, Math.floor(bitLen / 0x100000000));
  view.setUint32(withPad.length - 4, bitLen >>> 0);

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);

  for (let off = 0; off < withPad.length; off += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e;
      e = (d + t1) >>> 0;
      d = c; c = b; b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
  }
  return Array.from(h, (x) => x.toString(16).padStart(8, '0')).join('');
}

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

/** Canonical hash of any value. Stable under key reordering. */
export function hashCanonical(value: unknown): string {
  return sha256Hex(canonicalize(value));
}