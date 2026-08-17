/**
 * AURA_INFORMATION_ARCHITECTURE_DUPLICATION_CLEANUP structural guards.
 *
 * These lock in the merge decisions from the duplication audit so a future
 * change cannot silently reintroduce a second front door:
 *
 * 1. One destination per concept: no route pattern is mounted twice, and no
 *    two navigation labels lead to different destinations.
 * 2. Aliases are redirects, not shadows: an alias source is never also a
 *    live mount, every alias lands on a route that exists, and no alias
 *    chain cycles.
 * 3. No unclassified surface: every mounted route is classified in the
 *    dataset surface registry, so the canary gate never sees a hole.
 * 4. Retired surfaces stay retired.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MANAGE_NAV, SUPPORT_NAV, WORKSPACE_NAV, type AppNavItem } from '@/config/appNavigation';
import { ROUTE_ALIASES } from '@/config/routeAliases';
import { SURFACE_MATRIX } from '@/data/dataset/surfaceRegistry';

const shell = readFileSync(join(process.cwd(), 'src/AuthenticatedShell.tsx'), 'utf8');

/**
 * Route patterns the shell mounts, with nested children resolved against
 * their parent so `operations/thermal` is compared as a real URL.
 */
function declaredRoutes(): { path: string; isRedirect: boolean }[] {
  const out: { path: string; isRedirect: boolean }[] = [];
  const selfClosing = /<Route\s+path="([^"]+)"\s+element=\{([\s\S]*?)\}\s*\/>/g;
  // A parent route's opening tag ends in `}>` on a single line; a leaf ends
  // in `/>`. Keeping the element expression newline-free stops the parent
  // matcher from swallowing every leaf that follows it.
  const parents = /<Route\s+path="([^"]+)"\s+element=\{[^\n]*?\}\s*>\n([\s\S]*?)<\/Route>/g;

  const nestedRanges: [number, number][] = [];
  for (const m of shell.matchAll(parents)) {
    const parent = m[1];
    const bodyStart = m.index! + m[0].indexOf(m[2]);
    nestedRanges.push([bodyStart, bodyStart + m[2].length]);
    for (const c of m[2].matchAll(selfClosing)) {
      out.push({
        path: `${parent.replace(/\/$/, '')}/${c[1]}`,
        isRedirect: /Navigate/.test(c[2]),
      });
    }
  }

  for (const m of shell.matchAll(selfClosing)) {
    const inNested = nestedRanges.some(([a, b]) => m.index! >= a && m.index! < b);
    if (inNested) continue;
    out.push({ path: m[1], isRedirect: /Navigate/.test(m[2]) });
  }
  return out;
}

const routes = declaredRoutes();
const mounted = routes.filter((r) => !r.isRedirect).map((r) => r.path);

/**
 * A component may legitimately serve more than one path when the paths are
 * parameterised views of one concept rather than two front doors. Anything
 * not listed here is duplication and must be merged or redirected.
 */
const MULTI_PATH_ALLOWLIST: Record<string, string[]> = {
  // Redirect component, by definition mounted at many legacy paths.
  AuthenticatedEntryRedirect: ['/login', '/onboarding'],
  // Same blueprint, addressed standalone or nested under its twin.
  Blueprint: ['/blueprint/:id', '/data-centre-twin/:id/blueprint'],
  // Twin list and twin detail are one page driven by an optional id.
  DataCentreTwin: ['/data-centre-twin', '/data-centre-twin/:id'],
};

function allNavItems(): AppNavItem[] {
  const flat: AppNavItem[] = [];
  for (const item of [...WORKSPACE_NAV, ...MANAGE_NAV, ...SUPPORT_NAV]) {
    flat.push(item);
    for (const child of (item as AppNavItem & { children?: AppNavItem[] }).children ?? []) flat.push(child);
  }
  return flat;
}

describe('one destination per concept', () => {
  it('parses the authenticated shell', () => {
    expect(routes.length).toBeGreaterThan(50);
  });

  it('mounts no route pattern more than once', () => {
    const seen = new Map<string, number>();
    for (const path of mounted) seen.set(path, (seen.get(path) ?? 0) + 1);
    expect([...seen].filter(([, n]) => n > 1).map(([p]) => p)).toEqual([]);
  });

  it('mounts no page component at two different paths', () => {
    const byElement = new Map<string, string[]>();
    const re = /<Route\s+path="([^"]+)"\s+element=\{<(\w+)\s*\/>\}\s*\/>/g;
    for (const m of shell.matchAll(re)) {
      if (/Navigate/.test(m[2])) continue;
      const full = routes.find((r) => r.path === m[1] || r.path.endsWith(`/${m[1]}`))?.path ?? m[1];
      byElement.set(m[2], [...(byElement.get(m[2]) ?? []), full]);
    }
    const duplicated = [...byElement]
      .filter(([, paths]) => paths.length > 1)
      .filter(([element, paths]) => {
        const allowed = MULTI_PATH_ALLOWLIST[element];
        return !allowed || [...paths].sort().join() !== [...allowed].sort().join();
      })
      .map(([element, paths]) => `${element} -> ${paths.join(', ')}`);
    expect(duplicated).toEqual([]);
  });

  it('never shows the same navigation label for two different destinations', () => {
    const byLabel = new Map<string, Set<string>>();
    for (const item of allNavItems()) {
      byLabel.set(item.name, (byLabel.get(item.name) ?? new Set()).add(item.href));
    }
    const collisions = [...byLabel]
      .filter(([, hrefs]) => hrefs.size > 1)
      .map(([label, hrefs]) => `${label} -> ${[...hrefs].join(', ')}`);
    expect(collisions).toEqual([]);
  });

  it('routes every /help entry point to the same Learning Hub label', () => {
    const surfaces = {
      nav: allNavItems().find((i) => i.href === '/help')?.name,
      footer: /to="\/help"[\s\S]{0,200}?>\s*([A-Za-z ]+?)\s*</.exec(
        readFileSync(join(process.cwd(), 'src/components/Layout.tsx'), 'utf8'),
      )?.[1],
      userMenu: /<span>([^<]+)<\/span>/.exec(
        /to="\/help"[\s\S]{0,300}?<\/Link>/.exec(
          readFileSync(join(process.cwd(), 'src/components/layout/UserMenu.tsx'), 'utf8'),
        )?.[0] ?? '',
      )?.[1],
    };
    expect(new Set(Object.values(surfaces))).toEqual(new Set(['Learning Hub']));
  });
});

describe('aliases redirect rather than shadow', () => {
  it('never declares an alias source as a live mount', () => {
    const shadowed = ROUTE_ALIASES.map((a) => a.from).filter((from) => mounted.includes(from));
    expect(shadowed).toEqual([]);
  });

  it('resolves every alias to a route the shell actually serves', () => {
    const matchers = routes.map((r) => ({
      path: r.path,
      re: new RegExp(
        `^${r.path
          .split('/')
          .map((seg) => (seg.startsWith(':') ? '[^/]+' : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
          .join('/')}$`,
      ),
    }));
    const dangling = ROUTE_ALIASES.map((a) => a.to.split('#')[0].split('?')[0])
      .filter((to) => to !== '/' && !matchers.some((m) => m.re.test(to)));
    expect(dangling).toEqual([]);
  });

  it('contains no alias cycles', () => {
    const map = new Map(ROUTE_ALIASES.map((a) => [a.from, a.to.split('#')[0].split('?')[0]]));
    for (const start of map.keys()) {
      const seen = new Set<string>([start]);
      let cur = map.get(start);
      while (cur && map.has(cur)) {
        expect(seen.has(cur), `alias cycle through ${cur}`).toBe(false);
        seen.add(cur);
        cur = map.get(cur);
      }
    }
  });
});

describe('no unclassified surface', () => {
  it('classifies every route the shell declares', () => {
    const classified = new Set(SURFACE_MATRIX.map((s) => s.path));
    const missing = routes
      .map((r) => r.path)
      .filter((p) => !p.includes('*') && !classified.has(p));
    expect(missing).toEqual([]);
  });
});

describe('retired surfaces stay retired', () => {
  const RETIRED = [
    'src/pages/ConnectMonitor.tsx',
    'src/pages/ConnectHealth.tsx',
    'src/pages/LegacyDashboard.tsx',
    'src/pages/IntegrationHub.tsx',
    'src/pages/DigitalTwinDetail.tsx',
    'src/pages/Auth.tsx',
    'src/components/connect/JobMonitor.tsx',
    'src/hooks/useSyncJobFeed.ts',
  ];

  it.each(RETIRED)('%s is not reintroduced', (rel) => {
    expect(() => readFileSync(join(process.cwd(), rel), 'utf8')).toThrow();
  });

  it('keeps the retired connect paths as redirects only', () => {
    for (const path of ['/connect/monitor', '/connect/health', '/manage/connections', '/agent-chat']) {
      expect(mounted).not.toContain(path);
      expect(ROUTE_ALIASES.some((a) => a.from === path)).toBe(true);
    }
  });
});
