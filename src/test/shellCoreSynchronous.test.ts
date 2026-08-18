/**
 * Architecture guard for the synchronous authenticated shell core.
 *
 * 1. App.tsx must NOT wrap the authenticated shell in React.lazy - the
 *    nested lazy-shell/lazy-page topology reproduced dropped Suspense
 *    retries (11/24 navigations).
 * 2. The shell core must not statically import a route page: pages stay
 *    behind their own route-level lazy boundaries.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const app = readFileSync('src/App.tsx', 'utf8');
const shell = readFileSync('src/AuthenticatedShell.tsx', 'utf8');

describe('authenticated shell core', () => {
  it('is imported synchronously by App', () => {
    expect(app).toMatch(/^import AuthenticatedShell from "\.\/AuthenticatedShell";$/m);
    expect(app).not.toMatch(/lazy\(\s*\(\)\s*=>\s*import\(["']\.\/AuthenticatedShell["']\)/);
  });

  it('imports no route page statically', () => {
    const statics = [...shell.matchAll(/^import[^;]*from\s+["']([^"']+)["'];/gm)].map((m) => m[1]);
    const pages = statics.filter((s) => /(^|\/)(pages|workspace)\//.test(s));
    expect(pages, `static page imports in shell core: ${pages.join(', ')}`).toEqual([
      './pages/NotFound',
    ]);
  });

  it('keeps every route page behind React.lazy', () => {
    expect(shell).toMatch(/const Dashboard = lazy\(/);
    expect(shell).toMatch(/const DataCentreTwin = lazy\(/);
  });
});
