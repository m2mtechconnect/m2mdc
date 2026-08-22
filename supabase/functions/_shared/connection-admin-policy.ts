export const CONNECTION_ADMIN_ROLES = ['security_admin', 'admin', 'owner'] as const;

export interface ConnectionRoleGrant {
  role?: string | null;
  scope?: string | null;
  expires_at?: string | null;
}

/**
 * Server-side Connections authorization mirror for platform administrators.
 * The browser is never trusted for this decision. Grants must be recognised,
 * global and unexpired. This matches the canonical frontend AI-provider
 * configuration boundary without broadening tenant/resource-scoped grants.
 */
export function hasConnectionAdminAuthority(
  grants: readonly ConnectionRoleGrant[],
  now: Date = new Date(),
): boolean {
  const timestamp = now.getTime();
  return grants.some((grant) => {
    if (!(CONNECTION_ADMIN_ROLES as readonly string[]).includes(grant.role ?? '')) return false;
    if (grant.scope !== null && grant.scope !== undefined && grant.scope !== 'global') return false;
    if (!grant.expires_at) return true;
    const expiry = new Date(grant.expires_at).getTime();
    return Number.isFinite(expiry) && expiry > timestamp;
  });
}
