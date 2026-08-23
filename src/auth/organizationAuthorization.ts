import type { Permission } from '@/auth/permissions';

export type OrganizationRole =
  | 'owner'
  | 'admin'
  | 'operator'
  | 'engineer'
  | 'manager'
  | 'executive'
  | 'security_admin'
  | 'compliance'
  | 'data_analyst'
  | 'support'
  | 'viewer';

export interface OrganizationMembershipSummary {
  orgId: string;
  orgName: string;
  domain: string | null;
  role: OrganizationRole;
  isDefault: boolean;
}

const VIEWER_BASE: readonly Permission[] = [
  'twin.view',
  'agent.view',
  'deployment.view',
  'analytics.view',
];

const OPERATOR_BASE: readonly Permission[] = [
  ...VIEWER_BASE,
  'twin.edit',
  'agent.operate',
  'deployment.execute',
  'analytics.export',
];

const TENANT_ADMIN_BASE: readonly Permission[] = [
  ...OPERATOR_BASE,
  'twin.delete',
  'agent.administer',
  'tenant.view_members',
  'tenant.manage_members',
];

/**
 * Organization roles never grant platform administration. Platform authority
 * continues to come only from public.user_roles and the canonical global role
 * resolver in permissions.ts.
 */
export const ORGANIZATION_ROLE_PERMISSIONS: Record<OrganizationRole, readonly Permission[]> = {
  owner: [...TENANT_ADMIN_BASE],
  admin: [...TENANT_ADMIN_BASE],
  security_admin: [...VIEWER_BASE, 'analytics.export', 'tenant.view_members', 'tenant.manage_members'],
  manager: [...OPERATOR_BASE, 'tenant.view_members'],
  engineer: [...OPERATOR_BASE],
  operator: [...OPERATOR_BASE],
  executive: [...VIEWER_BASE, 'analytics.export', 'tenant.view_members'],
  compliance: [...VIEWER_BASE, 'analytics.export', 'tenant.view_members'],
  data_analyst: [...VIEWER_BASE, 'analytics.export'],
  support: [...VIEWER_BASE],
  viewer: [...VIEWER_BASE],
};

const ORGANIZATION_ROLE_LABELS = new Set<string>(Object.keys(ORGANIZATION_ROLE_PERMISSIONS));

export function isOrganizationRole(value: string): value is OrganizationRole {
  return ORGANIZATION_ROLE_LABELS.has(value);
}

export function organizationPermissions(role: OrganizationRole | null): Set<Permission> {
  if (!role) return new Set<Permission>();
  return new Set<Permission>(ORGANIZATION_ROLE_PERMISSIONS[role]);
}
