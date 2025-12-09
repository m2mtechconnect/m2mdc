import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'operator' | 'viewer' | 'owner';
export type Permission = 'view' | 'operate' | 'admin';

/**
 * Hook to check user's roles and permissions
 * 
 * Uses the consolidated AOC RBAC system with scopes and expiration.
 * See docs/aoc/RBAC_SETUP.md for full documentation.
 */
export function useUserPermissions() {
  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: userRoles, isLoading } = useQuery({
    queryKey: ['user-roles', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];

      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', currentUser.id)
        .or('expires_at.is.null,expires_at.gt.now()'); // Only non-expired roles

      if (error) {
        console.warn('user_roles query error:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!currentUser,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false,
  });

  /**
   * Check if user has a specific role
   * For basic role checking without scope support
   */
  const hasRole = (role: UserRole): boolean => {
    if (!userRoles || userRoles.length === 0) return false;

    return userRoles.some((ur: any) => ur.role === role);
  };

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
        console.error('RBAC check error:', error);
        // Fallback: check if user owns the agent
        const { data: agent } = await supabase
          .from('agents')
          .select('owner_id')
          .eq('id', agentId)
          .maybeSingle();
        
        return agent?.owner_id === currentUser.id;
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
    
    // Owner can always view
    if (agentOwnerId === currentUser.id) return true;
    
    // Anyone with viewer/operator/admin role can view
    return hasRole('viewer') || hasRole('operator') || hasRole('admin');
  };

  /**
   * Synchronous check if user can operate an agent (start/stop/restart)
   * Requires operator or admin role (or ownership)
   */
  const canOperateAgent = (agentOwnerId: string): boolean => {
    if (!currentUser) return false;
    
    // Owner can always operate
    if (agentOwnerId === currentUser.id) return true;
    
    // Requires operator or admin role
    return hasRole('operator') || hasRole('admin');
  };

  /**
   * Synchronous check if user can admin an agent (delete, manage permissions, etc.)
   * Requires admin role or ownership
   */
  const canAdminAgent = (agentOwnerId: string): boolean => {
    if (!currentUser) return false;
    
    // Owner can always admin
    if (agentOwnerId === currentUser.id) return true;
    
    // Requires admin role
    return hasRole('admin');
  };

  /**
   * Check if user has global admin access
   */
  const isGlobalAdmin = (): boolean => {
    if (!userRoles) return false;
    return userRoles.some((ur: any) => 
      ur.role === 'admin' && 
      (ur.scope === 'global' || ur.scope === null) &&
      (ur.expires_at === null || new Date(ur.expires_at) > new Date())
    );
  };

  /**
   * Get user's highest role level (for display purposes)
   */
  const getHighestRole = (): UserRole | null => {
    if (!userRoles || userRoles.length === 0) return null;

    const roleHierarchy: Record<UserRole, number> = {
      admin: 4,
      operator: 3,
      viewer: 2,
      owner: 1,
    };

    return userRoles.reduce((highest: any, current: any) => {
      const currentLevel = roleHierarchy[current.role as UserRole] || 0;
      const highestLevel = highest ? (roleHierarchy[highest.role as UserRole] || 0) : 0;
      return currentLevel > highestLevel ? current : highest;
    }, null)?.role || null;
  };

  return {
    userRoles: userRoles || [],
    currentUser,
    isLoading,
    hasRole,
    canAccessAgent,
    canViewAgent,
    canOperateAgent,
    canAdminAgent,
    isGlobalAdmin: isGlobalAdmin(),
    highestRole: getHighestRole(),
    requiresManualSetup: !userRoles || userRoles.length === 0,
  };
}
