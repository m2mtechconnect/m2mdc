/**
 * Tenant scoping for the Connections control plane.
 *
 * Edge functions use the service-role client, which bypasses RLS, so every
 * connection read or write must be re-checked against the caller's tenant.
 * The rule mirrors the database policies exactly: a connection with a null
 * tenant is platform-scope and visible to callers who themselves have no
 * tenant; otherwise the tenant must match the caller's organisation.
 */
type Db = { from: (table: string) => any };

export async function resolveCallerTenant(admin: Db, userId: string): Promise<string | null> {
  const { data } = await admin
    .from('profiles')
    .select('org_id')
    .eq('user_id', userId)
    .maybeSingle();
  return (data?.org_id as string | null) ?? null;
}

export function tenantVisible(rowTenantId: string | null, callerTenantId: string | null): boolean {
  if (rowTenantId === null) return callerTenantId === null;
  return rowTenantId === callerTenantId;
}

export const TENANT_FORBIDDEN = {
  error_code: 'tenant_scope_violation',
  safe_message: 'This connection belongs to another tenant.',
};
