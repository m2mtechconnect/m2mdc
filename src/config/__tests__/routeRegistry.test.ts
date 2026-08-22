/**
 * Phase 2 - route surface enforcement.
 *
 * Reads the public, session and authenticated routers as source text and holds
 * them to `src/config/routeRegistry.ts`. A new mount that is not declared, a
 * stale declaration, an admin route that lost its guard, or a path that is both
 * a mount and a redirect source all fail here.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  PUBLIC_ROUTES,
  INTERNAL_ROUTES,
  EVIDENCE_CHILD_ROUTES,
  ALL_ROUTES,
} from '../routeRegistry';
import { ROUTE_ALIASES, PARAM_ALIASES } from '../routeAliases';

const root = resolve(__dirname, '../../..');
const appSource = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');
const publicSource = readFileSync(resolve(root, 'src/PublicAppRoutes.tsx'), 'utf8');
const approvedSource = readFileSync(resolve(root, 'src/ApprovedUserRouter.tsx'), 'utf8');
const shellSource = readFileSync(resolve(root, 'src/AuthenticatedShell.tsx'), 'utf8');

const literalPaths = (source: string) =>
  Array.from(source.matchAll(/path="([^"]+)"/g)).map((m) => m[1]);

const evidenceBlock = (() => {
  const start = shellSource.indexOf('<Route path="/dsx/evidence-beta"');
  const end = shellSource.indexOf('</Route>', start);
  return shellSource.slice(start, end);
})();

const shellTopLevel = literalPaths(shellSource).filter(
  (p) => !literalPaths(evidenceBlock).includes(p) || p === '/dsx/evidence-beta',
);
const evidenceChildren = literalPaths(evidenceBlock).filter((p) => p !== '/dsx/evidence-beta');

describe('route registry mirrors the mounted routers', () => {
  it('declares every path mounted in the public route module', () => {
    const declared = new Set(PUBLIC_ROUTES.map((r) => r.path));
    const publicMounts = [...literalPaths(appSource), ...literalPaths(publicSource)];
    const undeclared = [...new Set(publicMounts)].filter((p) => !declared.has(p));
    expect(undeclared).toEqual([]);
  });

  it('declares every session path mounted in ApprovedUserRouter.tsx', () => {
    const declared = new Set(PUBLIC_ROUTES.map((r) => r.path));
    const undeclared = [...new Set(literalPaths(approvedSource))].filter((p) => !declared.has(p));
    expect(undeclared).toEqual([]);
  });

  it('declares every top-level path mounted in AuthenticatedShell.tsx', () => {
    const declared = new Set(INTERNAL_ROUTES.map((r) => r.path));
    const undeclared = shellTopLevel.filter((p) => !declared.has(p));
    expect(undeclared).toEqual([]);
  });

  it('declares every Evidence child route', () => {
    const declared = new Set(EVIDENCE_CHILD_ROUTES.map((r) => r.path));
    expect(evidenceChildren.filter((p) => !declared.has(p))).toEqual([]);
  });

  it('has no stale declarations', () => {
    const mounted = new Set([
      ...literalPaths(appSource),
      ...literalPaths(publicSource),
      ...literalPaths(approvedSource),
      ...shellTopLevel,
      ...evidenceChildren,
    ]);
    const stale = ALL_ROUTES.map((r) => r.path).filter((p) => !mounted.has(p));
    expect(stale).toEqual([]);
  });

  it('declares each internal path exactly once', () => {
    const seen = new Map<string, number>();
    for (const r of INTERNAL_ROUTES) seen.set(r.path, (seen.get(r.path) ?? 0) + 1);
    expect([...seen.entries()].filter(([, n]) => n > 1)).toEqual([]);
  });
});

describe('redirect sources never double as implementations', () => {
  it('no ROUTE_ALIASES source is also mounted in the internal shell', () => {
    const mounted = new Set(shellTopLevel);
    const collisions = ROUTE_ALIASES.map((a) => a.from).filter((p) => mounted.has(p));
    expect(collisions).toEqual([]);
  });

  it('PARAM_ALIASES only documents routes that mount their own redirect', () => {
    for (const alias of PARAM_ALIASES) {
      const record = INTERNAL_ROUTES.find((r) => r.path === alias.from);
      expect(record?.kind).toBe('redirect');
    }
  });

  it('resolves every alias target in a single hop', () => {
    const aliasSources = new Set(ROUTE_ALIASES.map((a) => a.from));
    const chained = ROUTE_ALIASES.filter((a) => {
      const target = a.to.split('?')[0].split('#')[0];
      return aliasSources.has(target);
    }).map((a) => `${a.from} -> ${a.to}`);
    expect(chained).toEqual([]);
  });
});

describe('privileged routes stay guarded', () => {
  it('wraps every /admin/* route in AdminRouteGuard', () => {
    const adminRoutes = shellTopLevel.filter((p) => p.startsWith('/admin/'));
    expect(adminRoutes.length).toBeGreaterThan(0);
    for (const path of adminRoutes) {
      const mount = shellSource.slice(
        shellSource.indexOf(`path="${path}"`),
        shellSource.indexOf(`path="${path}"`) + 400,
      );
      expect(mount, `${path} must render inside AdminRouteGuard`).toContain('<AdminRouteGuard>');
    }
  });

  it('guards every route the registry marks as admin-only', () => {
    for (const record of ALL_ROUTES.filter((r) => r.guard === 'admin')) {
      const mount = shellSource.slice(
        shellSource.indexOf(`path="${record.path}"`),
        shellSource.indexOf(`path="${record.path}"`) + 400,
      );
      expect(mount, `${record.path} must render inside AdminRouteGuard`).toContain('<AdminRouteGuard>');
    }
  });
});
