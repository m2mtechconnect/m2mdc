/**
 * Canonical AURA DC information architecture (Stage 6D).
 *
 * One list, one destination per concept. The header, the mobile sheet and
 * the command palette all read from here, so a destination can never appear
 * twice under two different labels.
 *
 * Workspaces (always visible):
 *   Dashboard   - read-only command centre
 *   Blueprint   - facility model, hierarchy, configuration
 *   Simulation  - scenario execution and comparison
 *   Evidence    - provenance, exports, decision record
 *   Integrations- connection and readiness state (nothing is live)
 *
 * Manage (permission gated): authoring and administration.
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
  /**
   * Sub-destinations that belong to this item. Rendered indented under the
   * parent so previously orphaned pages are reachable from navigation
   * without inventing a second top-level entry for the same concept.
   */
  children?: AppNavItem[];
}

export const WORKSPACE_NAV: AppNavItem[] = [
  {
    name: 'Dashboard',
    fullName: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    matches: ['/dashboard', '/'],
    description: 'Read-only overview of the modelled facility.',
  },
  {
    name: 'Blueprint',
    fullName: 'Blueprint',
    href: '/blueprint',
    icon: Boxes,
    matches: ['/blueprint', '/data-centre-twin', '/infrastructure'],
    description: 'Facility model, asset hierarchy and configuration.',
  },
  {
    name: 'Simulation',
    fullName: 'Simulation',
    href: '/simulation',
    icon: FlaskConical,
    matches: ['/simulation'],
    description: 'Run, compare and review scenarios.',
  },
  {
    name: 'Evidence',
    fullName: 'Evidence',
    href: '/dsx/evidence-beta/overview',
    icon: FileSearch,
    matches: ['/dsx/evidence-beta', '/compliance'],
    description: 'Provenance, decision record and exports.',
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
    description: 'Facility list, creation, access and configuration.',
  },
  {
    name: 'Integrations',
    fullName: 'Integrations',
    href: '/manage/integrations',
    icon: Cable,
    matches: ['/manage/integrations', '/integrations', '/settings/integrations', '/marketplace', '/connect'],
    permission: 'twin.edit',
    description: 'Connectors, credentials and external-system readiness.',
  },
  {
    name: 'Build',
    fullName: 'Build twin',
    href: '/builder',
    icon: Wrench,
    matches: ['/builder'],
    permission: 'twin.edit',
    description: 'Author and edit facility twins.',
  },
  {
    name: 'Agents',
    fullName: 'Subsystem agents',
    href: '/app/agents',
    icon: Server,
    matches: ['/app/agents', '/agent'],
    permission: 'agent.view',
    description: 'Configure the modelled subsystem agents.',
  },
  {
    name: 'Telemetry and analytics',
    fullName: 'Telemetry and analytics',
    href: '/analytics',
    icon: BarChart3,
    matches: ['/intelligence', '/analytics', '/operations'],
    permission: 'analytics.view',
    description: 'Aggregated trend views over modelled outputs.',
  },
  {
    name: 'Deployments',
    fullName: 'Deployments',
    href: '/deployments',
    icon: Rocket,
    matches: ['/deployments', '/deploy'],
    permission: 'deployment.view',
    description: 'Deployment history, versions and rollout status.',
  },
  {
    name: 'AI settings',
    fullName: 'AI settings',
    href: '/settings/ai',
    icon: Sparkles,
    matches: ['/settings/ai'],
    permission: 'agent.administer',
    description: 'Model selection and assistant configuration.',
  },
  {
    name: 'Admin',
    fullName: 'Admin console',
    href: '/admin/signups-dashboard',
    icon: Shield,
    matches: ['/admin'],
    permission: 'platform.view_admin_console',
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
    description: 'Search facilities, assets, agents and evidence.',
  },
  {
    name: 'Learning Hub',
    fullName: 'Learning Hub',
    href: '/help',
    icon: HelpCircle,
    matches: ['/help', '/playbook'],
    description: 'Guides, playbooks and product documentation.',
  },
];

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
