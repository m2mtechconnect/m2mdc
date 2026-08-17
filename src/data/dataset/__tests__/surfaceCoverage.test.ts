/**
 * Every authenticated route declared in the shell must be classified.
 *
 * An unclassified route is a real hole, not a documentation gap: the reference
 * gate never sees it, so the legacy synthetic page renders while the canary
 * claims that no synthetic dependency is runtime-reachable. This test reads the
 * router source directly so a newly added route fails here rather than in
 * production.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SURFACE_MATRIX, surfaceForPath } from '../surfaceRegistry';

const SHELL = resolve(process.cwd(), 'src/AuthenticatedShell.tsx');

/** Route paths declared in the authenticated shell, with nested paths joined. */
function declaredRoutes(): string[] {
  const source = readFileSync(SHELL, 'utf8');
  const paths = [...source.matchAll(/<Route\s+path=(?:"([^"]+)"|\{`?([^`}"]+)`?\})/g)]
    .map((m) => m[1] ?? m[2])
    .filter((p): p is string => Boolean(p) && p !== '*');
  return paths.map((p) => (p.startsWith('/') ? p : `/dsx/evidence-beta/${p}`));
}

describe('surface matrix covers the authenticated shell', () => {
  it('classifies every declared route', () => {
    const unclassified = declaredRoutes().filter((path) => surfaceForPath(path) === null);
    expect(unclassified).toEqual([]);
  });

  it('found a non-trivial number of routes to check', () => {
    expect(declaredRoutes().length).toBeGreaterThan(50);
  });

  it('never leaves an evidence-beta workspace mountable in reference mode', () => {
    const evidence = SURFACE_MATRIX.filter((s) => s.path.startsWith('/dsx/evidence-beta'));
    expect(evidence.length).toBeGreaterThan(20);
    for (const surface of evidence) {
      expect(surface.classification).toBe('REFERENCE_UNAVAILABLE');
      expect(surface.currentSource).toMatch(/fixture|series/i);
    }
  });

  it('declares exactly one production default owner', () => {
    const shellSource = readFileSync(SHELL, 'utf8');
    expect(shellSource).not.toMatch(/DEFAULT_DATASET_MODE/);
  });
});
