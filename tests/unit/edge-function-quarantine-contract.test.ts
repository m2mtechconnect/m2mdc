import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Edge function quarantine contract.
 *
 * See docs/remediation/edge-function-quarantine.md.
 *
 * Functions with no repository caller are quarantined in place: they stay on
 * disk, stay out of the production perimeter, and must not silently acquire a
 * caller while still listed as dead.
 */

const REPO = process.cwd();
const FUNCTIONS_DIR = join(REPO, 'supabase/functions');
const QUARANTINE = join(
  REPO,
  'docs/remediation/evidence/pr-0.1/edge-function-quarantine.json',
);
const PROMOTIONS = join(
  REPO,
  'docs/remediation/evidence/pr-0.1/edge-function-promotions.json',
);

const register = JSON.parse(readFileSync(QUARANTINE, 'utf8')) as {
  functions: string[];
};
const quarantined = new Set(register.functions);

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(entry)) out.push(full);
  }
  return out;
}

function repositoryCallers(): Set<string> {
  const callers = new Set<string>();
  const files = [
    ...walk(join(REPO, 'src')),
    ...walk(join(REPO, 'scripts')),
    ...walk(join(REPO, 'tests')),
  ].filter((file) => !file.endsWith('edge-function-quarantine-contract.test.ts'));

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/invoke\(\s*["'`]([a-z0-9-]+)/g)) {
      callers.add(match[1]);
    }
    for (const match of source.matchAll(/functions\/v1\/([a-z0-9-]+)/g)) {
      callers.add(match[1]);
    }
  }
  return callers;
}

describe('edge function quarantine contract', () => {
  it('registers a non-empty quarantine list', () => {
    expect(register.functions.length).toBeGreaterThan(0);
    expect(new Set(register.functions).size).toBe(register.functions.length);
  });

  it('only lists functions that still exist on disk', () => {
    const missing = register.functions.filter(
      (name) => !existsSync(join(FUNCTIONS_DIR, name, 'index.ts')),
    );
    expect(missing).toEqual([]);
  });

  it('never promotes a quarantined function to the production perimeter', () => {
    const promotions = JSON.parse(readFileSync(PROMOTIONS, 'utf8')) as {
      promotions: Array<{ function: string }>;
    };
    const promoted = promotions.promotions
      .map((entry) => entry.function)
      .filter((name) => quarantined.has(name));
    expect(promoted).toEqual([]);
  });

  it('keeps quarantined functions free of repository callers', () => {
    const callers = repositoryCallers();
    const revived = register.functions.filter((name) => callers.has(name));
    expect(revived).toEqual([]);
  });
});
