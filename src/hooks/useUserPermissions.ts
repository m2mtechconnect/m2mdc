import { supabase } from '@/integrations/supabase/client';
import { useRBAC } from '@/contexts/RBACContext';
import type { AnyRole } from '@/auth/permissions';

export type UserRole = AnyRole;
export type Permission = 'view' | 'operate' | 'admin';

/**
 * DEPRECATED compatibility shim (B-01).
 *
 * This hook used to be a second, independent authorization system: its own
 * `user_roles` query, its own role vocabulary and its own expiry handling.
 * It now reads exclusively from the canonical `RBACContext`, so there is a
 * single resolution path. Prefer `useRBAC().can(permission)` in new code.
 */
export function useUserPermissions() {
  const { userId, loading, authorization, can } = useRBAC();

  const currentUser = userId ? ({ id: userId } as { id: string }) : null;
  const userRoles = authorization.grants.map((grant) => ({
    role: grant.role,
    scope: grant.scope,
    expires_at: grant.expiresAt,
  }));
  const isLoading = loading;

  /** Check if the caller holds a specific active role label. */
  const hasRole = (role: UserRole): boolean => authorization.roles.includes(role);

  /**
   * Check if user can access an agent with required permission
   * Uses RBAC helper function from database
   */
  const canAccessAgent = async (agentId: string, requiredPermission: Permission = 'view'): Promise<boolean> => {
    try {
      if (!currentUser) return false;

      // Use RBAC helper function
      const { data, error } = await supabase.rpc('user_can_access_agent', {
        check_user_id: currentUser.id,
        check_agent_id: agentId,
        required_permission: requiredPermission
      });

      if (error) {
        // Fail closed. A failed server-side authorization check must never be
        // downgraded to a client-side ownership guess.
        console.error('RBAC check error:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('canAccessAgent error:', error);
      return false;
    }
  };

  /**
   * Synchronous check if user can view an agent
   * Checks owner_id match OR has viewer/operator/admin role
   */
  const canViewAgent = (agentOwnerId: string): boolean => {
    if (!currentUser) return false;
    if (agentOwnerId === currentUser.id) return true;
    return can('agent.view');
  };

  /**
   * Synchronous check if user can operate an agent (start/stop/restart)
   * Requires operator or admin role (or ownership)
   */
  const canOperateAgent = (agentOwnerId: string): boolean => {
    if (!currentUser) return false;
    if (agentOwnerId === currentUser.id) return true;
    return can('agent.operate');
  };

  /**
   * Synchronous check if user can admin an agent (delete, manage permissions, etc.)
   * Requires admin role or ownership
   */
  const canAdminAgent = (agentOwnerId: string): boolean => {
    if (!currentUser) return false;
    if (agentOwnerId === currentUser.id) return true;
    return can('agent.administer');
  };

  /**
   * Check if user has global admin access
   */
  const isGlobalAdmin = (): boolean => can('authz.manage_assignments');

  /**
   * Get user's highest role level (for display purposes)
   */
  const getHighestRole = (): UserRole | null => authorization.primaryRole;

  return {
    userRoles,
    currentUser,
    isLoading,
    hasRole,
    canAccessAgent,
    canViewAgent,
    canOperateAgent,
    canAdminAgent,
    isGlobalAdmin: isGlobalAdmin(),
    highestRole: getHighestRole(),
    requiresManualSetup: !isLoading && userRoles.length === 0,
  };
}
