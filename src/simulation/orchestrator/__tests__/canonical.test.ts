/**
 * Phase 2 closure - canonical serialization boundaries.
 *
 * A hash is evidence. Two meaningfully different inputs must never produce the
 * same canonical text, and one input must never produce two different texts.
 */

import { describe, expect, it } from 'vitest';

import {
  canonicalize,
  CanonicalizationError,
  CANONICAL_SCHEMA_VERSION,
  hashCanonical,
} from '../canonical';

describe('canonical serialization', () => {
  it('exposes a versioned rule set', () => {
    expect(CANONICAL_SCHEMA_VERSION).toBe('aura-canonical-v1');
  });

  it('is stable under object key reordering', () => {
    expect(canonicalize({ a: 1, b: 2 })).toBe(canonicalize({ b: 2, a: 1 }));
    expect(hashCanonical({ a: 1, b: 2 })).toBe(hashCanonical({ b: 2, a: 1 }));
  });

  it('is stable under nested key reordering', () => {
    const x = { outer: { z: [1, { p: 1, q: 2 }], a: 'v' } };
    const y = { outer: { a: 'v', z: [1, { q: 2, p: 1 }] } };
    expect(hashCanonical(x)).toBe(hashCanonical(y));
  });

  it('treats array order as significant', () => {
    expect(canonicalize([1, 2, 3])).not.toBe(canonicalize([3, 2, 1]));
  });

  it('normalizes unicode to NFC so identical text hashes identically', () => {
    const composed = 'é';
    const decomposed = 'e\u0301';
    expect(composed).not.toBe(decomposed);
    expect(hashCanonical({ v: composed })).toBe(hashCanonical({ v: decomposed }));
  });

  it('distinguishes null, undefined, false and zero', () => {
    const forms = [null, undefined, false, 0, '', 'null'].map((v) => canonicalize({ v }));
    expect(new Set(forms).size).toBe(forms.length);
  });

  it('never drops an undefined member', () => {
    // The classic collision: `{a:1}` vs `{a:1,b:undefined}`.
    expect(canonicalize({ a: 1 })).not.toBe(canonicalize({ a: 1, b: undefined }));
  });

  it('never drops a function member', () => {
    expect(canonicalize({ a: 1 })).not.toBe(canonicalize({ a: 1, f: function named() {} }));
    expect(canonicalize({ f: function one() {} })).not.toBe(
      canonicalize({ f: function two() {} }),
    );
  });

  it('never drops a symbol member', () => {
    expect(canonicalize({ s: Symbol('a') })).not.toBe(canonicalize({ s: Symbol('b') }));
  });

  it('distinguishes negative and decimal numbers', () => {
    const forms = [1, -1, 1.5, -1.5, 0.1, 0.10000000000000002].map((v) => canonicalize(v));
    expect(new Set(forms).size).toBe(forms.length);
  });

  it('distinguishes -0 from 0', () => {
    expect(canonicalize(-0)).toBe('"@-0"');
    expect(canonicalize(-0)).not.toBe(canonicalize(0));
  });

  it('tags NaN and both infinities distinctly', () => {
    expect(canonicalize(Number.NaN)).toBe('"@NaN"');
    expect(canonicalize(Number.POSITIVE_INFINITY)).toBe('"@Infinity"');
    expect(canonicalize(Number.NEGATIVE_INFINITY)).toBe('"@-Infinity"');
  });

  it('cannot be spoofed by a string that looks like a type tag', () => {
    // A literal '@NaN' must not canonicalize to the NaN tag.
    const tagged = [Number.NaN, Infinity, -Infinity, -0, 10n, new Date(0)].map(canonicalize);
    const spoofs = ['@NaN', '@Infinity', '@-Infinity', '@-0', '@bigint:10', '@date:1970-01-01T00:00:00.000Z'].map(
      canonicalize,
    );
    for (const s of spoofs) expect(tagged).not.toContain(s);
    expect(new Set([...tagged, ...spoofs]).size).toBe(tagged.length + spoofs.length);
  });

  it('tags dates by instant, including an invalid date', () => {
    const d = new Date('2026-01-02T03:04:05.000Z');
    expect(canonicalize(d)).toBe('"@date:2026-01-02T03:04:05.000Z"');
    expect(canonicalize(new Date('nonsense'))).toBe('"@date:invalid"');
    expect(canonicalize(d)).not.toBe(canonicalize(new Date('2026-01-02T03:04:06.000Z')));
  });

  it('tags bigint by value and separates it from the equivalent number', () => {
    expect(canonicalize(10n)).toBe('"@bigint:10"');
    expect(canonicalize(10n)).not.toBe(canonicalize(10));
  });

  it('preserves booleans distinctly', () => {
    expect(canonicalize(true)).toBe('true');
    expect(canonicalize(false)).toBe('false');
    expect(canonicalize(true)).not.toBe(canonicalize('true'));
  });

  it('separates Map and Set forms from plain objects and arrays', () => {
    expect(canonicalize(new Map([['a', 1]]))).not.toBe(canonicalize({ a: 1 }));
    expect(canonicalize(new Set([1, 2]))).not.toBe(canonicalize([1, 2]));
  });

  it('rejects cyclic structures instead of truncating them', () => {
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic.self = cyclic;
    expect(() => canonicalize(cyclic)).toThrow(CanonicalizationError);
  });

  it('allows repeated (non-cyclic) references to the same object', () => {
    const shared = { a: 1 };
    expect(() => canonicalize({ x: shared, y: shared })).not.toThrow();
  });

  it('produces a 64-character hex digest', () => {
    expect(hashCanonical({ a: 1 })).toMatch(/^[0-9a-f]{64}$/);
  });

  it('matches published SHA-256 vectors so the digest cannot silently change', () => {
    // sha256("null") - the canonical text of `null`.
    expect(hashCanonical(null)).toBe(
      '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    );
  });
});