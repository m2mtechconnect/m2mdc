/**
 * Phase 2 - canonical route registry.
 *
 * One declaration per URL the application mounts, with the shell that owns
 * it and the kind of thing it renders. Before this file the only way to know
 * what URLs existed was to read two routers and a redirect list, which is how
 * the same page ended up mounted at several addresses.
 *
 * The registry is data, not routing: `src/App.tsx` and
 * `src/AuthenticatedShell.tsx` remain the mounts. The paired test
 * (`__tests__/routeRegistry.test.ts`) reads both routers and fails when a
 * route is mounted without a declaration here, when a declaration goes stale,
 * or when a path is simultaneously a mount and a redirect source.
 *
 * Alias/redirect sources are NOT declared here - `src/config/routeAliases.ts`
 * stays the single source of truth for those, and the test cross-checks the
 * two registries against each other.
 */

/** Which router mounts the route. */
export type RouteShell =
  /** `src/App.tsx`, rendered when there is no session. */
  | 'public'
  /** `src/App.tsx`, rendered for a session in any classification. */
  | 'session'
  /** `src/AuthenticatedShell.tsx`, internal (user_roles-backed) users only. */
  | 'internal';

/** What the mount renders. */
export type RouteKind =
  /** The one implementation that owns this URL. */
  | 'canonical'
  /** A mount that only redirects to a canonical route. */
  | 'redirect'
  /** Mounted only under `import.meta.env.DEV`. */
  | 'dev-only'
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

/** Routes mounted by `src/App.tsx`. */
export const PUBLIC_ROUTES: RouteRecord[] = [
  { path: '/', shell: 'public', kind: 'canonical', note: 'Marketing landing page.' },
  { path: '/auth', shell: 'public', kind: 'canonical' },
  { path: '/login', shell: 'public', kind: 'canonical', note: 'Direct sign-in, bypasses onboarding.' },
  { path: '/sign-in', shell: 'public', kind: 'canonical' },
  { path: '/sign-up', shell: 'public', kind: 'canonical' },
  { path: '/forgot-password', shell: 'public', kind: 'canonical' },
  { path: '/mfa', shell: 'public', kind: 'canonical' },
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
  // Present in every session branch (pending approval, authorization error,
  // internal, pilot) so signing out never depends on the classification that
  // is failing. Intentionally repeated; the test asserts it stays present.
  { path: '/sign-out', shell: 'session', kind: 'canonical' },
  { path: '/pilot/*', shell: 'session', kind: 'canonical', note: 'Sealed pilot shell.' },
  { path: '/*', shell: 'session', kind: 'canonical', note: 'Internal users fall through to AuthenticatedShell.' },
];

/** Routes mounted by `src/AuthenticatedShell.tsx`. */
export const INTERNAL_ROUTES: RouteRecord[] = [
  { path: '/dashboard', shell: 'internal', kind: 'canonical' },
  { path: '/login', shell: 'internal', kind: 'redirect', note: 'Signed-in entry redirect.' },
  { path: '/onboarding', shell: 'internal', kind: 'redirect', note: 'Signed-in entry redirect.' },
  { path: '/builder', shell: 'internal', kind: 'canonical' },
  { path: '/deploy', shell: 'internal', kind: 'canonical', note: 'Deployment lanes; /deployments is the history view.' },
  { path: '/deployments', shell: 'internal', kind: 'canonical' },
  { path: '/agent/:id', shell: 'internal', kind: 'canonical' },
  { path: '/agents/:id/chat', shell: 'internal', kind: 'canonical' },
  { path: '/analytics', shell: 'internal', kind: 'canonical' },
  { path: '/account/profile', shell: 'internal', kind: 'canonical' },
  { path: '/account/settings', shell: 'internal', kind: 'canonical' },
  { path: '/account/access-control', shell: 'internal', kind: 'canonical' },
  { path: '/admin/onboarding-submissions', shell: 'internal', kind: 'canonical', guard: 'admin' },
  { path: '/admin/user-approvals', shell: 'internal', kind: 'canonical', guard: 'admin' },
  { path: '/admin/asset-preview', shell: 'internal', kind: 'canonical', guard: 'admin' },
  { path: '/admin/asset-pipeline', shell: 'internal', kind: 'canonical', guard: 'admin' },
  { path: '/admin/asset-validation/:assetId', shell: 'internal', kind: 'canonical', guard: 'admin' },
  { path: '/admin/reference-facility-validation', shell: 'internal', kind: 'canonical', guard: 'admin' },
  { path: '/admin/signups-dashboard', shell: 'internal', kind: 'canonical', guard: 'admin' },
  { path: '/admin/dsx-capabilities', shell: 'internal', kind: 'canonical', guard: 'admin' },
  { path: '/admin/dataset-registry', shell: 'internal', kind: 'canonical', guard: 'admin' },
  { path: '/admin/platform-readiness', shell: 'internal', kind: 'canonical', guard: 'admin' },
  { path: '/manage/integrations', shell: 'internal', kind: 'canonical' },
  { path: '/manage/facilities', shell: 'internal', kind: 'canonical' },
  { path: '/compliance', shell: 'internal', kind: 'canonical' },
  { path: '/teams', shell: 'internal', kind: 'canonical' },
  { path: '/marketplace', shell: 'internal', kind: 'canonical' },
  { path: '/app/agents', shell: 'internal', kind: 'canonical' },
  { path: '/app/agents/:slug/detail', shell: 'internal', kind: 'canonical' },
  { path: '/app/agents/:agentId/manage', shell: 'internal', kind: 'canonical' },
  { path: '/app/agents/:agentId/operations', shell: 'internal', kind: 'redirect' },
  { path: '/twins/:instanceId/manage', shell: 'internal', kind: 'redirect' },
  { path: '/studio/systems/:systemId/manage', shell: 'internal', kind: 'canonical' },
  { path: '/data-centre-twin/:id/blueprint', shell: 'internal', kind: 'canonical' },
  { path: '/blueprint/preview', shell: 'internal', kind: 'canonical' },
  { path: '/blueprint/:id', shell: 'internal', kind: 'canonical' },
  { path: '/simulation', shell: 'internal', kind: 'canonical' },
  { path: '/simulation/preview', shell: 'internal', kind: 'canonical' },
  { path: '/help', shell: 'internal', kind: 'canonical' },
  { path: '/search', shell: 'internal', kind: 'canonical' },
  { path: '/settings/ai', shell: 'internal', kind: 'canonical' },
  { path: '/sign-out', shell: 'internal', kind: 'canonical' },
  { path: '/playbook', shell: 'internal', kind: 'canonical' },
  { path: '/data-centre-twin', shell: 'internal', kind: 'canonical' },
  { path: '/data-centre-twin/:id', shell: 'internal', kind: 'canonical' },
  { path: '/twin-preview', shell: 'internal', kind: 'canonical' },
  {
    path: '/twin-debug',
    shell: 'internal',
    kind: 'canonical',
    guard: 'admin',
    note: 'Tenant diagnostics: exposes twin ids, raw query state and telemetry sources.',
  },
  { path: '/digital-twins-demo/funding-intake', shell: 'internal', kind: 'canonical', note: 'Explicit demo namespace.' },
  { path: '/infrastructure', shell: 'internal', kind: 'canonical' },
  { path: '/dsx/evidence-beta', shell: 'internal', kind: 'canonical', note: 'Evidence shell; children below.' },
  { path: '/dev-overlays', shell: 'internal', kind: 'dev-only' },
  { path: '*', shell: 'internal', kind: 'catch-all' },
];

/**
 * Children of `/dsx/evidence-beta`, relative paths as mounted.
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
  { path: 'thermal', shell: 'internal', kind: 'redirect' },
  { path: 'power', shell: 'internal', kind: 'redirect' },
  { path: 'cooling', shell: 'internal', kind: 'redirect' },
  { path: 'network', shell: 'internal', kind: 'redirect' },
  { path: 'workload', shell: 'internal', kind: 'redirect' },
  { path: 'facility', shell: 'internal', kind: 'redirect' },
  { path: 'simulations', shell: 'internal', kind: 'redirect' },
  { path: 'evidence', shell: 'internal', kind: 'redirect' },
  { path: 'carbon', shell: 'internal', kind: 'redirect' },
  { path: 'financials', shell: 'internal', kind: 'redirect' },
  { path: 'sovereignty', shell: 'internal', kind: 'redirect' },
];

export const ALL_ROUTES: RouteRecord[] = [
  ...PUBLIC_ROUTES,
  ...INTERNAL_ROUTES,
  ...EVIDENCE_CHILD_ROUTES,
];

/** Every route that renders a real page (excludes redirects and plumbing). */
export const CANONICAL_ROUTES = ALL_ROUTES.filter((r) => r.kind === 'canonical');
