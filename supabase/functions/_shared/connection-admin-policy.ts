export const CONNECTION_ADMIN_ROLES = ['admin', 'owner'] as const;

export interface ConnectionRoleGrant {
  role?: string | null;
  scope?: string | null;
  expires_at?: string | null;
}

/**
 * Generic Connections administration preserves the pre-existing admin/owner
 * boundary. AI-specific roles must not gain blanket authority over unrelated
 * connector provisioning, credentials or health checks.
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
