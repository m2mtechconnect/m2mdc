/**
 * Canonical AURA DC information architecture.
 *
 * Four persistent workspaces stay in the global header. Operational management
 * and governance are separate enterprise navigation groups, while creation and
 * record-detail flows remain contextual actions.
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
import { stackDescription } from '@/config/auraStackManifest';
import {
  ACCELERATED_AI_CAPABILITIES_LABEL,
  ACCELERATED_AI_CAPABILITIES_ROUTE,
  EVIDENCE_ROOT,
  LEGACY_CAPABILITIES_ROUTE,
  LEGACY_EVIDENCE_ROOT,
} from '@/config/evidenceRoutes';

export interface AppNavItem {
  name: string;
  fullName: string;
  href: string;
  icon: LucideIcon;
  matches?: string[];
  permission?: Permission;
  description: string;
  group?: NavGroupId;
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

export const NAV_GROUP_ORDER: NavGroupId[] = [
  'overview',
  'design',
  'simulate',
  'operate',
  'govern',
  'support',
];


export const WORKSPACE_NAV: AppNavItem[] = [
  {
    name: 'Command Center',
    fullName: 'Command Center',
    href: '/dashboard',
    icon: LayoutDashboard,
    matches: ['/dashboard', '/'],
    group: 'overview',
    description: `Facility status, priority actions and recent runs. ${stackDescription('platform.command')}`,
  },
  {
    name: 'Blueprint',
    fullName: 'Facility Blueprint',
    href: '/blueprint',
    icon: Boxes,
    matches: ['/blueprint'],
    group: 'design',
    description: stackDescription('twin.openusd'),
  },
  {
    name: 'Simulation',
    fullName: 'Simulation',
    href: '/simulation',
    icon: FlaskConical,
    matches: ['/simulation'],
    group: 'simulate',
    description: stackDescription('simulation.engine'),
  },
  {
    name: 'Evidence',
    fullName: 'Evidence',
    // Neutral canonical Evidence URL. The retired implementation-named family
    // is still matched for active-state highlighting on inbound deep links,
    // but is never emitted as an href.
    href: `${EVIDENCE_ROOT}/overview`,
    icon: FileSearch,
    matches: [EVIDENCE_ROOT, LEGACY_EVIDENCE_ROOT, '/compliance'],
    group: 'govern',
    description: stackDescription('evidence.workspace'),
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
    matches: ['/manage/integrations', '/manage/connections', '/integrations', '/settings/integrations', '/connect'],
    permission: 'twin.edit',
    group: 'operate',
    description: `${stackDescription('connections.enterprise')} ${stackDescription('data.storage')}`,
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
    // Matches the page heading exactly; the destination previously advertised
    // three different names (nav "Operations", route /analytics, component
    // IntelligenceDashboard, heading "Operations & Telemetry").
    fullName: 'Operations & Telemetry',
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
    description: `Deployment history, runtime state and execution evidence. ${stackDescription('governance.controls')}`,
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
    // Model providers are AURA-managed, not customer configuration, so this
    // reads as managed-AI and grounding governance rather than provider choice.
    description: `${stackDescription('ai.managed')} Grounding boundaries, safety settings and agent governance.`,
  },
  {
    name: 'Platform Admin',
    fullName: 'Platform Administration',
    href: '/admin/platform-readiness',
    icon: Shield,
    matches: [
      '/admin/platform-readiness',
      ACCELERATED_AI_CAPABILITIES_ROUTE,
      LEGACY_CAPABILITIES_ROUTE,
      '/admin/dataset-registry',
      '/admin/asset-preview',
      '/admin/asset-pipeline',
      '/admin/asset-validation',
      '/admin/customers',
      '/admin/reference-facility-validation',
      '/twin-debug',
    ],
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
        name: ACCELERATED_AI_CAPABILITIES_LABEL,
        fullName: `${ACCELERATED_AI_CAPABILITIES_LABEL} registry`,
        href: ACCELERATED_AI_CAPABILITIES_ROUTE,
        icon: Shield,
        matches: [ACCELERATED_AI_CAPABILITIES_ROUTE, LEGACY_CAPABILITIES_ROUTE],
        description: `${stackDescription('ai.accelerated')} Capability status, evidence, owners, blockers and permitted claims.`,
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
        name: 'Customers',
        fullName: 'Customer accounts',
        href: '/admin/customers',
        icon: Shield,
        matches: ['/admin/customers'],
        permission: 'platform.manage_customers',
        description: 'Platform-owned customer accounts and their provisioning state.',
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

function visible(items: AppNavItem[], can: (permission: Permission) => boolean): AppNavItem[] {
  return items.filter((item) => !item.permission || can(item.permission));
}

export function visibleManageNav(can: (permission: Permission) => boolean): AppNavItem[] {
  return visible(MANAGE_NAV.filter((item) => item.group === 'operate' || item.group === 'design'), can);
}

export function visibleGovernNav(can: (permission: Permission) => boolean): AppNavItem[] {
  return visible(MANAGE_NAV.filter((item) => item.group === 'govern'), can);
}

export function navGroups(can: (permission: Permission) => boolean): NavGroup[] {
  return (Object.keys(NAV_GROUP_LABEL) as NavGroupId[]).map((id) => ({
    id,
    label: NAV_GROUP_LABEL[id],
    items: [
      ...WORKSPACE_NAV.filter((item) => item.group === id),
      ...visible(MANAGE_NAV.filter((item) => item.group === id), can),
      ...SUPPORT_NAV.filter((item) => item.group === id),
    ],
  })).filter((group) => group.items.length > 0);
}

/**
 * Children carry their own optional permission (Customers requires
 * `platform.manage_customers`, which not every admin-console user holds).
 * Nav rendering must filter them the same way top-level items are filtered.
 */
export function visibleNavChildren(
  item: AppNavItem,
  can: (permission: Permission) => boolean,
): AppNavItem[] {
  return visible(item.children ?? [], can);
}

export function isNavItemActive(item: AppNavItem, pathname: string): boolean {
  const candidates = item.matches?.length ? item.matches : [item.href];
  return candidates.some((candidate) => pathname === candidate || pathname.startsWith(`${candidate}/`));
}
