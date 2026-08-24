/**
 * AURA DC — Canonical authorization model (B-01).
 *
 * This module is the single authoritative source for authorization vocabulary
 * in the frontend. It exists to retire the duplicate systems that previously
 * disagreed with each other:
 *
 *   1. `RBACContext` — read one `user_roles` row, treated the enum label as
 *      the whole authorization answer.
 *   2. `useUserPermissions` — ran a second, independent `user_roles` query with
 *      a different role vocabulary (`admin|operator|viewer|owner`) and its own
 *      expiry logic.
 *
 * Rules encoded here:
 *   - `auth.users` is the identity source. Nothing else establishes identity.
 *   - `profiles` is NON-AUTHORITATIVE. It may carry approval workflow state,
 *     but it must never be read as a source of security-effective roles.
 *   - Platform roles and tenant roles are separate vocabularies.
 *   - Protected operations are gated on PERMISSIONS, not on role labels.
 *   - Expired / revoked grants confer nothing.
 *   - Client-supplied roles, tenant ids and user metadata confer nothing.
 *     Every value here is derived from server-evaluated, RLS-protected rows.
 *
 * The frontend permission set is a convenience mirror for rendering. It is NOT
 * a security boundary: the database (RLS + audited SECURITY DEFINER RPCs) is.
 */

/** Platform-wide roles. Govern the product surface a user is admitted to. */
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

/** Tenant-scoped roles. Govern what may be done inside one organization. */
export type TenantRole = 'owner' | 'operator' | 'viewer';

/** Every role label persisted in `public.user_roles.role` (`app_role` enum). */
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

/**
 * Permissions are the only thing UI code should branch on.
 * Adding a role must never require touching a component.
 */
export type Permission =
  | 'platform.access_internal_shell'
  | 'platform.view_admin_console'
  | 'platform.manage_customers'
  | 'authz.view_assignments'
  | 'authz.manage_assignments'
  | 'tenant.view_members'
  | 'tenant.manage_members'
  | 'twin.view'
  | 'twin.edit'
  | 'twin.delete'
  | 'agent.view'
  | 'agent.operate'
  | 'agent.administer'
  | 'deployment.view'
  | 'deployment.execute'
  | 'analytics.view'
  | 'analytics.export';

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
];

export const ROLE_PERMISSIONS: Record<AnyRole, readonly Permission[]> = {
  security_admin: [...ADMIN_BASE],
  admin: [...ADMIN_BASE],
  executive: [...VIEWER_BASE, 'analytics.export', 'tenant.view_members'],
  manager: [...OPERATOR_BASE, 'tenant.view_members'],
  engineer: [...OPERATOR_BASE],
  compliance: [...VIEWER_BASE, 'analytics.export', 'authz.view_assignments'],
  data_analyst: [...VIEWER_BASE, 'analytics.export'],
  marketing: [...VIEWER_BASE],
  sales: [...VIEWER_BASE],
  support: [...VIEWER_BASE],
  finance: [...VIEWER_BASE, 'analytics.export'],
  owner: [...ADMIN_BASE, 'platform.manage_customers'],
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
  /** All active, recognised grants, including resource-scoped grants. */
  grants: RoleGrant[];
  /** Distinct active GLOBAL role labels only. */
  roles: AnyRole[];
  /** Highest-precedence active GLOBAL role, for display and legacy call sites. */
  primaryRole: AnyRole | null;
  /** Union of permissions across all active global grants. */
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

/**
 * Resolve raw `user_roles` rows into the canonical model.
 *
 * Resource-scoped grants remain available in `grants` for server-backed
 * resource checks, but they never contribute to global roles, primaryRole,
 * permissions, or internal-shell admission.
 */
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

  const globalGrants = grants.filter((grant) => grant.scope === null || grant.scope === 'global');
  const roles = Array.from(new Set(globalGrants.map((grant) => grant.role)));
  const primaryRole = ROLE_PRECEDENCE.find((role) => roles.includes(role)) ?? null;

  const permissions = new Set<Permission>();
  for (const grant of globalGrants) {
    for (const permission of ROLE_PERMISSIONS[grant.role]) permissions.add(permission);
  }

  if (globalGrants.length > 0) permissions.add('platform.access_internal_shell');

  return { grants, roles, primaryRole, permissions, unmapped };
}
