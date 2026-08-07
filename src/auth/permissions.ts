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

/**
 * Authoritative role -> permission matrix.
 * Every label in the `app_role` enum is mapped explicitly; there is no
 * implicit fallthrough, so an unmapped label grants nothing.
 */
export const ROLE_PERMISSIONS: Record<AnyRole, readonly Permission[]> = {
  // --- platform roles ---
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
  // --- tenant roles ---
  owner: [...ADMIN_BASE],
  operator: [...OPERATOR_BASE],
  viewer: [...VIEWER_BASE],
};

/**
 * Precedence used only to derive a single display label and to satisfy legacy
 * call sites that still ask "what is my role?". Authorization decisions must
 * use permissions, not this ordering.
 */
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

/**
 * A single active grant, as stored server-side. `scope` is `'global'` or a
 * resource-qualified string such as `agent:<uuid>`.
 */
export interface RoleGrant {
  role: AnyRole;
  scope: string | null;
  expiresAt: string | null;
}

/** A grant is only active while unexpired. Revoked grants are deleted rows. */
export function isGrantActive(grant: RoleGrant, now: Date = new Date()): boolean {
  if (!grant.expiresAt) return true;
  const expiry = new Date(grant.expiresAt);
  return Number.isFinite(expiry.getTime()) && expiry > now;
}

export interface ResolvedAuthorization {
  /** Active, recognised grants only. */
  grants: RoleGrant[];
  /** Distinct active role labels. */
  roles: AnyRole[];
  /** Highest-precedence active role, for display and legacy call sites. */
  primaryRole: AnyRole | null;
  /** Union of permissions across all active global grants. */
  permissions: Set<Permission>;
  /** Grants that could not be mapped to the canonical model. */
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
 * Scope-qualified grants (e.g. `agent:<uuid>`) intentionally do NOT contribute
 * to the global permission set; resource-level checks are answered server-side
 * by `user_can_access_agent`.
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

  const roles = Array.from(new Set(grants.map((g) => g.role)));
  const primaryRole = ROLE_PRECEDENCE.find((r) => roles.includes(r)) ?? null;

  const permissions = new Set<Permission>();
  for (const grant of grants) {
    const global = grant.scope === null || grant.scope === 'global';
    if (!global) continue;
    for (const permission of ROLE_PERMISSIONS[grant.role]) permissions.add(permission);
  }

  // Any recognised, active, global grant admits the internal shell.
  if (grants.some((g) => g.scope === null || g.scope === 'global')) {
    permissions.add('platform.access_internal_shell');
  }

  return { grants, roles, primaryRole, permissions, unmapped };
}