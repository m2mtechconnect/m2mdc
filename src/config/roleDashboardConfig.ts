/**
 * Role-Based Adaptive Dashboard Configuration
 * 
 * Defines per-role KPIs, dashboard sections, and navigation items.
 * Used by Dashboard, Layout, and role-aware components.
 */

import {
  LayoutDashboard, Wrench, BarChart3, Shield, Users, Server,
  Activity, Cpu, Thermometer, Globe, Zap, TrendingUp, Clock,
  DollarSign, FileCheck, AlertTriangle, Lock, Eye, UserCheck,
  Leaf, ShieldCheck, Gauge, Network,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AppRole } from '@/contexts/RBACContext';

// ─── KPI Definition ───────────────────────────────────────────────
export interface RoleKpi {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Mock value — replaced by live data in dashboard */
  defaultValue: string;
  change?: string;
  trend: 'up' | 'down' | 'neutral';
  tooltip: string;
  navigateTo?: string;
}

// ─── Section Definition ───────────────────────────────────────────
export interface RoleDashboardSection {
  id: string;
  title: string;
  icon: LucideIcon;
  /** Component key rendered by AdaptiveDashboard */
  component: string;
  /** Priority order — lower = higher on page */
  priority: number;
}

// ─── Navigation Item ──────────────────────────────────────────────
export interface RoleNavItem {
  name: string;
  fullName: string;
  href: string;
  icon: LucideIcon;
  group: 'primary' | 'secondary';
}

// ─── Full Role Config ─────────────────────────────────────────────
export interface RoleDashboardConfig {
  role: AppRole;
  label: string;
  description: string;
  greeting: string;
  kpis: RoleKpi[];
  sections: RoleDashboardSection[];
  navigation: RoleNavItem[];
}

// ═══════════════════════════════════════════════════════════════════
// EXECUTIVE CONFIG
// ═══════════════════════════════════════════════════════════════════
const executiveConfig: RoleDashboardConfig = {
  role: 'executive',
  label: 'Executive',
  description: 'Strategic overview with financial & compliance insights',
  greeting: 'Executive Command Centre',
  kpis: [
    { key: 'total_roi', label: 'Total ROI', icon: DollarSign, defaultValue: '247%', change: '+18.3%', trend: 'up', tooltip: 'Return on investment across all data centre operations', navigateTo: '/intelligence' },
    { key: 'compliance_score', label: 'Compliance Score', icon: ShieldCheck, defaultValue: '96.4%', change: '+1.2%', trend: 'up', tooltip: 'Overall regulatory and data sovereignty compliance', navigateTo: '/compliance' },
    { key: 'cost_savings', label: 'Monthly Savings', icon: TrendingUp, defaultValue: '$142K', change: '+$12K', trend: 'up', tooltip: 'Cost reduction from AI-driven optimization', navigateTo: '/intelligence' },
    { key: 'carbon_reduction', label: 'Carbon Reduction', icon: Leaf, defaultValue: '34%', change: '+5.1%', trend: 'up', tooltip: 'Year-over-year carbon emission reduction', navigateTo: '/intelligence' },
  ],
  sections: [
    { id: 'strategic_overview', title: 'Strategic Overview', icon: TrendingUp, component: 'StrategicOverview', priority: 1 },
    { id: 'financial_summary', title: 'Financial Summary', icon: DollarSign, component: 'FinancialSummary', priority: 2 },
    { id: 'compliance_posture', title: 'Compliance Posture', icon: Shield, component: 'CompliancePosture', priority: 3 },
    { id: 'team_performance', title: 'Team Performance', icon: Users, component: 'TeamPerformance', priority: 4 },
  ],
  navigation: [
    { name: 'Command', fullName: 'Executive Command Centre', href: '/', icon: LayoutDashboard, group: 'primary' },
    { name: 'Analytics', fullName: 'Strategic Analytics', href: '/intelligence', icon: BarChart3, group: 'primary' },
    { name: 'Compliance', fullName: 'Sovereignty & Compliance', href: '/compliance', icon: Shield, group: 'primary' },
    { name: 'Teams', fullName: 'Team Management', href: '/teams', icon: Users, group: 'secondary' },
    { name: 'Approvals', fullName: 'User Approvals', href: '/admin/signups-dashboard', icon: UserCheck, group: 'secondary' },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// MANAGER CONFIG
// ═══════════════════════════════════════════════════════════════════
const managerConfig: RoleDashboardConfig = {
  role: 'manager',
  label: 'Manager',
  description: 'Operational oversight with team & agent performance',
  greeting: 'Operations Dashboard',
  kpis: [
    { key: 'active_agents', label: 'Active Agents', icon: Server, defaultValue: '12', change: '+3', trend: 'up', tooltip: 'Currently running subsystem agents', navigateTo: '/app/agents' },
    { key: 'team_members', label: 'Team Members', icon: Users, defaultValue: '8', trend: 'neutral', tooltip: 'Active team members', navigateTo: '/teams' },
    { key: 'pending_approvals', label: 'Pending Approvals', icon: Clock, defaultValue: '3', trend: 'neutral', tooltip: 'Users awaiting access approval', navigateTo: '/admin/signups-dashboard' },
    { key: 'avg_response', label: 'Avg Response Time', icon: Gauge, defaultValue: '1.2s', change: '-0.3s', trend: 'down', tooltip: 'Average agent response latency', navigateTo: '/intelligence' },
  ],
  sections: [
    { id: 'operations_overview', title: 'Operations Overview', icon: Activity, component: 'OperationsOverview', priority: 1 },
    { id: 'agent_performance', title: 'Agent Performance', icon: Server, component: 'AgentPerformance', priority: 2 },
    { id: 'team_activity', title: 'Team Activity', icon: Users, component: 'TeamActivity', priority: 3 },
    { id: 'approval_queue', title: 'Approval Queue', icon: UserCheck, component: 'ApprovalQueue', priority: 4 },
  ],
  navigation: [
    { name: 'Command', fullName: 'Operations Dashboard', href: '/', icon: LayoutDashboard, group: 'primary' },
    { name: 'Agents', fullName: 'Subsystem Agents', href: '/app/agents', icon: Server, group: 'primary' },
    { name: 'Analytics', fullName: 'Performance Analytics', href: '/intelligence', icon: BarChart3, group: 'primary' },
    { name: 'Teams', fullName: 'Team Management', href: '/teams', icon: Users, group: 'secondary' },
    { name: 'Approvals', fullName: 'User Approvals', href: '/admin/signups-dashboard', icon: UserCheck, group: 'secondary' },
    { name: 'Build', fullName: 'Build Twin', href: '/builder', icon: Wrench, group: 'secondary' },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// ENGINEER CONFIG
// ═══════════════════════════════════════════════════════════════════
const engineerConfig: RoleDashboardConfig = {
  role: 'engineer',
  label: 'Engineer',
  description: 'Technical deep-dive with agent configs, logs & debugging',
  greeting: 'Engineering Workbench',
  kpis: [
    { key: 'global_pue', label: 'Global PUE', icon: Zap, defaultValue: '1.38', change: '-2.1%', trend: 'down', tooltip: 'Power Usage Effectiveness across all facilities', navigateTo: '/data-centre-twin' },
    { key: 'gpu_saturation', label: 'GPU Saturation', icon: Cpu, defaultValue: '23%', change: '+4.2%', trend: 'up', tooltip: 'GPU cluster capacity utilization', navigateTo: '/data-centre-twin' },
    { key: 'thermal_stability', label: 'Thermal Stability', icon: Thermometer, defaultValue: '94%', trend: 'neutral', tooltip: 'Temperature consistency across cooling zones', navigateTo: '/data-centre-twin' },
    { key: 'sovereign_compute', label: 'Sovereign Compute', icon: Globe, defaultValue: '98%', trend: 'neutral', tooltip: 'Workloads within Canadian jurisdiction', navigateTo: '/data-centre-twin' },
  ],
  sections: [
    { id: 'twin_preview', title: 'Live Twin Preview', icon: Activity, component: 'TwinPreview', priority: 1 },
    { id: 'dc_kpis', title: 'Data Centre KPIs', icon: Gauge, component: 'DCKpis', priority: 2 },
    { id: 'agent_workspace', title: 'Quick Agent Access', icon: Server, component: 'AgentWorkspace', priority: 3 },
    { id: 'simulation_launcher', title: 'Simulation Launcher', icon: Activity, component: 'SimulationLauncher', priority: 4 },
  ],
  navigation: [
    { name: 'Command', fullName: 'Engineering Workbench', href: '/', icon: LayoutDashboard, group: 'primary' },
    { name: 'Build', fullName: 'Build Data Centre Twin', href: '/builder', icon: Wrench, group: 'primary' },
    { name: 'Agents', fullName: 'Subsystem Agents', href: '/app/agents', icon: Server, group: 'primary' },
    { name: 'Analytics', fullName: 'Telemetry & Analytics', href: '/intelligence', icon: BarChart3, group: 'secondary' },
    { name: 'Simulation', fullName: 'Simulation', href: '/data-centre-twin?view=simulation', icon: Activity, group: 'secondary' },
    { name: 'Audit', fullName: 'Sovereignty & Safety Audit', href: '/compliance', icon: Shield, group: 'secondary' },
    { name: 'Teams', fullName: 'Teams', href: '/teams', icon: Users, group: 'secondary' },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// SECURITY ADMIN CONFIG
// ═══════════════════════════════════════════════════════════════════
const securityAdminConfig: RoleDashboardConfig = {
  role: 'security_admin',
  label: 'Security Admin',
  description: 'Security posture, audit logs & policy enforcement',
  greeting: 'Security Operations Centre',
  kpis: [
    { key: 'security_score', label: 'Security Score', icon: Shield, defaultValue: '94%', change: '+2.1%', trend: 'up', tooltip: 'Overall security posture score', navigateTo: '/compliance' },
    { key: 'active_threats', label: 'Active Alerts', icon: AlertTriangle, defaultValue: '2', trend: 'neutral', tooltip: 'Unresolved security alerts', navigateTo: '/compliance' },
    { key: 'policy_compliance', label: 'Policy Compliance', icon: FileCheck, defaultValue: '98.7%', change: '+0.5%', trend: 'up', tooltip: 'Percentage of enforced security policies passing', navigateTo: '/compliance' },
    { key: 'access_reviews', label: 'Access Reviews Due', icon: Eye, defaultValue: '5', trend: 'neutral', tooltip: 'Pending access review requests', navigateTo: '/teams' },
  ],
  sections: [
    { id: 'security_posture', title: 'Security Posture', icon: Shield, component: 'SecurityPosture', priority: 1 },
    { id: 'audit_logs', title: 'Recent Audit Logs', icon: FileCheck, component: 'AuditLogs', priority: 2 },
    { id: 'access_control', title: 'Access Control', icon: Lock, component: 'AccessControl', priority: 3 },
    { id: 'sovereignty_status', title: 'Data Sovereignty', icon: Globe, component: 'SovereigntyStatus', priority: 4 },
  ],
  navigation: [
    { name: 'Command', fullName: 'Security Operations Centre', href: '/', icon: LayoutDashboard, group: 'primary' },
    { name: 'Audit', fullName: 'Sovereignty & Safety Audit', href: '/compliance', icon: Shield, group: 'primary' },
    { name: 'Teams', fullName: 'Access Management', href: '/teams', icon: Users, group: 'primary' },
    { name: 'Approvals', fullName: 'User Approvals', href: '/admin/signups-dashboard', icon: UserCheck, group: 'secondary' },
    { name: 'Analytics', fullName: 'Security Analytics', href: '/intelligence', icon: BarChart3, group: 'secondary' },
    { name: 'Agents', fullName: 'Agent Oversight', href: '/app/agents', icon: Server, group: 'secondary' },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// CONFIG MAP & HELPERS
// ═══════════════════════════════════════════════════════════════════

const configMap: Record<string, RoleDashboardConfig> = {
  executive: executiveConfig,
  manager: managerConfig,
  engineer: engineerConfig,
  security_admin: securityAdminConfig,
  // Fallback aliases
  compliance: securityAdminConfig,
  data_analyst: engineerConfig,
  marketing: managerConfig,
  sales: managerConfig,
  support: managerConfig,
  finance: executiveConfig,
};

/**
 * Get the dashboard configuration for a given role.
 * Falls back to engineer config if role is unknown.
 */
export function getRoleDashboardConfig(role: AppRole | null): RoleDashboardConfig {
  if (!role) return engineerConfig;
  return configMap[role] || engineerConfig;
}

/**
 * Get navigation items for a role, split into primary and secondary.
 */
export function getRoleNavigation(role: AppRole | null) {
  const config = getRoleDashboardConfig(role);
  return {
    primary: config.navigation.filter(n => n.group === 'primary'),
    secondary: config.navigation.filter(n => n.group === 'secondary'),
    all: config.navigation,
  };
}
