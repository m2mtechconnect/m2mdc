/**
 * Phase 3.5 - cross-runtime canonicalization parity.
 *
 * `aura-canonical-v1` exists in two source files because the Deno edge
 * runtime cannot import the browser bundle. This suite runs one shared corpus
 * through BOTH implementations and asserts identical canonical text and
 * identical SHA-256 hashes, so the two copies cannot drift silently.
 */
import { describe, expect, it } from 'vitest';
import {
  CANONICAL_SCHEMA_VERSION as CLIENT_VERSION,
  CanonicalizationError as ClientError,
  canonicalize as clientCanonicalize,
  hashCanonical as clientHash,
} from '@/simulation/orchestrator/canonical';
import {
  CANONICAL_SCHEMA_VERSION as EDGE_VERSION,
  CanonicalizationError as EdgeError,
  canonicalize as edgeCanonicalize,
  canonicalHash as edgeHash,
} from '../../../supabase/functions/_shared/canonicalHash.ts';
import {
  CANONICAL_CORPUS,
  DISTINCT_PAIRS,
  EQUIVALENT_PAIRS,
} from '../../../supabase/functions/_shared/canonicalCorpus.ts';

const byName = new Map(CANONICAL_CORPUS.map((c) => [c.name, c]));

describe('canonicalization parity: browser vs edge runtime', () => {
  it('agrees on the canonical schema version', () => {
    expect(EDGE_VERSION).toBe(CLIENT_VERSION);
    expect(CLIENT_VERSION).toBe('aura-canonical-v1');
  });

  it.each(CANONICAL_CORPUS.map((c) => [c.name, c] as const))(
    'produces the pinned canonical text in both runtimes: %s',
    (_name, c) => {
      expect(clientCanonicalize(c.value)).toBe(c.canonical);
      expect(edgeCanonicalize(c.value)).toBe(c.canonical);
    },
  );

  it('produces the identical hash in both runtimes for every case', async () => {
    for (const c of CANONICAL_CORPUS) {
      expect(await edgeHash(c.value)).toBe(clientHash(c.value));
    }
  });

  it('hashes semantically equivalent inputs identically', async () => {
    for (const [a, b] of EQUIVALENT_PAIRS) {
      const va = byName.get(a)!.value;
      const vb = byName.get(b)!.value;
      expect(clientHash(va)).toBe(clientHash(vb));
      expect(await edgeHash(va)).toBe(await edgeHash(vb));
    }
  });

  it('never collides distinct inputs', async () => {
    for (const [a, b] of DISTINCT_PAIRS) {
      const va = byName.get(a)!.value;
      const vb = byName.get(b)!.value;
      expect(clientHash(va)).not.toBe(clientHash(vb));
      expect(await edgeHash(va)).not.toBe(await edgeHash(vb));
    }
  });

  it('rejects cyclic structures in both runtimes instead of truncating them', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => clientCanonicalize(cyclic)).toThrow(ClientError);
    expect(() => edgeCanonicalize(cyclic)).toThrow(EdgeError);
  });

  it('emits bare lowercase hex so client and server hashes are comparable', async () => {
    const value = { pue: 1.32 };
    expect(clientHash(value)).toMatch(/^[0-9a-f]{64}$/);
    expect(await edgeHash(value)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('handles Map, Set, BigInt and Date identically across runtimes', async () => {
    const cases: unknown[] = [
      new Map([['b', 2], ['a', 1]]),
      new Set(['z', 'a']),
      { big: 10n },
      { at: new Date('2026-01-01T00:00:00.000Z') },
      { at: new Date(NaN) },
    ];
    for (const value of cases) {
      expect(edgeCanonicalize(value)).toBe(clientCanonicalize(value));
      expect(await edgeHash(value)).toBe(clientHash(value));
    }
  });
});