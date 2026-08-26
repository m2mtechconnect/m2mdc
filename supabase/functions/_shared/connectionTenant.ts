/**
 * Tenant authority for the Connections control plane.
 *
 * The caller-scoped Supabase client is the only source of tenant and
 * organization-role authority. Service-role clients must never be used to
 * derive either value because they bypass RLS and have no caller auth.uid().
 *
 * Fail-closed invariant: a Connection is visible only when both tenant ids are
 * non-null and exactly equal. Null tenant is not a customer-facing global scope.
 */
type RpcResult = { data: unknown; error?: { message?: string } | null };
type CallerDb = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<RpcResult>;
};

export const CONNECTION_ADMIN_ROLES = ['owner', 'admin'] as const;
export const MANAGED_OPERATOR_ROLES = ['owner', 'admin', 'operator', 'engineer'] as const;
export const MANAGED_OPERATION_ROLES = ['owner', 'admin', 'operator', 'engineer', 'data_analyst'] as const;

export async function resolveCallerTenant(caller: CallerDb): Promise<string | null> {
  const { data, error } = await caller.rpc('active_org_id');
  if (error) return null;
  return typeof data === 'string' && data.length > 0 ? data : null;
}

export async function callerHasOrgRole(
  caller: CallerDb,
  userId: string,
  orgId: string,
  roles: readonly string[],
): Promise<boolean> {
  if (!userId || !orgId || roles.length === 0) return false;
  const { data, error } = await caller.rpc('org_has_role', {
    _org_id: orgId,
    _user_id: userId,
    _roles: [...roles],
  });
  return !error && data === true;
}

export async function resolveCallerOrgRoles(
  caller: CallerDb,
  userId: string,
  orgId: string,
  candidates: readonly string[],
): Promise<string[]> {
  if (!userId || !orgId) return [];
  const checks = await Promise.all(
    candidates.map(async (role) => ({
      role,
      allowed: await callerHasOrgRole(caller, userId, orgId, [role]),
    })),
  );
  return checks.filter((check) => check.allowed).map((check) => check.role);
}

export function tenantVisible(rowTenantId: string | null, callerTenantId: string | null): boolean {
  return Boolean(rowTenantId && callerTenantId && rowTenantId === callerTenantId);
}

export const TENANT_REQUIRED = {
  error_code: 'active_organization_required',
  safe_message: 'An active organization is required for this operation.',
};

export const TENANT_FORBIDDEN = {
  error_code: 'tenant_scope_violation',
  safe_message: 'This connection belongs to another organization.',
};
