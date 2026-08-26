/**
 * Server-authoritative active-organization bootstrap.
 *
 * The browser may never guess which organization is active. When the server
 * reports no active organization, one may be bootstrapped ONLY when membership
 * selection is unambiguous: exactly one membership total, or exactly one
 * membership flagged as default. Anything else fails closed - the caller must
 * surface a recovery state instead of silently picking a tenant.
 */

export interface MembershipCandidate {
  orgId: string;
  isDefault: boolean;
}

/**
 * Returns the single unambiguous membership eligible to become the active
 * organization, or null when selection would require a browser-side guess.
 */
export function selectUnambiguousMembership<T extends MembershipCandidate>(
  memberships: readonly T[],
): T | null {
  if (memberships.length === 1) return memberships[0];
  const defaults = memberships.filter((membership) => membership.isDefault);
  return defaults.length === 1 ? defaults[0] : null;
}
