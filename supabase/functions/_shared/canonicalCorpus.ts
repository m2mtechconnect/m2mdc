/**
 * Phase 3.5 - the shared canonicalization parity corpus.
 *
 * The same semantic input must produce the same canonical text (and therefore
 * the same hash) in every runtime that participates in the truth chain: the
 * browser orchestrator, `run-lifecycle` and `record-decision`.
 *
 * Values that cannot be expressed in JSON (BigInt, Date, Map, Set, cyclic
 * references) are exercised by the runtime-specific suites; this corpus holds
 * only the values that can cross an HTTP boundary, because those are the ones
 * that can actually drift between client and server.
 */
export interface CanonicalCase {
  name: string;
  value: unknown;
  /** Exact expected canonical text under `aura-canonical-v1`. */
  canonical: string;
}

export const CANONICAL_CORPUS: CanonicalCase[] = [
  { name: 'null', value: null, canonical: 'null' },
  { name: 'true', value: true, canonical: 'true' },
  { name: 'empty object', value: {}, canonical: '{}' },
  { name: 'empty array', value: [], canonical: '[]' },
  {
    name: 'reordered keys sort identically (a)',
    value: { b: 2, a: 1, c: 3 },
    canonical: '{"a":1,"b":2,"c":3}',
  },
  {
    name: 'reordered keys sort identically (b)',
    value: { c: 3, a: 1, b: 2 },
    canonical: '{"a":1,"b":2,"c":3}',
  },
  {
    name: 'nested objects sort at every depth',
    value: { z: { y: 1, x: { w: 2, v: 3 } }, a: [3, 1, 2] },
    canonical: '{"a":[3,1,2],"z":{"x":{"v":3,"w":2},"y":1}}',
  },
  { name: 'array order is significant', value: [1, 2, 3], canonical: '[1,2,3]' },
  { name: 'array order is significant (reversed)', value: [3, 2, 1], canonical: '[3,2,1]' },
  { name: 'integer', value: 42, canonical: '42' },
  { name: 'float', value: 1.5, canonical: '1.5' },
  { name: 'positive zero', value: 0, canonical: '0' },
  { name: 'negative zero is distinct from zero', value: -0, canonical: '"@-0"' },
  { name: 'NaN is tagged', value: NaN, canonical: '"@NaN"' },
  { name: 'Infinity is tagged', value: Infinity, canonical: '"@Infinity"' },
  { name: 'negative Infinity is tagged', value: -Infinity, canonical: '"@-Infinity"' },
  {
    name: 'a literal tag-shaped string cannot collide with a tag',
    value: '@NaN',
    canonical: '"@@NaN"',
  },
  { name: 'plain string', value: 'pue', canonical: '"pue"' },
  {
    name: 'unicode is NFC-normalized (composed)',
    value: 'Jumeau num\u00e9rique',
    canonical: '"Jumeau num\u00e9rique"',
  },
  {
    name: 'unicode is NFC-normalized (decomposed)',
    value: 'Jumeau nume\u0301rique',
    canonical: '"Jumeau num\u00e9rique"',
  },
  {
    name: 'an undefined member keeps its key',
    value: { a: 1, b: undefined },
    canonical: '{"a":1,"b":"@undefined"}',
  },
  {
    name: 'a realistic run input snapshot',
    value: {
      twinId: 'twin-1',
      scenarioKey: 'cooling_degradation',
      readings: [
        { assetId: 'rack-a1', property: 'inlet_temperature_c', value: 24.5 },
        { assetId: 'rack-a2', property: 'inlet_temperature_c', value: null },
      ],
      seed: '42',
    },
    canonical:
      '{"readings":[{"assetId":"rack-a1","property":"inlet_temperature_c","value":24.5},' +
      '{"assetId":"rack-a2","property":"inlet_temperature_c","value":null}],' +
      '"scenarioKey":"cooling_degradation","seed":"42","twinId":"twin-1"}',
  },
];

/** Pairs that must hash identically (same semantic input, different shape). */
export const EQUIVALENT_PAIRS: [string, string][] = [
  ['reordered keys sort identically (a)', 'reordered keys sort identically (b)'],
  ['unicode is NFC-normalized (composed)', 'unicode is NFC-normalized (decomposed)'],
];

/** Pairs that must NOT hash identically. */
export const DISTINCT_PAIRS: [string, string][] = [
  ['positive zero', 'negative zero is distinct from zero'],
  ['NaN is tagged', 'a literal tag-shaped string cannot collide with a tag'],
  ['array order is significant', 'array order is significant (reversed)'],
  ['empty object', 'empty array'],
];
