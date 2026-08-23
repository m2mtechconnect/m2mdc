/**
 * Role-adaptive dashboard configuration.
 *
 * Role context may change emphasis and permitted actions, but it must not
 * invent a second information architecture or fabricate KPI values. Every
 * role therefore shares the four canonical AURA workspaces and uses explicit
 * `Not assessed` defaults until a real data source provides a value.
 */

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Boxes,
  Cable,
  Clock,
  Cpu,
  DollarSign,
  FileCheck,
  FileSearch,
  Gauge,
  Globe,
  LayoutDashboard,
  Leaf,
  Lock,
  Server,
  Shield,
  Sparkles,
  Thermometer,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AppRole } from '@/contexts/RBACContext';

export interface RoleKpi {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Safe empty-state value. Real/modelled values must come from their source. */
  defaultValue: string;
  change?: string;
  trend: 'up' | 'down' | 'neutral';
  tooltip: string;
  navigateTo?: string;
}

export interface RoleDashboardSection {
  id: string;
  title: string;
  icon: LucideIcon;
  component: string;
  priority: number;
}

export interface RoleNavItem {
  name: string;
  fullName: string;
  href: string;
  icon: LucideIcon;
  group: 'primary' | 'secondary';
}

export interface RoleDashboardConfig {
  role: AppRole;
  label: string;
  description: string;
  greeting: string;
  kpis: RoleKpi[];
  sections: RoleDashboardSection[];
  navigation: RoleNavItem[];
}

const NOT_ASSESSED = 'Not assessed';

/** The four durable workspaces are identical for every internal role. */
const CORE_NAV: RoleNavItem[] = [
  { name: 'Command', fullName: 'Command Center', href: '/dashboard', icon: LayoutDashboard, group: 'primary' },
  { name: 'Blueprint', fullName: 'Facility Blueprint', href: '/blueprint', icon: Boxes, group: 'primary' },
  { name: 'Simulation', fullName: 'Simulation', href: '/simulation', icon: Activity, group: 'primary' },
  { name: 'Evidence', fullName: 'Evidence', href: '/dsx/evidence-beta/overview', icon: FileSearch, group: 'primary' },
];

const executiveConfig: RoleDashboardConfig = {
  role: 'executive',
  label: 'Executive',
  description: 'Decision context with financial, sustainability and governance evidence.',
  greeting: 'Command Center',
  kpis: [
    {
      key: 'financial_exposure',
      label: 'Financial Exposure',
      icon: DollarSign,
      defaultValue: NOT_ASSESSED,
      trend: 'neutral',
      tooltip: 'Financial exposure is shown only when a traceable simulation or approved source provides it.',
      navigateTo: '/dsx/evidence-beta/sustainability/financial',
    },
    {
      key: 'sovereignty_status',
      label: 'Sovereignty Status',
      icon: Globe,
      defaultValue: NOT_ASSESSED,
      trend: 'neutral',
      tooltip: 'Sovereignty remains not assessed until supporting evidence is available.',
      navigateTo: '/dsx/evidence-beta/sustainability/sovereignty',
    },
    {
      key: 'capacity_headroom',
      label: 'Capacity Headroom',
      icon: Gauge,
      defaultValue: NOT_ASSESSED,
      trend: 'neutral',
      tooltip: 'Capacity headroom depends on the active facility model and its provenance.',
      navigateTo: '/dashboard',
    },
    {
      key: 'carbon_intensity',
      label: 'Carbon Intensity',
      icon: Leaf,
      defaultValue: NOT_ASSESSED,
      trend: 'neutral',
      tooltip: 'Carbon values must identify whether they are measured, modelled, reference or unavailable.',
      navigateTo: '/dsx/evidence-beta/sustainability',
    },
  ],
  sections: [
    { id: 'strategic_overview', title: 'Decision Overview', icon: TrendingUp, component: 'StrategicOverview', priority: 1 },
    { id: 'financial_summary', title: 'Financial Evidence', icon: DollarSign, component: 'FinancialSummary', priority: 2 },
    { id: 'compliance_posture', title: 'Governance Evidence', icon: Shield, component: 'CompliancePosture', priority: 3 },
    { id: 'team_performance', title: 'People & Access', icon: Users, component: 'TeamPerformance', priority: 4 },
  ],
  navigation: [
    ...CORE_NAV,
    { name: 'Operations', fullName: 'Operations', href: '/analytics', icon: BarChart3, group: 'secondary' },
    { name: 'People', fullName: 'People & Access', href: '/teams', icon: Users, group: 'secondary' },
  ],
};

const managerConfig: RoleDashboardConfig = {
  role: 'manager',
  label: 'Manager',
  description: 'Operational oversight across agents, runtime and people.',
  greeting: 'Command Center',
  kpis: [
    {
      key: 'active_agents',
      label: 'Active Agents',
      icon: Server,
      defaultValue: NOT_ASSESSED,
      trend: 'neutral',
      tooltip: 'Active agent count comes from the authorized agent roster.',
      navigateTo: '/app/agents',
    },
    {
      key: 'team_members',
      label: 'Team Members',
      icon: Users,
      defaultValue: NOT_ASSESSED,
      trend: 'neutral',
      tooltip: 'Member count comes from the authorized People & Access roster.',
      navigateTo: '/teams',
    },
    {
      key: 'pending_approvals',
      label: 'Pending Approvals',
      icon: Clock,
      defaultValue: NOT_ASSESSED,
      trend: 'neutral',
      tooltip: 'Approval state comes from the People & Access workspace.',
      navigateTo: '/teams',
    },
    {
      key: 'operational_status',
      label: 'Operational Status',
      icon: Gauge,
      defaultValue: NOT_ASSESSED,
      trend: 'neutral',
      tooltip: 'Operational status must come from available runtime and data-source evidence.',
      navigateTo: '/analytics',
    },
  ],
  sections: [
    { id: 'operations_overview', title: 'Operations Overview', icon: Activity, component: 'OperationsOverview', priority: 1 },
    { id: 'agent_performance', title: 'Agent Activity', icon: Server, component: 'AgentPerformance', priority: 2 },
    { id: 'team_activity', title: 'People & Access', icon: Users, component: 'TeamActivity', priority: 3 },
    { id: 'approval_queue', title: 'Approval Queue', icon: Lock, component: 'ApprovalQueue', priority: 4 },
  ],
  navigation: [
    ...CORE_NAV,
    { name: 'Agents', fullName: 'Agents', href: '/app/agents', icon: Server, group: 'secondary' },
    { name: 'Operations', fullName: 'Operations', href: '/analytics', icon: BarChart3, group: 'secondary' },
    { name: 'People', fullName: 'People & Access', href: '/teams', icon: Users, group: 'secondary' },
  ],
};

const engineerConfig: RoleDashboardConfig = {
  role: 'engineer',
  label: 'Engineer',
  description: 'Technical model, simulation, evidence and operational diagnostics.',
  greeting: 'Command Center',
  kpis: [
    {
      key: 'global_pue',
      label: 'PUE',
      icon: Zap,
      defaultValue: NOT_ASSESSED,
      trend: 'neutral',
      tooltip: 'PUE is displayed only with explicit provenance for its source or simulation run.',
      navigateTo: '/dsx/evidence-beta/operations/power',
    },
    {
      key: 'gpu_saturation',
      label: 'GPU Saturation',
      icon: Cpu,
      defaultValue: NOT_ASSESSED,
      trend: 'neutral',
      tooltip: 'GPU utilization is unavailable until a bound source or simulation provides it.',
      navigateTo: '/dsx/evidence-beta/operations/compute',
    },
    {
      key: 'thermal_stability',
      label: 'Thermal Stability',
      icon: Thermometer,
      defaultValue: NOT_ASSESSED,
      trend: 'neutral',
      tooltip: 'Thermal state is sourced from model/simulation evidence unless validated telemetry is connected.',
      navigateTo: '/dsx/evidence-beta/operations/thermal',
    },
    {
      key: 'sovereign_compute',
      label: 'Sovereignty',
      icon: Globe,
      defaultValue: NOT_ASSESSED,
      trend: 'neutral',
      tooltip: 'Sovereignty is not inferred from facility location alone; inspect supporting evidence.',
      navigateTo: '/dsx/evidence-beta/sustainability/sovereignty',
    },
  ],
  sections: [
    { id: 'twin_preview', title: 'Facility Model', icon: Activity, component: 'TwinPreview', priority: 1 },
    { id: 'dc_kpis', title: 'Facility Indicators', icon: Gauge, component: 'DCKpis', priority: 2 },
    { id: 'agent_workspace', title: 'Agent Access', icon: Server, component: 'AgentWorkspace', priority: 3 },
    { id: 'simulation_launcher', title: 'Simulation', icon: Activity, component: 'SimulationLauncher', priority: 4 },
  ],
  navigation: [
    ...CORE_NAV,
    { name: 'Agents', fullName: 'Agents', href: '/app/agents', icon: Server, group: 'secondary' },
    { name: 'Operations', fullName: 'Operations', href: '/analytics', icon: BarChart3, group: 'secondary' },
    { name: 'Connections', fullName: 'Connections', href: '/manage/integrations', icon: Cable, group: 'secondary' },
  ],
};

const securityAdminConfig: RoleDashboardConfig = {
  role: 'security_admin',
  label: 'Security Admin',
  description: 'Access governance, policy controls and supporting evidence.',
  greeting: 'Command Center',
  kpis: [
    {
      key: 'security_posture',
      label: 'Security Posture',
      icon: Shield,
      defaultValue: NOT_ASSESSED,
      trend: 'neutral',
      tooltip: 'No synthetic security score is shown. Review concrete controls, alerts and evidence instead.',
      navigateTo: '/admin/platform-readiness',
    },
    {
      key: 'active_alerts',
      label: 'Active Alerts',
      icon: AlertTriangle,
      defaultValue: NOT_ASSESSED,
      trend: 'neutral',
      tooltip: 'Alert counts require a bound operational source.',
      navigateTo: '/analytics',
    },
    {
      key: 'policy_status',
      label: 'Policy Status',
      icon: FileCheck,
      defaultValue: NOT_ASSESSED,
      trend: 'neutral',
      tooltip: 'Policy status is evidence-backed rather than represented as an invented percentage.',
      navigateTo: '/settings/ai',
    },
    {
      key: 'access_reviews',
      label: 'Access Reviews',
      icon: Lock,
      defaultValue: NOT_ASSESSED,
      trend: 'neutral',
      tooltip: 'Access review state comes from People & Access.',
      navigateTo: '/teams',
    },
  ],
  sections: [
    { id: 'security_posture', title: 'Platform Readiness', icon: Shield, component: 'SecurityPosture', priority: 1 },
    { id: 'audit_logs', title: 'Decision & Audit Evidence', icon: FileCheck, component: 'AuditLogs', priority: 2 },
    { id: 'access_control', title: 'People & Access', icon: Lock, component: 'AccessControl', priority: 3 },
    { id: 'sovereignty_status', title: 'Sovereignty Evidence', icon: Globe, component: 'SovereigntyStatus', priority: 4 },
  ],
  navigation: [
    ...CORE_NAV,
    { name: 'People', fullName: 'People & Access', href: '/teams', icon: Users, group: 'secondary' },
    { name: 'Policies', fullName: 'Agent Policies', href: '/settings/ai', icon: Sparkles, group: 'secondary' },
    { name: 'Admin', fullName: 'Platform Administration', href: '/admin/platform-readiness', icon: Shield, group: 'secondary' },
  ],
};

const configMap: Record<string, RoleDashboardConfig> = {
  executive: executiveConfig,
  manager: managerConfig,
  engineer: engineerConfig,
  security_admin: securityAdminConfig,
  compliance: securityAdminConfig,
  data_analyst: engineerConfig,
  marketing: managerConfig,
  sales: managerConfig,
  support: managerConfig,
  finance: executiveConfig,
};

export function getRoleDashboardConfig(role: AppRole | null): RoleDashboardConfig {
  if (!role) return engineerConfig;
  return configMap[role] || engineerConfig;
}

export function getRoleNavigation(role: AppRole | null) {
  const config = getRoleDashboardConfig(role);
  return {
    primary: config.navigation.filter((n) => n.group === 'primary'),
    secondary: config.navigation.filter((n) => n.group === 'secondary'),
    all: config.navigation,
  };
}
