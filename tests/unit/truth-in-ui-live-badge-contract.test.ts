/**
 * Truth-in-UI contract: no customer-visible surface may render a hardcoded
 * "LIVE" / "Real-time" badge.
 *
 * The product rule is `configured != connected` and `reachable != data flowing`.
 * A live claim is only legal when it is derived from a `ProvenanceMeta` through
 * `ProvenanceBadge` (or the DSX data-mode contract, which resolves LIVE only
 * when `liveVerified === true`). Literal badge text bypasses that contract and
 * presents simulated or modelled values as measured telemetry.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

/** Files that legitimately contain the LIVE token as contract vocabulary. */
const ALLOWED_PATHS = [
  'src/dsx/',
  'src/capabilities/',
  'src/lib/provenance/',
  'src/components/provenance/',
  'src/data/dataModeContract.ts',
];

function sourceFiles(): string[] {
  return globSync('src/**/*.{ts,tsx}', { cwd: ROOT })
    .filter((rel) => !rel.includes('__tests__'))
    .filter((rel) => !ALLOWED_PATHS.some((allowed) => rel.startsWith(allowed)));
}

/** Matches JSX badge text that is exactly a live claim, e.g. `>\n  LIVE\n<`. */
const HARDCODED_LIVE_BADGE = /(^|>)\s*(LIVE|Live|Real-time|REAL-TIME)\s*(<|$)/m;

describe('truth-in-UI: hardcoded live badges', () => {
  it('renders no literal LIVE badge text outside the provenance and data-mode contracts', () => {
    const offenders: string[] = [];

    for (const rel of sourceFiles()) {
      const source = readFileSync(join(ROOT, rel), 'utf8');
      // Only JSX element text counts; prose, comments and identifiers do not.
      const jsxLiveText = source
        .split('\n')
        .map((line, index) => ({ line: line.trim(), index: index + 1 }))
        .filter(({ line }) => /^(LIVE|Real-time|REAL-TIME)$/.test(line));

      for (const hit of jsxLiveText) {
        offenders.push(`${rel}:${hit.index}`);
      }
    }

    expect(
      offenders,
      `Hardcoded live badge text must be replaced with <ProvenanceBadge meta={...} />:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('keeps a badge-text matcher that would catch a regression', () => {
    expect(HARDCODED_LIVE_BADGE.test('>\n LIVE\n<')).toBe(true);
  });

  it('drives the KPI cockpits from provenance metadata', () => {
    for (const rel of [
      'src/components/data-centre-twin/overview/EnhancedKPICockpit.tsx',
      'src/components/data-centre-twin/overview/CompactKPICockpit.tsx',
    ]) {
      const source = readFileSync(join(ROOT, rel), 'utf8');
      expect(source, `${rel} must render ProvenanceBadge`).toContain('<ProvenanceBadge');
      expect(source, `${rel} must not claim LIVE`).not.toMatch(/^\s*LIVE\s*$/m);
    }
  });

  it('declares provenance on the Command Centre landing surface', () => {
    const source = readFileSync(join(ROOT, 'src/workspace/CommandCentre.tsx'), 'utf8');
    expect(source).toContain('<ProvenanceBadge');
    expect(source).toContain("provenance: 'simulated'");
  });
});
