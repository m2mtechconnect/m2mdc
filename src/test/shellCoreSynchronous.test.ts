/**
 * Architecture guard for the authenticated shell core.
 *
 * 1. App.tsx lazy-loads session resolution so the anonymous landing route does
 *    not pay for Supabase/RBAC or the authenticated application bundle.
 * 2. AuthenticatedSessionApp lazy-loads ApprovedUserRouter only after session
 *    + approval succeed.
 * 3. ApprovedUserRouter imports AuthenticatedShell synchronously inside that
 *    authenticated bundle; nested lazy-shell/lazy-page retries previously
 *    reproduced dropped Suspense navigations.
 * 4. The shell core must not statically import route pages: pages stay behind
 *    their own route-level lazy boundaries.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const app = readFileSync('src/App.tsx', 'utf8');
const sessionApp = readFileSync('src/AuthenticatedSessionApp.tsx', 'utf8');
const approvedRouter = readFileSync('src/ApprovedUserRouter.tsx', 'utf8');
const shell = readFileSync('src/AuthenticatedShell.tsx', 'utf8');

describe('authenticated shell core', () => {
  it('is synchronous inside the authenticated bundle and deferred from the anonymous entry', () => {
    expect(app).toMatch(/const AuthenticatedSessionApp = lazy\(\(\) => import\(["']\.\/AuthenticatedSessionApp["']\)\);/);
    expect(app).not.toMatch(/^import .*ApprovedUserRouter/m);
    expect(app).not.toMatch(/^import .*AuthenticatedShell/m);
    expect(sessionApp).toMatch(/const ApprovedUserRouter = lazy\(\(\) => import\(["']\.\/ApprovedUserRouter["']\)\);/);
    expect(approvedRouter).toMatch(/^import AuthenticatedShell from ['"]\.\/AuthenticatedShell['"];$/m);
    expect(approvedRouter).not.toMatch(/lazy\(\s*\(\)\s*=>\s*import\(["']\.\/AuthenticatedShell["']\)/);
  });

  it('imports no route page statically', () => {
    const statics = [...shell.matchAll(/^import[^;]*from\s+["']([^"']+)["'];/gm)].map((m) => m[1]);
    const pages = statics.filter((s) => /(^|\/)(pages|workspace)\//.test(s));
    expect(pages, `static page imports in shell core: ${pages.join(', ')}`).toEqual([
      './pages/NotFound',
    ]);
  });

  it('keeps mounted route pages behind React.lazy', () => {
    expect(shell).toMatch(/const Dashboard = lazy\(/);
    expect(shell).toMatch(/const Compliance = lazy\(/);
    expect(shell).toMatch(/const InfrastructurePage = lazy\(/);
  });
});
