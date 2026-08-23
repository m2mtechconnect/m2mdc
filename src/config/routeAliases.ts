/** Canonical alias/redirect registry. */
export interface RouteAlias {
  from: string;
  to: string;
  sample?: string;
  expected?: string;
}

export const ROUTE_ALIASES: RouteAlias[] = [
  { from: '/', to: '/dashboard' },
  { from: '/command', to: '/dashboard' },
  { from: '/evidence', to: '/dsx/evidence-beta/decisions/log' },
  { from: '/build', to: '/builder' },
  { from: '/omniverse-scene', to: '/twin-preview' },

  { from: '/admin', to: '/admin/platform-readiness' },
  { from: '/admin/signups-dashboard', to: '/teams' },
  { from: '/admin/user-approvals', to: '/teams' },
  { from: '/admin/onboarding-submissions', to: '/teams/onboarding' },
  { from: '/account/access-control', to: '/teams/access-control' },

  { from: '/playbook', to: '/help' },

  { from: '/operations', to: '/analytics' },
  { from: '/intelligence', to: '/analytics' },
  { from: '/integrations', to: '/manage/integrations' },
  { from: '/marketplace/integrations', to: '/manage/integrations' },
  { from: '/settings/integrations', to: '/manage/integrations' },
  { from: '/facilities', to: '/manage/facilities' },
  { from: '/manage/connections', to: '/manage/integrations' },
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
  { from: '/agent-chat', to: '/app/agents' },
  { from: '/agents', to: '/app/agents' },
  { from: '/subsystem-agents', to: '/app/agents' },
  { from: '/blueprint', to: '/blueprint/default' },
  { from: '/universal-search', to: '/search' },
  { from: '/settings/integrations/nvidia-dsx', to: '/manage/integrations#nvidia-dsx' },
  { from: '/twin-datacentre', to: '/blueprint/default' },
  { from: '/auth', to: '/dashboard' },
  { from: '/sign-in', to: '/dashboard' },
  { from: '/sign-up', to: '/dashboard' },
  { from: '/forgot-password', to: '/dashboard' },
  { from: '/mfa', to: '/dashboard' },
  { from: '/digital-twins', to: '/dashboard' },
  {
    from: '/digital-twins/:slug',
    to: '/dashboard',
    sample: '/digital-twins/montreal',
    expected: '/dashboard',
  },
];

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
