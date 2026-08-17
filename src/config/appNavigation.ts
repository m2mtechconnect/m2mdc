/**
 * Canonical AURA DC information architecture, organised around the DSX
 * AI-factory lifecycle: Overview, Design, Simulate, Operate, Govern, Support.
 *
 * One list, one destination per concept. The header, the mobile sheet and
 * the command palette all read from here, so a destination can never appear
 * twice under two different labels.
 *
 * Labels changed with the DSX alignment. Routes did NOT: every canonical
 * href below is the same href the page has always been mounted at, and
 * `src/config/routeAliases.ts` keeps every legacy path redirecting to it.
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
  Wrench,
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
  /** One-line purpose, shown in the mobile sheet. */
  description: string;
  /** DSX lifecycle group this destination belongs to. */
  group?: NavGroupId;
  /**
   * Sub-destinations that belong to this item. Rendered indented under the
   * parent so previously orphaned pages are reachable from navigation
   * without inventing a second top-level entry for the same concept.
   */
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

export const WORKSPACE_NAV: AppNavItem[] = [
  {
    name: 'Overview',
    fullName: 'AI Factory Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
    matches: ['/dashboard', '/'],
    group: 'overview',
    description:
      'Facility status, simulated outcomes and data availability across the modelled AI factory.',
  },
  {
    name: 'Blueprint',
    fullName: 'Facility Blueprint',
    href: '/blueprint',
    icon: Boxes,
    matches: ['/blueprint', '/data-centre-twin', '/infrastructure'],
    group: 'design',
    description: 'Facility topology, OpenUSD assemblies, configuration and versions.',
  },
  {
    name: 'Simulate',
    fullName: 'Simulation Studio',
    href: '/simulation',
    icon: FlaskConical,
    matches: ['/simulation'],
    group: 'simulate',
    description: 'Configure, execute, compare and review simulation-backed scenarios.',
  },
  {
    name: 'Evidence',
    fullName: 'Validation & Evidence',
    href: '/dsx/evidence-beta/overview',
    icon: FileSearch,
    matches: ['/dsx/evidence-beta', '/compliance'],
    group: 'design',
    description: 'Validation results, provenance, simulation evidence and exports.',
  },
];

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
    matches: ['/manage/integrations', '/manage/connections', '/integrations', '/settings/integrations', '/marketplace', '/connect'],
    permission: 'twin.edit',
    group: 'operate',
    description: 'Configure, test, map and monitor external system connections and data exchange.',
  },
  {
    name: 'Asset pipeline',
    fullName: 'OpenUSD Asset Pipeline',
    href: '/builder',
    icon: Wrench,
    matches: ['/builder'],
    permission: 'twin.edit',
    group: 'design',
    description: 'Source acquisition, canonical OpenUSD masters and approved browser derivatives.',
  },
  {
    name: 'Agents',
    fullName: 'Agents & Optimization',
    href: '/app/agents',
    icon: Server,
    matches: ['/app/agents', '/agent'],
    permission: 'agent.view',
    group: 'operate',
    description: 'Agent scopes, data access, recommendations, execution state and audit history.',
  },
  {
    name: 'Operations',
    fullName: 'Operations & Telemetry',
    href: '/analytics',
    icon: BarChart3,
    matches: ['/intelligence', '/analytics', '/operations'],
    permission: 'analytics.view',
    group: 'operate',
    description: 'Operational data, simulation outputs and per-system data availability.',
  },
  {
    name: 'Runtime',
    fullName: 'Runtime Environments',
    href: '/deployments',
    icon: Rocket,
    matches: ['/deployments', '/deploy'],
    permission: 'deployment.view',
    group: 'operate',
    description: 'Where AURA runs today, plus the planned Brev and AWS lanes.',
  },
  {
    name: 'Agent configuration',
    fullName: 'Agent Configuration',
    href: '/settings/ai',
    icon: Sparkles,
    matches: ['/settings/ai'],
    permission: 'agent.administer',
    group: 'govern',
    description: 'Agent policy, approved providers, knowledge boundaries and governance.',
  },
  {
    name: 'Admin',
    fullName: 'Admin Console',
    href: '/admin/signups-dashboard',
    icon: Shield,
    matches: ['/admin'],
    permission: 'platform.view_admin_console',
    group: 'govern',
    description: 'Approvals, signups and platform administration.',
    children: [
      {
        name: 'Signups',
        fullName: 'Signups and approvals',
        href: '/admin/signups-dashboard',
        icon: Shield,
        matches: ['/admin/signups-dashboard'],
        description: 'Review and approve new account requests.',
      },
      {
        name: 'User approvals',
        fullName: 'User approvals',
        href: '/admin/user-approvals',
        icon: Shield,
        matches: ['/admin/user-approvals'],
        description: 'Approve or reject pending platform users.',
      },
      {
        name: 'Onboarding',
        fullName: 'Onboarding submissions',
        href: '/admin/onboarding-submissions',
        icon: Shield,
        matches: ['/admin/onboarding-submissions'],
        description: 'Questionnaire responses captured before sign-up.',
      },
      {
        name: 'Teams',
        fullName: 'Teams and roles',
        href: '/teams',
        icon: Shield,
        matches: ['/teams'],
        description: 'Members, role assignment and collaboration.',
      },
      {
        name: 'Access control',
        fullName: 'Access control',
        href: '/account/access-control',
        icon: Shield,
        matches: ['/account/access-control'],
        description: 'Per-resource permissions for the current account.',
      },
      {
        name: 'Asset pipeline',
        fullName: 'Asset pipeline',
        href: '/admin/asset-pipeline',
        icon: Shield,
        matches: ['/admin/asset-pipeline', '/admin/asset-validation', '/admin/asset-preview'],
        description: 'Approved 3D derivatives and hardware GPU validation.',
      },
      {
        name: 'DSX capabilities',
        fullName: 'DSX capability registry',
        href: '/admin/dsx-capabilities',
        icon: Shield,
        matches: ['/admin/dsx-capabilities'],
        description: 'Capability status, evidence, owners, blockers and permitted claims.',
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
    description: 'Guides, playbooks and product documentation.',
  },
];

export interface NavGroup {
  id: NavGroupId;
  label: string;
  items: AppNavItem[];
}

/** Every destination, in DSX lifecycle order, deduplicated by href. */
export const NAV_GROUP_ORDER: NavGroupId[] = [
  'overview',
  'design',
  'simulate',
  'operate',
  'govern',
  'support',
];

const ALL_NAV_ITEMS: AppNavItem[] = [...WORKSPACE_NAV, ...MANAGE_NAV, ...SUPPORT_NAV];

/**
 * DSX lifecycle grouping used by the navigation drawer. Items the caller
 * cannot see are removed; empty groups are dropped.
 */
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

/** Filter the manage group down to what the caller is permitted to see. */
export function visibleManageNav(can: (p: Permission) => boolean): AppNavItem[] {
  return MANAGE_NAV.filter((item) => !item.permission || can(item.permission));
}
