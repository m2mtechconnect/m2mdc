/**
 * Canonical AURA DC information architecture.
 *
 * The global shell follows a Salesforce-style split between four persistent
 * workspaces, operational management, governance and utilities. Creation
 * workflows (Builder) and contextual detail routes deliberately do not become
 * permanent global destinations.
 *
 * One list, one destination per concept. The header, mobile sheet and command
 * palette all read from this module so labels and active states cannot drift.
 */
import {
  BarChart3,
  Boxes,
  Building2,
  Cable,
  FileSearch,
  FlaskConical,
  HelpCircle,
  LayoutDashboard,
  Rocket,
  Search,
  Server,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Permission } from '@/auth/permissions';

export interface AppNavItem {
  /** Short label used in the header. */
  name: string;
  /** Full label used in tooltips, the mobile sheet and aria-label. */
  fullName: string;
  href: string;
  icon: LucideIcon;
  /** Extra prefixes that should mark this item active. */
  matches?: string[];
  /** Permission required to see the item. Undefined = always visible. */
  permission?: Permission;
  /** One-line purpose, shown in menus and the mobile sheet. */
  description: string;
  /** Lifecycle group this destination belongs to. */
  group?: NavGroupId;
  /** Contextual child destinations; never promoted to a second global item. */
  children?: AppNavItem[];
}

export type NavGroupId = 'overview' | 'design' | 'simulate' | 'operate' | 'govern' | 'support';

export const NAV_GROUP_LABEL: Record<NavGroupId, string> = {
  overview: 'Overview',
  design: 'Design',
  simulate: 'Simulate',
  operate: 'Operate',
  govern: 'Govern',
  support: 'Support',
};

/**
 * Four durable operator workspaces. These are the only product domains that
 * deserve persistent header placement.
 */
export const WORKSPACE_NAV: AppNavItem[] = [
  {
    name: 'Command Center',
    fullName: 'Command Center',
    href: '/dashboard',
    icon: LayoutDashboard,
    matches: ['/dashboard', '/'],
    group: 'overview',
    description: 'Facility status, priority actions, recent simulations and model availability.',
  },
  {
    name: 'Blueprint',
    fullName: 'Facility Blueprint',
    href: '/blueprint',
    icon: Boxes,
    matches: ['/blueprint', '/data-centre-twin', '/infrastructure'],
    group: 'design',
    description: 'Facility topology, OpenUSD assets, automation definitions and model versions.',
  },
  {
    name: 'Simulation',
    fullName: 'Simulation',
    href: '/simulation',
    icon: FlaskConical,
    matches: ['/simulation'],
    group: 'simulate',
    description: 'Configure scenarios, run simulations, compare outcomes and review recommendations.',
  },
  {
    name: 'Evidence',
    fullName: 'Evidence',
    href: '/dsx/evidence-beta/overview',
    icon: FileSearch,
    matches: ['/dsx/evidence-beta', '/compliance'],
    group: 'design',
    description: 'Provenance, domain evidence, sustainability evidence and decision records.',
  },
];

/**
 * Management and governance destinations. Builder is intentionally absent:
 * creation is an action from Facilities/templates, not a permanent business
 * domain. Contextual detail routes remain reachable from their owning records.
 */
export const MANAGE_NAV: AppNavItem[] = [
  {
    name: 'Facilities',
    fullName: 'Facilities',
    href: '/manage/facilities',
    icon: Building2,
    matches: ['/manage/facilities'],
    permission: 'twin.edit',
    group: 'design',
    description: 'Sites, halls, capacity, infrastructure scope and lifecycle state.',
  },
  {
    name: 'Connections',
    fullName: 'Connections',
    href: '/manage/integrations',
    icon: Cable,
    matches: ['/manage/integrations', '/manage/connections', '/integrations', '/settings/integrations', '/connect'],
    permission: 'twin.edit',
    group: 'operate',
    description: 'Configure, test, map and monitor external systems and data exchange.',
  },
  {
    name: 'Agents',
    fullName: 'Agents',
    href: '/app/agents',
    icon: Server,
    matches: ['/app/agents', '/agent', '/agents'],
    permission: 'agent.view',
    group: 'operate',
    description: 'Agent scopes, recommendations, execution state, configuration and audit history.',
  },
  {
    name: 'Operations',
    fullName: 'Operations',
    href: '/analytics',
    icon: BarChart3,
    matches: ['/intelligence', '/analytics', '/operations'],
    permission: 'analytics.view',
    group: 'operate',
    description: 'Aggregate operational status, alerts, trends and data availability.',
  },
  {
    name: 'Runtime',
    fullName: 'Runtime',
    href: '/deployments',
    icon: Rocket,
    matches: ['/deployments', '/deploy'],
    permission: 'deployment.view',
    group: 'operate',
    description: 'Deployment history, runtime state and execution evidence.',
  },
  {
    name: 'People & Access',
    fullName: 'People & Access',
    href: '/teams',
    icon: Users,
    matches: [
      '/teams',
      '/account/access-control',
      '/admin/user-approvals',
      '/admin/signups-dashboard',
      '/admin/onboarding-submissions',
    ],
    permission: 'tenant.view_members',
    group: 'govern',
    description: 'Members, invitations, approvals, roles and access administration.',
  },
  {
    name: 'Agent Policies',
    fullName: 'Agent Policies',
    href: '/settings/ai',
    icon: Sparkles,
    matches: ['/settings/ai'],
    permission: 'agent.administer',
    group: 'govern',
    description: 'Approved providers, grounding boundaries, safety settings and agent governance.',
  },
  {
    name: 'Platform Admin',
    fullName: 'Platform Administration',
    href: '/admin/platform-readiness',
    icon: Shield,
    matches: ['/admin', '/twin-debug'],
    permission: 'platform.view_admin_console',
    group: 'govern',
    description: 'Platform readiness, registries, validation and internal diagnostics.',
    children: [
      {
        name: 'Readiness',
        fullName: 'Platform readiness',
        href: '/admin/platform-readiness',
        icon: Shield,
        matches: ['/admin/platform-readiness'],
        description: 'Environment readiness, capability state and release blockers.',
      },
      {
        name: 'DSX capabilities',
        fullName: 'DSX capability registry',
        href: '/admin/dsx-capabilities',
        icon: Shield,
        matches: ['/admin/dsx-capabilities'],
        description: 'Capability status, evidence, owners, blockers and permitted claims.',
      },
      {
        name: 'Datasets',
        fullName: 'Dataset registry',
        href: '/admin/dataset-registry',
        icon: Shield,
        matches: ['/admin/dataset-registry'],
        description: 'Registered datasets, validation state and reference data controls.',
      },
      {
        name: 'Asset derivatives',
        fullName: 'Asset derivatives and GPU validation',
        href: '/admin/asset-pipeline',
        icon: Shield,
        matches: ['/admin/asset-pipeline', '/admin/asset-validation', '/admin/asset-preview'],
        description: 'Approved 3D derivatives and their hardware GPU validation runs.',
      },
      {
        name: 'Reference facility',
        fullName: 'Reference facility validation',
        href: '/admin/reference-facility-validation',
        icon: Shield,
        matches: ['/admin/reference-facility-validation'],
        description: 'Reference-facility model and evidence validation.',
      },
      {
        name: 'Twin diagnostics',
        fullName: 'Twin diagnostics',
        href: '/twin-debug',
        icon: Shield,
        matches: ['/twin-debug'],
        description: 'Internal twin identifiers, query state and telemetry-source diagnostics.',
      },
    ],
  },
];

/** Always-visible support and utility destinations. */
export const SUPPORT_NAV: AppNavItem[] = [
  {
    name: 'Search',
    fullName: 'Search',
    href: '/search',
    icon: Search,
    matches: ['/search'],
    group: 'support',
    description: 'Search facilities, assets, agents and evidence.',
  },
  {
    name: 'Learning Hub',
    fullName: 'Learning Hub',
    href: '/help',
    icon: HelpCircle,
    matches: ['/help', '/playbook'],
    group: 'support',
    description: 'AURA DC guides, workflows, governance and product documentation.',
  },
];

export interface NavGroup {
  id: NavGroupId;
  label: string;
  items: AppNavItem[];
}

export const NAV_GROUP_ORDER: NavGroupId[] = [
  'overview',
  'design',
  'simulate',
  'operate',
  'govern',
  'support',
];

const ALL_NAV_ITEMS: AppNavItem[] = [...WORKSPACE_NAV, ...MANAGE_NAV, ...SUPPORT_NAV];

/** Lifecycle grouping used by the responsive navigation drawer. */
export function navGroups(can: (p: Permission) => boolean): NavGroup[] {
  return NAV_GROUP_ORDER.map((id) => ({
    id,
    label: NAV_GROUP_LABEL[id],
    items: ALL_NAV_ITEMS.filter(
      (item) => item.group === id && (!item.permission || can(item.permission)),
    ),
  })).filter((g) => g.items.length > 0);
}

/** True when `pathname` belongs to the item's destination. */
export function isNavItemActive(item: AppNavItem, pathname: string): boolean {
  if (item.href === '/') return pathname === '/' || pathname === '/dashboard';
  const prefixes = item.matches ?? [item.href];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Filter the management/governance menu down to authorized destinations. */
export function visibleManageNav(can: (p: Permission) => boolean): AppNavItem[] {
  return MANAGE_NAV.filter((item) => !item.permission || can(item.permission));
}
