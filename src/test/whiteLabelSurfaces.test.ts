/**
 * White-label regression suite.
 *
 * User-facing managed connector surfaces must never expose the underlying
 * platform provider names, OAuth setup instructions, or credential material.
 * The suite statically scans prose string literals rendered by the connection
 * surfaces plus the connector manifest metadata shown in the UI.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SURFACE_DIRS = ['src/components/connections', 'src/components/dsx', 'src/connections', 'src/pages'];

const PROHIBITED: { label: string; pattern: RegExp }[] = [
  { label: 'platform vendor name (Lovable)', pattern: /\blovable\b/i },
  { label: 'backend provider name (Supabase)', pattern: /\bsupabase\b/i },
  { label: 'service role key', pattern: /service[_ ]role/i },
  { label: 'OAuth client secret', pattern: /client[_ ]secret/i },
  { label: 'OAuth client id instruction', pattern: /client[_ ]id/i },
  { label: 'OAuth redirect instruction', pattern: /redirect[_ ]uri|callback url/i },
  { label: 'provider developer console instruction', pattern: /developer (console|portal|dashboard)/i },
  { label: 'raw token material', pattern: /\b(access|refresh|bearer)[_ ]token\b/i },
  { label: 'provider credential paste instruction', pattern: /paste[^.]{0,40}from (your|the) [a-z ]*(provider|vendor|account|console|portal)/i },
];

function walk(dir: string): string[] {
  let out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__') continue;
      out = out.concat(walk(full));
    } else if (/\.tsx$/.test(entry) && !/\.test\.tsx$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Prose = quoted literals or JSX text with at least two words; excludes identifiers and route keys. */
function proseStrings(source: string): string[] {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const literals = (withoutComments.match(/'[^'\n]{6,}'|"[^"\n]{6,}"|`[^`\n]{6,}`/g) ?? []).filter(
    // Interpolated template literals are request plumbing (headers, URLs), not rendered prose.
    (s) => !s.includes('${'),
  );
  const jsxText = withoutComments.match(/>[^<>{}\n]{6,}</g) ?? [];
  return [...literals, ...jsxText]
    .map((s) => s.slice(1, -1).trim())
    .filter((s) => /\s/.test(s) && /[a-z]{3}/i.test(s));
}

describe('managed connector white-label surfaces', () => {
  const files = SURFACE_DIRS.flatMap(walk);

  it('scans a non-trivial set of user-facing files', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(PROHIBITED)('never renders $label', ({ pattern }) => {
    const violations: string[] = [];
    for (const file of files) {
      for (const text of proseStrings(readFileSync(file, 'utf8'))) {
        if (pattern.test(text)) violations.push(`${file}: ${text}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('keeps connector manifest labels and descriptions white-labelled', async () => {
    const manifestSource = readFileSync('supabase/functions/_shared/managedConnectorManifest.ts', 'utf8');
    for (const { pattern, label } of PROHIBITED) {
      const hits = proseStrings(manifestSource).filter((t) => pattern.test(t));
      expect(hits, `${label} present in connector manifest`).toEqual([]);
    }
  });
});
