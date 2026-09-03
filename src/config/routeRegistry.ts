/**
 * Phase 2 - canonical route registry.
 *
 * One declaration per URL the application mounts, with the shell that owns
 * it and the kind of thing it renders. Before this file the only way to know
 * what URLs existed was to read two routers and a redirect list, which is how
 * the same page ended up mounted at several addresses.
 *
 * The registry is data, not routing: `src/App.tsx`, `src/ApprovedUserRouter.tsx`
 * and `src/AuthenticatedShell.tsx` remain the mounts. The paired test
 * (`__tests__/routeRegistry.test.ts`) reads those routers and fails when a
 * route is mounted without a declaration here, when a declaration goes stale,
 * or when a path is simultaneously a mount and a redirect source.
 *
 * Alias/redirect sources are NOT declared here - `src/config/routeAliases.ts`
 * stays the single source of truth for those, and the test cross-checks the
 * two registries against each other.
 */

import {
  ACCELERATED_AI_CAPABILITIES_ROUTE,
  EVIDENCE_ROOT,
  LEGACY_CAPABILITIES_ROUTE,
  LEGACY_EVIDENCE_ROOT,
} from './evidenceRoutes';

/** Which router mounts the route. */
export type RouteShell =
  /** `src/App.tsx`, rendered when there is no session. */
  | 'public'
  /** `src/App.tsx` / `src/ApprovedUserRouter.tsx`, rendered for a session. */
  | 'session'
  /** `src/AuthenticatedShell.tsx`, for platform or active-tenant users. */
  | 'internal';

/** What the mount renders. */
export type RouteKind =
  /** The one implementation that owns this URL. */
  | 'canonical'
  /** A mount that only redirects to a canonical route. */
  | 'redirect'
  /** A retired compatibility URL that redirects and must never be emitted. */
  | 'retired-redirect'
  /** Mounted only under `import.meta.env.DEV`. */
  | 'dev-only'
  /** Declared for local qualification only; excluded from production builds. */
  | 'production-blocked'
  /** Terminal `*` / `/*` handler for a router branch. */
  | 'catch-all';

export interface RouteRecord {
  path: string;
  shell: RouteShell;
  kind: RouteKind;
  /** Permission gate wrapping the element, when the route has one. */
  guard?: 'admin';
  /** Why a non-canonical or legacy route is still mounted. */
  note?: string;
}

/** Routes mounted by `src/App.tsx` and session routing in `src/ApprovedUserRouter.tsx`. */
export const PUBLIC_ROUTES: RouteRecord[] = [
  { path: '/', shell: 'public', kind: 'canonical', note: 'Marketing landing page.' },
  { path: '/auth', shell: 'public', kind: 'canonical' },
  { path: '/login', shell: 'public', kind: 'canonical', note: 'Direct sign-in, bypasses onboarding.' },
  { path: '/sign-in', shell: 'public', kind: 'canonical' },
  { path: '/sign-up', shell: 'public', kind: 'canonical' },
  { path: '/forgot-password', shell: 'public', kind: 'canonical' },
  {
    path: '/reset-password',
    shell: 'public',
    kind: 'canonical',
    note: 'Recovery email target; deliberately has no session alias so the recovery session can set a new password.',
  },
  { path: '/mfa', shell: 'public', kind: 'canonical' },
  {
    path: '/auth/callback',
    shell: 'public',
    kind: 'canonical',
    note: 'OAuth/SSO redirect target; completes the Supabase session exchange.',
  },
  {
    path: '/oauth/managed-user/return',
    shell: 'public',
    kind: 'canonical',
    note: 'Managed-user OAuth return target; completes provider authorization before app routing.',
  },
  { path: '/onboarding', shell: 'public', kind: 'canonical' },
  { path: '/twin-datacentre', shell: 'public', kind: 'canonical', note: 'Public landing variant.' },
  { path: '/data-centre-twin', shell: 'public', kind: 'canonical', note: 'Public demo of the twin dashboard.' },
  { path: '/twin-preview', shell: 'public', kind: 'canonical', note: 'Public renderer preview.' },
  {
    path: '/omniverse-scene',
    shell: 'public',
    kind: 'redirect',
    note: 'Phase 5 retired the vendor-named path; redirects to /twin-preview.',
  },
  { path: '/dev-overlays', shell: 'public', kind: 'dev-only' },
  { path: '*', shell: 'public', kind: 'catch-all' },
  // Present across session branches so signing out never depends on the
  // classification that is failing. Intentionally repeated at runtime.
  { path: '/sign-out', shell: 'session', kind: 'canonical' },
  // Mounted before and after authentication so invited users keep one URL.
  { path: '/invite/accept', shell: 'session', kind: 'canonical', note: 'Team invite acceptance.' },
  { path: '/pilot/*', shell: 'session', kind: 'canonical', note: 'Sealed pilot shell.' },
  { path: '/*', shell: 'session', kind: 'canonical', note: 'Platform and tenant users fall through to AuthenticatedShell.' },
];

/** Routes mounted by `src/AuthenticatedShell.tsx`. */
export const INTERNAL_ROUTES: RouteRecord[] = [
  { path: '/dashboard', shell: 'internal', kind: 'canonical' },
  { path: '/login', shell: 'internal', kind: 'redirect', note: 'Signed-in entry redirect.' },
  { path: '/onboarding', shell: 'internal', kind: 'redirect', note: 'Signed-in entry redirect.' },
  { path: '/builder', shell: 'internal', kind: 'canonical' },
  { path: '/deploy', shell: 'internal', kind: 'production-blocked', note: 'Activation is not in the qualified production perimeter.' },
  { path: '/deployments', shell: 'internal', kind: 'canonical' },
  { path: '/agent/:id', shell: 'internal', kind: 'production-blocked' },
  { path: '/agents/:id/chat', shell: 'internal', kind: 'production-blocked' },
  { path: '/analytics', shell: 'internal', kind: 'canonical' },
  { path: '/compliance', shell: 'internal', kind: 'canonical' },
  { path: '/account/profile', shell: 'internal', kind: 'canonical' },
  { path: '/account/settings', shell: 'internal', kind: 'canonical' },
  { path: '/teams', shell: 'internal', kind: 'canonical' },
  { path: '/teams/access-control', shell: 'internal', kind: 'canonical' },
  {
    path: '/teams/onboarding',
    shell: 'internal',
    kind: 'canonical',
    guard: 'admin',
    note: 'Onboarding submissions; /admin/onboarding-submissions aliases here.',
  },
  {
    path: '/admin/customers',
    shell: 'internal',
    kind: 'canonical',
    guard: 'admin',
    note: 'Platform-owner-only customer provisioning and inventory.',
  },
  { path: '/admin/asset-preview', shell: 'internal', kind: 'production-blocked', guard: 'admin' },
  { path: '/admin/asset-pipeline', shell: 'internal', kind: 'production-blocked', guard: 'admin' },
  { path: '/admin/asset-validation/:assetId', shell: 'internal', kind: 'production-blocked', guard: 'admin' },
  { path: '/admin/reference-facility-validation', shell: 'internal', kind: 'production-blocked', guard: 'admin' },
  {
    path: '/admin/accelerated-ai-capabilities',
    shell: 'internal',
    kind: 'canonical',
    guard: 'admin',
    note: 'Accelerated AI capability registry. /admin/dsx-capabilities aliases here.',
  },
  { path: '/admin/dataset-registry', shell: 'internal', kind: 'canonical', guard: 'admin' },
  { path: '/admin/platform-readiness', shell: 'internal', kind: 'canonical', guard: 'admin' },
  { path: '/manage/integrations', shell: 'internal', kind: 'canonical' },
  { path: '/manage/facilities', shell: 'internal', kind: 'canonical' },
  { path: '/marketplace', shell: 'internal', kind: 'production-blocked', note: 'Retired standalone catalogue; local compatibility check only and never emitted in production.' },
  { path: '/app/agents', shell: 'internal', kind: 'canonical' },
  { path: '/app/agents/:slug/detail', shell: 'internal', kind: 'canonical' },
  { path: '/app/agents/:agentId/manage', shell: 'internal', kind: 'canonical' },
  { path: '/app/agents/:agentId/operations', shell: 'internal', kind: 'redirect' },
  { path: '/twins/:instanceId/manage', shell: 'internal', kind: 'redirect' },
  { path: '/studio/systems/:systemId/manage', shell: 'internal', kind: 'canonical' },
  { path: '/data-centre-twin', shell: 'internal', kind: 'canonical' },
  { path: '/data-centre-twin/:id', shell: 'internal', kind: 'canonical' },
  { path: '/data-centre-twin/:id/blueprint', shell: 'internal', kind: 'canonical' },
  { path: '/blueprint', shell: 'internal', kind: 'canonical', note: 'Resolves the active facility or renders an explicit facility setup state.' },
  { path: '/blueprint/preview', shell: 'internal', kind: 'production-blocked' },
  { path: '/blueprint/:id', shell: 'internal', kind: 'canonical' },
  { path: '/simulation', shell: 'internal', kind: 'canonical' },
  { path: '/simulation/preview', shell: 'internal', kind: 'production-blocked' },
  { path: '/help', shell: 'internal', kind: 'canonical' },
  {
    path: '/readiness/supervisor',
    shell: 'internal',
    kind: 'canonical',
    note: 'Enterprise Readiness Supervisor: deterministic, read-only readiness assessment and release gate.',
  },
  { path: '/search', shell: 'internal', kind: 'canonical' },
  { path: '/settings/ai', shell: 'internal', kind: 'canonical' },
  { path: '/sign-out', shell: 'internal', kind: 'canonical' },
  { path: '/twin-preview', shell: 'internal', kind: 'canonical' },
  {
    path: '/twin-debug',
    shell: 'internal',
    kind: 'production-blocked',
    guard: 'admin',
    note: 'Tenant diagnostics: exposes twin ids, raw query state and telemetry sources.',
  },
  {
    path: '/digital-twins-demo/funding-intake',
    shell: 'internal',
    kind: 'dev-only',
    note: 'Explicit demo namespace. Mounted under import.meta.env.DEV only; not a production route.',
  },
  {
    path: '/evidence',
    shell: 'internal',
    kind: 'canonical',
    note: 'Neutral canonical Evidence shell; children below. Index redirects to /evidence/overview.',
  },
  // Pre-consolidation flat Evidence paths. Mounted at the shell's top level
  // (outside the `/evidence` parent) so deep links commit without the parent
  // route resolving first.
  { path: '/evidence/thermal', shell: 'internal', kind: 'redirect' },
  { path: '/evidence/power', shell: 'internal', kind: 'redirect' },
  { path: '/evidence/cooling', shell: 'internal', kind: 'redirect' },
  { path: '/evidence/network', shell: 'internal', kind: 'redirect' },
  { path: '/evidence/workload', shell: 'internal', kind: 'redirect' },
  { path: '/evidence/facility', shell: 'internal', kind: 'redirect' },
  { path: '/evidence/simulations', shell: 'internal', kind: 'redirect' },
  { path: '/evidence/evidence', shell: 'internal', kind: 'redirect' },
  { path: '/evidence/carbon', shell: 'internal', kind: 'redirect' },
  { path: '/evidence/financials', shell: 'internal', kind: 'redirect' },
  { path: '/evidence/sovereignty', shell: 'internal', kind: 'redirect' },
  {
    path: '/dsx/evidence-beta/*',
    shell: 'internal',
    kind: 'redirect',
    note: 'Retired implementation-named Evidence family. Accepted deep link, never emitted; single hop to /evidence preserving query and hash.',
  },
  { path: '/dev-overlays', shell: 'internal', kind: 'dev-only' },
  { path: '*', shell: 'internal', kind: 'catch-all' },
];

/**
 * Children of `/evidence`, relative paths as mounted.
 * The canonical five-section IA lives in `src/dsx/nav/evidenceNav.ts`; the
 * pre-consolidation flat paths remain only as redirects.
 */
export const EVIDENCE_CHILD_ROUTES: RouteRecord[] = [
  { path: 'overview', shell: 'internal', kind: 'canonical' },
  { path: 'operations', shell: 'internal', kind: 'redirect' },
  { path: 'operations/thermal', shell: 'internal', kind: 'canonical' },
  { path: 'operations/power', shell: 'internal', kind: 'canonical' },
  { path: 'operations/cooling', shell: 'internal', kind: 'canonical' },
  { path: 'operations/compute', shell: 'internal', kind: 'canonical' },
  { path: 'operations/workload', shell: 'internal', kind: 'canonical' },
  { path: 'sustainability', shell: 'internal', kind: 'canonical' },
  { path: 'sustainability/financial', shell: 'internal', kind: 'canonical' },
  { path: 'sustainability/sovereignty', shell: 'internal', kind: 'canonical' },
  { path: 'decisions', shell: 'internal', kind: 'canonical' },
  { path: 'decisions/log', shell: 'internal', kind: 'canonical' },
  { path: 'assets', shell: 'internal', kind: 'canonical' },
];

export const ALL_ROUTES: RouteRecord[] = [
  ...PUBLIC_ROUTES,
  ...INTERNAL_ROUTES,
  ...EVIDENCE_CHILD_ROUTES,
];

/** Every route that renders a real page (excludes redirects and plumbing). */
export const CANONICAL_ROUTES = ALL_ROUTES.filter((r) => r.kind === 'canonical');

/** Routes compiled and mounted only in development builds. */
export const DEV_ONLY_ROUTES = ALL_ROUTES.filter((r) => r.kind === 'dev-only');

/** Paths that exist in production builds (local-only mounts excluded). */
export const PRODUCTION_ROUTES = ALL_ROUTES.filter(
  (route) => route.kind !== 'dev-only' && route.kind !== 'production-blocked',
);

/** Convert an absolute route pattern into a concrete-path matcher. */
function routePatternToRegExp(pattern: string): RegExp {
  const source = pattern
    .split('/')
    .map((segment) => {
      if (segment === '*') return '.*';
      if (segment.startsWith(':')) return '[^/]+';
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return new RegExp(`^${source}/?$`);
}

/**
 * Resolve the internal route that owns a concrete pathname.
 *
 * Exact declarations win over parameterised declarations. This matters for
 * paths such as `/blueprint/preview`, which must not be mistaken for the
 * canonical `/blueprint/:id` route.
 */
export function internalRouteForPathname(pathname: string): RouteRecord | null {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  const absoluteRoutes = INTERNAL_ROUTES.filter((route) => route.path.startsWith('/'));
  const exact = absoluteRoutes.find((route) => route.path === normalized);
  if (exact) return exact;
  return absoluteRoutes.find((route) => routePatternToRegExp(route.path).test(normalized)) ?? null;
}

/**
 * True when a pathname is deliberately absent from the production route
 * graph. Runtime wrappers must consult this authority before substituting an
 * alternate renderer, otherwise they can accidentally remount blocked pages.
 */
export function isNonProductionInternalPathname(pathname: string): boolean {
  const route = internalRouteForPathname(pathname);
  return route?.kind === 'production-blocked' || route?.kind === 'dev-only';
}

export function isProductionRoute(path: string): boolean {
  return PRODUCTION_ROUTES.some((r) => r.path === path);
}

/**
 * Canonical share/deep-link targets.
 *
 * A handful of legacy public paths resolve to a different surface once the
 * visitor is authenticated (`/twin-datacentre` is the public landing page but
 * redirects an authenticated user into the Blueprint workspace). Those paths
 * stay mounted for existing external links, but nothing in the product may
 * *emit* them: share buttons, copied links and navigation must use the
 * canonical path below so a shared URL always means one surface.
 */
export interface ShareLinkRule {
  /** Legacy or ambiguous path that may still be received. */
  legacy: string;
  /** Path the product emits for an anonymous audience. */
  publicCanonical: string;
  /** Path the product emits for an authenticated audience. */
  internalCanonical: string;
  reason: string;
}

export const SHARE_LINK_RULES: ShareLinkRule[] = [
  {
    legacy: LEGACY_EVIDENCE_ROOT,
    publicCanonical: `${EVIDENCE_ROOT}/overview`,
    internalCanonical: `${EVIDENCE_ROOT}/overview`,
    reason:
      'Retired implementation-named Evidence family. Accepted as a deep link, never emitted: the neutral /evidence family is the only canonical Evidence vocabulary.',
  },
  {
    legacy: LEGACY_CAPABILITIES_ROUTE,
    publicCanonical: ACCELERATED_AI_CAPABILITIES_ROUTE,
    internalCanonical: ACCELERATED_AI_CAPABILITIES_ROUTE,
    reason:
      'Capability registry moved to a neutral admin path; the programme-named path remains only for existing bookmarks.',
  },
  {
    legacy: '/twin-datacentre',
    publicCanonical: '/data-centre-twin',
    internalCanonical: '/blueprint',
    reason:
      'Public marketing variant; authenticated visitors are redirected into the Blueprint workspace, so the two audiences need distinct canonical paths.',
  },
  {
    legacy: '/omniverse-scene',
    publicCanonical: '/twin-preview',
    internalCanonical: '/twin-preview',
    reason: 'Retired vendor-named path kept for compatibility only; never emitted as a canonical link.',
  },
];

/**
 * Vendor-named, implementation-named or legacy paths that must never be
 * emitted as canonical links. They stay mounted as compatibility redirects, so
 * an existing external deep link still resolves, but navigation, breadcrumbs,
 * share/copy affordances, Help and canonical metadata must use the neutral
 * canonical path instead.
 */
export const NON_EMITTABLE_PATHS: string[] = Array.from(
  new Set([
    ...SHARE_LINK_RULES.map((r) => r.legacy),
    LEGACY_EVIDENCE_ROOT,
    LEGACY_CAPABILITIES_ROUTE,
    '/settings/integrations/nvidia-dsx',
    '/marketplace',
  ]),
);

/** True when `path` still carries a retired implementation or vendor name. */
export function isNonEmittablePath(path: string): boolean {
  return NON_EMITTABLE_PATHS.includes(path) || path.startsWith(`${LEGACY_EVIDENCE_ROOT}/`);
}

/** Canonical path a share/copy-link affordance should emit for `path`. */
export function canonicalSharePath(path: string, audience: 'public' | 'internal'): string {
  // Legacy Evidence deep links keep their section: only the root vocabulary
  // changes, so `/dsx/evidence-beta/operations/power` shares as
  // `/evidence/operations/power` rather than collapsing to the overview.
  if (path.startsWith(`${LEGACY_EVIDENCE_ROOT}/`)) {
    return `${EVIDENCE_ROOT}${path.slice(LEGACY_EVIDENCE_ROOT.length)}`;
  }
  const rule = SHARE_LINK_RULES.find((r) => r.legacy === path);
  if (!rule) return path;
  return audience === 'public' ? rule.publicCanonical : rule.internalCanonical;
}
