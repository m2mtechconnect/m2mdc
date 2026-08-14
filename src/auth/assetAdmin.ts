/**
 * Single authority for "may operate asset validation / preview surfaces".
 *
 * Only `admin` and `owner` qualify. The role list is the canonical
 * `app_role` enum, so no ad-hoc labels are accepted here.
 */
import type { AppRole } from '@/contexts/RBACContext';

const ASSET_ADMIN_ROLES: readonly string[] = ['admin', 'owner'];

export function isAssetAdmin(
  role: AppRole | null | undefined,
  roles: readonly (AppRole | string)[] = [],
): boolean {
  return [role, ...roles].some((r) => !!r && ASSET_ADMIN_ROLES.includes(r as string));
}
