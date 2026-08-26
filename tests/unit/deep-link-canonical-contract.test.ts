/**
 * Deep-link + canonical stack contract matrix.
 *
 * Locks the pieces that can silently drift: OAuth return-path handoff,
 * alias/param-alias integrity, DEV-only route classification, canonical share
 * paths, and the governed stack manifest.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROUTE_ALIASES, PARAM_ALIASES } from '@/config/routeAliases';
import {
  ALL_ROUTES,
  EVIDENCE_CHILD_ROUTES,
  DEV_ONLY_ROUTES,
  PRODUCTION_ROUTES,
  SHARE_LINK_RULES,
  NON_EMITTABLE_PATHS,
  canonicalSharePath,
  isProductionRoute,
} from '@/config/routeRegistry';
import { safeReturnPath } from '@/routing/AuthenticatedEntryRedirect';
import {
  AURA_STACK_MANIFEST,
  FORBIDDEN_CUSTOMER_STRINGS,
  customerVisibleStack,
  evidenceQualifier,
} from '@/config/auraStackManifest';

const root = resolve(__dirname, '../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

// ---------------------------------------------------------------- return path

describe('OAuth return-path handoff', () => {
  beforeEach(() => {
    vi.resetModules();
    window.sessionStorage.clear();
  });

  const load = () => import('@/auth/returnPathHandoff');

  it('round-trips a protected deep link with query and hash', async () => {
    const { stashReturnPath, consumeReturnPath } = await load();
    stashReturnPath('/simulation?step=compare#results');
    expect(consumeReturnPath()).toBe('/simulation?step=compare#results');
  });

  it('consumes exactly once', async () => {
    const { stashReturnPath, consumeReturnPath } = await load();
    stashReturnPath('/dashboard?a=1');
    expect(consumeReturnPath()).toBe('/dashboard?a=1');
    expect(consumeReturnPath()).toBeNull();
  });

  it('never stores an off-origin destination', async () => {
    const { stashReturnPath, consumeReturnPath } = await load();
    for (const bad of ['//evil.com', 'https://evil.com', '/\\evil.com', 'dashboard']) {
      expect(stashReturnPath(bad)).toBeNull();
      expect(consumeReturnPath()).toBeNull();
    }
  });

  it('expires a stale handoff', async () => {
    const { stashReturnPath, consumeReturnPath, RETURN_PATH_TTL_MS } = await load();
    stashReturnPath('/builder?tab=power');
    expect(consumeReturnPath(Date.now() + RETURN_PATH_TTL_MS + 1)).toBeNull();
  });

  it('ignores malformed storage payloads', async () => {
    const { consumeReturnPath, RETURN_PATH_STORAGE_KEY } = await load();
    window.sessionStorage.setItem(RETURN_PATH_STORAGE_KEY, 'not-json');
    expect(consumeReturnPath()).toBeNull();
  });
});

describe('auth flows carry the deep link', () => {
  it('password flow honours returnTo and passes it to SSO', () => {
    const signIn = read('src/pages/auth/SignIn.tsx');
    expect(signIn).toContain("safeReturnPath(searchParams.get('returnTo'))");
    expect(signIn).toContain('signInWithGoogle(postSignInPath)');
  });

  it('signInWithGoogle stashes the sanitized path before leaving the origin', () => {
    const sso = read('src/auth/ssoProviders.ts');
    expect(sso).toContain('stashReturnPath(returnTo ?? null)');
    expect(sso).toContain('/auth/callback');
  });

  it('AuthCallback restores the preserved path and fails safe otherwise', () => {
    const cb = read('src/pages/auth/AuthCallback.tsx');
    expect(cb).toContain('consumeReturnPath()');
    expect(cb).toContain('DEFAULT_AUTHENTICATED_ROUTE');
    expect(cb).toContain('safeReturnPath(');
    // Timeout and provider error still land back on sign-in.
    expect(cb).toContain('<Navigate to="/login" replace />');
  });

  it('protected entry captures search and hash', () => {
    expect(read('src/App.tsx')).toContain('const returnTo = `${pathname}${search}${hash}`');
    expect(safeReturnPath('/analytics?tab=power#pue')).toBe('/analytics?tab=power#pue');
  });
});

// ------------------------------------------------------------------- aliases

describe('alias integrity', () => {
  // Evidence children are declared relative to their parent mount.
  const mounted = new Set([
    ...ALL_ROUTES.map((r) => r.path),
    ...EVIDENCE_CHILD_ROUTES.map((r) => `/evidence/${r.path}`),
  ]);

  it('has no duplicate alias sources', () => {
    const sources = ROUTE_ALIASES.map((a) => a.from);
    expect(sources.length).toBe(new Set(sources).size);
  });

  it('never targets its own source (no self loop)', () => {
    const loops = ROUTE_ALIASES.filter((a) => a.to.split(/[?#]/)[0] === a.from);
    expect(loops).toEqual([]);
  });

  it('resolves every alias in a single hop', () => {
    const sources = new Set(ROUTE_ALIASES.map((a) => a.from));
    const chained = ROUTE_ALIASES.filter((a) => sources.has(a.to.split(/[?#]/)[0]));
    expect(chained.map((a) => a.from)).toEqual([]);
  });

  it('never targets a DEV-only or unmounted route', () => {
    const devOnly = new Set(DEV_ONLY_ROUTES.map((r) => r.path));
    for (const alias of ROUTE_ALIASES) {
      const target = alias.to.split(/[?#]/)[0];
      expect(devOnly.has(target), `${alias.from} -> ${target} targets a DEV-only route`).toBe(false);
      // Parameterised targets (e.g. /blueprint/default) resolve against a
      // declared parameter route rather than a literal declaration.
      const literal = mounted.has(target);
      const parameterised = ALL_ROUTES.some((r) => {
        if (!r.path.includes(':')) return false;
        const pattern = new RegExp(`^${r.path.replace(/:[^/]+/g, '[^/]+')}$`);
        return pattern.test(target);
      });
      expect(literal || parameterised, `${alias.from} -> ${target} has no mounted target`).toBe(true);
    }
  });

  it('preserves query and hash through PreserveNavigate', () => {
    const preserve = read('src/routing/PreserveNavigate.tsx');
    expect(preserve).toContain('location.search');
    expect(preserve).toContain('location.hash');
    expect(preserve).toContain('replace');
    expect(read('src/AuthenticatedShell.tsx')).toContain('<PreserveNavigate to={alias.to} />');
  });

  it('every param alias sample resolves to its expected destination', () => {
    for (const alias of PARAM_ALIASES) {
      const pattern = new RegExp(`^${alias.from.replace(/:[^/]+/g, '([^/]+)')}$`);
      const match = alias.sample.match(pattern);
      expect(match, `${alias.sample} must match ${alias.from}`).not.toBeNull();
      expect(alias.expected.startsWith('/')).toBe(true);
    }
  });
});

// --------------------------------------------------------------- route truth

describe('route registry reflects production availability', () => {
  const shell = read('src/AuthenticatedShell.tsx');

  it('keeps the funding demo DEV-only and Infrastructure compatibility redirect-only', () => {
    const demoPath = '/digital-twins-demo/funding-intake';
    expect(isProductionRoute(demoPath), `${demoPath} must not be a production route`).toBe(false);
    const mount = shell.slice(shell.indexOf(`path="${demoPath}"`) - 200, shell.indexOf(`path="${demoPath}"`));
    expect(mount).toContain('import.meta.env.DEV');
    expect(ROUTE_ALIASES).toContainEqual({ from: '/infrastructure', to: '/evidence/assets' });
  });

  it('keeps DEV-only classification and DEV-only mounting in sync', () => {
    for (const record of DEV_ONLY_ROUTES) {
      if (record.path === '/dev-overlays') continue;
      const idx = shell.indexOf(`path="${record.path}"`);
      if (idx < 0) continue;
      expect(shell.slice(Math.max(0, idx - 200), idx)).toContain('import.meta.env.DEV');
    }
  });

  it('production route set excludes every DEV-only path', () => {
    const dev = new Set(DEV_ONLY_ROUTES.map((r) => r.path));
    expect(PRODUCTION_ROUTES.filter((r) => dev.has(r.path) && r.kind === 'dev-only')).toEqual([]);
  });

  it('pilot routing stays fail-closed for unresolved authority', () => {
    const approved = read('src/ApprovedUserRouter.tsx');
    expect(approved).toContain("resolution.status === 'error'");
    expect(approved).toContain('AuthorizationError');
    expect(approved).toContain('<Route path="/pilot/*"');
  });
});

describe('canonical share links', () => {
  it('maps every ambiguous legacy path to explicit public and internal targets', () => {
    for (const rule of SHARE_LINK_RULES) {
      expect(canonicalSharePath(rule.legacy, 'public')).toBe(rule.publicCanonical);
      expect(canonicalSharePath(rule.legacy, 'internal')).toBe(rule.internalCanonical);
      expect(rule.reason.length).toBeGreaterThan(0);
    }
  });

  it('leaves unambiguous paths untouched', () => {
    expect(canonicalSharePath('/dashboard', 'internal')).toBe('/dashboard');
    expect(canonicalSharePath('/twin-preview', 'public')).toBe('/twin-preview');
  });

  it('marks vendor-named legacy paths as compatibility-only', () => {
    expect(NON_EMITTABLE_PATHS).toContain('/omniverse-scene');
  });
});

// ------------------------------------------------------------ stack manifest

describe('AURA stack manifest', () => {
  it('has unique ids and a canonical description per capability', () => {
    const ids = AURA_STACK_MANIFEST.map((c) => c.id);
    expect(ids.length).toBe(new Set(ids).size);
    for (const c of AURA_STACK_MANIFEST) {
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.description.length).toBeGreaterThan(20);
      expect(c.allowedSurfaces.length).toBeGreaterThan(0);
    }
  });

  it('never renders an internal provider identifier as a customer label', () => {
    for (const c of customerVisibleStack()) {
      const copy = `${c.label} ${c.description}`.toLowerCase();
      for (const forbidden of FORBIDDEN_CUSTOMER_STRINGS) {
        expect(copy, `${c.id} leaks ${forbidden}`).not.toContain(forbidden.toLowerCase());
      }
    }
  });

  it('claims no active accelerated-vendor runtime', () => {
    const accelerated = AURA_STACK_MANIFEST.find((c) => c.id === 'ai.accelerated');
    expect(accelerated?.evidenceStatus).toBe('UNAVAILABLE');
    for (const c of AURA_STACK_MANIFEST) {
      const copy = `${c.label} ${c.description}`;
      expect(copy).not.toMatch(/Omniverse|RTX streaming|live telemetry/i);
    }
  });

  it('only names a third-party technology with a recorded policy reason', () => {
    for (const c of AURA_STACK_MANIFEST) {
      if (!c.namedTechnology) continue;
      expect(c.namedTechnology.policyReason.length).toBeGreaterThan(10);
    }
  });

  it('keeps provenance truth visible for non-measured capabilities', () => {
    expect(evidenceQualifier('SIMULATED')).toBe('Simulated');
    expect(evidenceQualifier('NOT_MEASURED')).toBe('Not measured');
    expect(evidenceQualifier('UNAVAILABLE')).toBe('Not available');
    expect(evidenceQualifier('AVAILABLE')).toBeNull();
  });

  it('filters by surface', () => {
    const landing = customerVisibleStack('landing');
    expect(landing.length).toBeGreaterThan(0);
    expect(landing.every((c) => c.allowedSurfaces.includes('landing'))).toBe(true);
  });
});

describe('customer-visible provider neutrality', () => {
  const files = [
    'src/integrations/cloudDataConnectorCatalogue.ts',
    'src/twins/sovereignDataCenter/templateDefinition.ts',
    'src/twins/sovereignDataCenter/components/SovereignDCDeploymentSteps.tsx',
    'src/types/dcTwinBuilder.ts',
  ];

  it('no longer renders managed-provider names', () => {
    for (const file of files) {
      const source = read(file);
      expect(source, `${file} renders Vertex AI`).not.toContain('Vertex AI');
      expect(source, `${file} renders Gemini`).not.toContain('Gemini');
    }
  });

  it('connector truth notes stay truthful but provider-neutral', () => {
    const catalogue = read('src/integrations/cloudDataConnectorCatalogue.ts');
    expect(catalogue).not.toContain('Google Cloud project');
    expect(catalogue).toContain('no customer cloud project or warehouse dataset is connected.');
  });
});
