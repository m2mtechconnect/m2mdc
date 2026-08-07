import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  EMPTY_AUTHORIZATION,
  resolveAuthorization,
  type AnyRole,
  type Permission,
  type ResolvedAuthorization,
} from '@/auth/permissions';

/**
 * Canonical authorization provider (B-01).
 *
 * This is the ONLY place the frontend resolves who the caller is and what they
 * may do. `useUserPermissions` is a thin deprecated shim over this context and
 * no longer issues its own `user_roles` query, so the two systems can no longer
 * disagree.
 *
 * Authority rules:
 *   - identity comes from `supabase.auth` (i.e. `auth.users`) only;
 *   - roles come from `public.user_roles`, which is read-own under RLS and
 *     writable only through audited SECURITY DEFINER RPCs;
 *   - `profiles` is never consulted for security-effective roles;
 *   - expired grants are dropped client-side AND server-side;
 *   - a failed lookup is an error state, never a silent downgrade.
 */
export type AppRole = AnyRole;
export type { Permission } from '@/auth/permissions';

/**
 * Explicit authorization resolution state. Replaces the ambiguous
 * boolean-only isInternal flag so that a failed lookup can no longer be
 * conflated with a successful "no role row" (pilot) result.
 */
export type RoleResolution =
  | { status: 'loading' }
  | { status: 'internal'; role: AppRole }
  | { status: 'pilot' }
  | { status: 'error'; error: unknown };

interface RBACContextType {
  role: AppRole | null;
  loading: boolean;
  hasAccess: (requiredRoles: AppRole[]) => boolean;
  userId: string | null;
  isInternal: boolean;
  resolution: RoleResolution;
  retry: () => void;
  /** Every active role label held by the caller. */
  roles: AppRole[];
  /** Union of permissions granted by active global grants. */
  permissions: Permission[];
  /** Permission-based gate. Prefer this over role-label comparisons. */
  can: (permission: Permission) => boolean;
  /** Full resolution detail, including grants that could not be mapped. */
  authorization: ResolvedAuthorization;
}

const RBACContext = createContext<RBACContextType>({
  role: null,
  loading: true,
  hasAccess: () => false,
  userId: null,
  isInternal: false,
  resolution: { status: 'loading' },
  retry: () => {},
  roles: [],
  permissions: [],
  can: () => false,
  authorization: EMPTY_AUTHORIZATION,
});

export const useRBAC = () => useContext(RBACContext);

export const RBACProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [resolution, setResolution] = useState<RoleResolution>({ status: 'loading' });
  const [retryTick, setRetryTick] = useState(0);
  const [authorization, setAuthorization] = useState<ResolvedAuthorization>(EMPTY_AUTHORIZATION);

  const retry = useCallback(() => {
    setResolution({ status: 'loading' });
    setRetryTick((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchUserRole = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) {
          if (!cancelled) setResolution({ status: 'error', error: userError });
          return;
        }

        if (!user) {
          if (!cancelled) {
            setUserId(null);
            setAuthorization(EMPTY_AUTHORIZATION);
            setResolution({ status: 'loading' });
          }
          return;
        }

        if (!cancelled) setUserId(user.id);

        // Read ALL grants, not just the first row: a caller may legitimately
        // hold several, and truncating to one silently discarded authority.
        const { data: roleRows, error: rolesError } = await supabase
          .from('user_roles')
          .select('role, scope, expires_at')
          .eq('user_id', user.id);

        if (rolesError) {
          // Lookup FAILURE is distinct from "no row". Do NOT silently
          // downgrade to pilot — surface an authorization-error state.
          console.error('Error fetching user roles:', rolesError);
          if (!cancelled) {
            setAuthorization(EMPTY_AUTHORIZATION);
            setResolution({ status: 'error', error: rolesError });
          }
          return;
        }

        const resolved = resolveAuthorization(roleRows ?? []);

        if (resolved.unmapped.length > 0) {
          // Report, never guess: an unrecognised label grants nothing.
          console.error('Unmapped authorization labels ignored:', resolved.unmapped);
        }

        if (!cancelled) {
          setAuthorization(resolved);
          if (resolved.primaryRole) {
            setResolution({ status: 'internal', role: resolved.primaryRole });
          } else {
            setResolution({ status: 'pilot' });
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        if (!cancelled) {
          setAuthorization(EMPTY_AUTHORIZATION);
          setResolution({ status: 'error', error });
        }
      }
    };

    fetchUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        setResolution({ status: 'loading' });
        setTimeout(() => fetchUserRole(), 0);
      } else {
        setUserId(null);
        setAuthorization(EMPTY_AUTHORIZATION);
        setResolution({ status: 'loading' });
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [retryTick]);

  const role: AppRole | null =
    resolution.status === 'internal' ? resolution.role : null;
  const isInternal = resolution.status === 'internal';
  const loading = resolution.status === 'loading';

  const hasAccess = (requiredRoles: AppRole[]) => {
    if (authorization.roles.length === 0) return false;
    return requiredRoles.some((required) => authorization.roles.includes(required));
  };

  const can = (permission: Permission) => authorization.permissions.has(permission);

  return (
    <RBACContext.Provider
      value={{
        role,
        loading,
        hasAccess,
        userId,
        isInternal,
        resolution,
        retry,
        roles: authorization.roles,
        permissions: Array.from(authorization.permissions),
        can,
        authorization,
      }}
    >
      {children}
    </RBACContext.Provider>
  );
};