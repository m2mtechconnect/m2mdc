/**
 * AURA DC — Canonical authorization model (B-01).
 *
 * Identity comes from auth.users; security-effective roles come only from
 * public.user_roles; protected UI operations branch on permissions rather than
 * role labels. Backend/RLS remains the security boundary.
 */

export type PlatformRole =
  | 'security_admin'
  | 'admin'
  | 'executive'
  | 'manager'
  | 'engineer'
  | 'compliance'
  | 'data_analyst'
  | 'marketing'
  | 'sales'
  | 'support'
  | 'finance';

export type TenantRole = 'owner' | 'operator' | 'viewer';
export type AnyRole = PlatformRole | TenantRole;

export const PLATFORM_ROLES: readonly PlatformRole[] = [
  'security_admin',
  'admin',
  'executive',
  'manager',
  'engineer',
  'compliance',
  'data_analyst',
  'marketing',
  'sales',
  'support',
  'finance',
] as const;

export const TENANT_ROLES: readonly TenantRole[] = ['owner', 'operator', 'viewer'] as const;

export function isPlatformRole(value: string): value is PlatformRole {
  return (PLATFORM_ROLES as readonly string[]).includes(value);
}

export function isTenantRole(value: string): value is TenantRole {
  return (TENANT_ROLES as readonly string[]).includes(value);
}

export type Permission =
  // platform surface
  | 'platform.access_internal_shell'
  | 'platform.view_admin_console'
  // authorization administration
  | 'authz.view_assignments'
  | 'authz.manage_assignments'
  // tenant / organization
  | 'tenant.view_members'
  | 'tenant.manage_members'
  // digital twin + operations
  | 'twin.view'
  | 'twin.edit'
  | 'twin.delete'
  | 'agent.view'
  | 'agent.operate'
  | 'agent.administer'
  | 'deployment.view'
  | 'deployment.execute'
  // analytics / reporting
  | 'analytics.view'
  | 'analytics.export'
  // AI provider/model administration
  | 'ai.model.test'
  | 'ai.model.configure';

const VIEWER_BASE: Permission[] = ['twin.view', 'agent.view', 'deployment.view', 'analytics.view'];

const OPERATOR_BASE: Permission[] = [
  ...VIEWER_BASE,
  'twin.edit',
  'agent.operate',
  'deployment.execute',
  'analytics.export',
];

const ADMIN_BASE: Permission[] = [
  ...OPERATOR_BASE,
  'twin.delete',
  'agent.administer',
  'platform.view_admin_console',
  'authz.view_assignments',
  'authz.manage_assignments',
  'tenant.view_members',
  'tenant.manage_members',
  'ai.model.test',
  'ai.model.configure',
];

export const ROLE_PERMISSIONS: Record<AnyRole, readonly Permission[]> = {
  security_admin: [...ADMIN_BASE],
  admin: [...ADMIN_BASE],
  executive: [...VIEWER_BASE, 'analytics.export', 'tenant.view_members', 'ai.model.test'],
  manager: [...OPERATOR_BASE, 'tenant.view_members'],
  engineer: [...OPERATOR_BASE, 'ai.model.test'],
  compliance: [...VIEWER_BASE, 'analytics.export', 'authz.view_assignments'],
  data_analyst: [...VIEWER_BASE, 'analytics.export'],
  marketing: [...VIEWER_BASE],
  sales: [...VIEWER_BASE],
  support: [...VIEWER_BASE],
  finance: [...VIEWER_BASE, 'analytics.export'],
  owner: [...ADMIN_BASE],
  operator: [...OPERATOR_BASE],
  viewer: [...VIEWER_BASE],
};

const ROLE_PRECEDENCE: AnyRole[] = [
  'security_admin',
  'admin',
  'owner',
  'executive',
  'manager',
  'compliance',
  'engineer',
  'operator',
  'data_analyst',
  'finance',
  'marketing',
  'sales',
  'support',
  'viewer',
];

export interface RoleGrant {
  role: AnyRole;
  scope: string | null;
  expiresAt: string | null;
}

export function isGrantActive(grant: RoleGrant, now: Date = new Date()): boolean {
  if (!grant.expiresAt) return true;
  const expiry = new Date(grant.expiresAt);
  return Number.isFinite(expiry.getTime()) && expiry > now;
}

export interface ResolvedAuthorization {
  grants: RoleGrant[];
  roles: AnyRole[];
  primaryRole: AnyRole | null;
  permissions: Set<Permission>;
  unmapped: string[];
}

export const EMPTY_AUTHORIZATION: ResolvedAuthorization = {
  grants: [],
  roles: [],
  primaryRole: null,
  permissions: new Set<Permission>(),
  unmapped: [],
};

export function resolveAuthorization(
  rows: Array<{ role: string | null; scope?: string | null; expires_at?: string | null }>,
  now: Date = new Date(),
): ResolvedAuthorization {
  const grants: RoleGrant[] = [];
  const unmapped: string[] = [];

  for (const row of rows) {
    const label = (row.role ?? '').trim();
    if (!label) continue;
    if (!isPlatformRole(label) && !isTenantRole(label)) {
      unmapped.push(label);
      continue;
    }
    const grant: RoleGrant = {
      role: label,
      scope: row.scope ?? 'global',
      expiresAt: row.expires_at ?? null,
    };
    if (isGrantActive(grant, now)) grants.push(grant);
  }

  const roles = Array.from(new Set(grants.map((grant) => grant.role)));
  const primaryRole = ROLE_PRECEDENCE.find((role) => roles.includes(role)) ?? null;

  const permissions = new Set<Permission>();
  for (const grant of grants) {
    const global = grant.scope === null || grant.scope === 'global';
    if (!global) continue;
    for (const permission of ROLE_PERMISSIONS[grant.role]) permissions.add(permission);
  }

  if (grants.some((grant) => grant.scope === null || grant.scope === 'global')) {
    permissions.add('platform.access_internal_shell');
  }

  return { grants, roles, primaryRole, permissions, unmapped };
}
