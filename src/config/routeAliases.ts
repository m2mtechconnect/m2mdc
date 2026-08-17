/**
 * Stage 6F - canonical alias/redirect registry.
 *
 * Single source of truth for every legacy path that must resolve to a
 * canonical destination. The authenticated router renders these; the
 * deep-link harness (tests/truth-in-ui/deep-link-redirects.spec.ts)
 * imports the same list so the test matrix can never drift from the app.
 *
 * `to` may carry its own hash. When it does, the incoming hash is dropped
 * (the destination anchor wins). `to` may also carry query parameters,
 * which act as defaults: the incoming query string always wins per key, so
 * a bookmarked deep link never loses its own context.
 */
export interface RouteAlias {
  /** Legacy path as mounted in the router. */
  from: string;
  /** Canonical destination path (may include a hash). */
  to: string;
  /** Example concrete path used by the deep-link harness. */
  sample?: string;
  /** Expected final pathname for `sample` (defaults to `to` pathname). */
  expected?: string;
}

export const ROUTE_ALIASES: RouteAlias[] = [
  // Stage 6G: /dashboard is the canonical Dashboard destination.
  { from: '/', to: '/dashboard' },
  { from: '/command', to: '/dashboard' },
  { from: '/evidence', to: '/dsx/evidence-beta/evidence' },
  { from: '/build', to: '/builder' },
  { from: '/admin', to: '/admin/signups-dashboard' },
  { from: '/operations', to: '/analytics' },
  { from: '/intelligence', to: '/analytics' },
  // Stage 7E: one canonical Integrations destination under Manage.
  { from: '/integrations', to: '/manage/integrations' },
  { from: '/marketplace/integrations', to: '/manage/integrations' },
  { from: '/settings/integrations', to: '/manage/integrations' },
  { from: '/facilities', to: '/manage/facilities' },
  // AURA_IA_DUP_CLEANUP: /manage/connections was a second live mount of the
  // same page rather than an alias. One canonical destination, one redirect.
  { from: '/manage/connections', to: '/manage/integrations' },
  // AURA_IA_DUP_CLEANUP: the fixture-backed ingestion monitor and source
  // health pages duplicated the evidence-backed "Activity & health" view of
  // the connections control plane. They are retired to the canonical tab.
  {
    from: '/connect/monitor',
    to: '/manage/integrations?tab=activity',
    sample: '/connect/monitor',
    expected: '/manage/integrations',
  },
  {
    from: '/connect/health',
    to: '/manage/integrations?tab=activity',
    sample: '/connect/health',
    expected: '/manage/integrations',
  },
  // AURA_IA_DUP_CLEANUP: /agent-chat mounted the agent conversation page
  // with no agent id, so it could never resolve an agent. The agent list is
  // where a conversation is actually chosen.
  { from: '/agent-chat', to: '/app/agents' },
  { from: '/agents', to: '/app/agents' },
  { from: '/subsystem-agents', to: '/app/agents' },
  { from: '/blueprint', to: '/blueprint/default' },
  { from: '/universal-search', to: '/search' },
  { from: '/settings/integrations/nvidia-dsx', to: '/manage/integrations#nvidia-dsx' },
  { from: '/twin-datacentre', to: '/blueprint/default' },
  { from: '/auth', to: '/' },
  { from: '/sign-in', to: '/' },
  { from: '/sign-up', to: '/' },
  { from: '/forgot-password', to: '/' },
  { from: '/mfa', to: '/' },
  { from: '/digital-twins', to: '/' },
  {
    from: '/digital-twins/:slug',
    to: '/',
    sample: '/digital-twins/montreal',
    expected: '/',
  },
];

/** Parameterised redirects that rebuild the destination from path params. */
export const PARAM_ALIASES = [
  {
    from: '/app/agents/:agentId/operations',
    sample: '/app/agents/agent-1/operations',
    expected: '/app/agents/agent-1/manage',
  },
  {
    from: '/twins/:instanceId/manage',
    sample: '/twins/twin-1/manage',
    expected: '/app/agents/twin-1/manage',
  },
] as const;
