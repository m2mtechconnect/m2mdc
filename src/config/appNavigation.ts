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
  Activity,
  BarChart3,
  Boxes,
  ClipboardCheck,
  LayoutDashboard,
  Plug,
  Server,
  Shield,
  Users,
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
}

export const WORKSPACE_NAV: AppNavItem[] = [
  {
    name: 'Dashboard',
    fullName: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    matches: ['/dashboard'],
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
    icon: Activity,
    matches: ['/simulation'],
    description: 'Run, compare and review scenarios.',
  },
  {
    name: 'Evidence',
    fullName: 'Evidence',
    href: '/dsx/evidence-beta/evidence',
    icon: ClipboardCheck,
    matches: ['/dsx/evidence-beta', '/compliance'],
    description: 'Provenance, decision record and exports.',
  },
  {
    name: 'Integrations',
    fullName: 'Integrations',
    href: '/integrations',
    icon: Plug,
    matches: ['/integrations', '/settings/integrations', '/marketplace', '/connect'],
    description: 'Connection and readiness state for external systems.',
  },
];

export const MANAGE_NAV: AppNavItem[] = [
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
    name: 'Analytics',
    fullName: 'Telemetry and analytics',
    href: '/intelligence',
    icon: BarChart3,
    matches: ['/intelligence', '/analytics', '/operations'],
    permission: 'analytics.view',
    description: 'Aggregated views over modelled outputs.',
  },
  {
    name: 'Access',
    fullName: 'Teams and access',
    href: '/teams',
    icon: Users,
    matches: ['/teams', '/account/access-control'],
    permission: 'tenant.view_members',
    description: 'Members, roles and access review.',
  },
  {
    name: 'Admin',
    fullName: 'Admin console',
    href: '/admin/signups-dashboard',
    icon: Shield,
    matches: ['/admin'],
    permission: 'platform.view_admin_console',
    description: 'Approvals, signups and platform administration.',
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
