import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 
  | 'executive' 
  | 'manager' 
  | 'engineer' 
  | 'security_admin'
  | 'compliance' 
  | 'data_analyst' 
  | 'marketing' 
  | 'sales' 
  | 'support' 
  | 'finance';

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
}

const RBACContext = createContext<RBACContextType>({
  role: null,
  loading: true,
  hasAccess: () => false,
  userId: null,
  isInternal: false,
  resolution: { status: 'loading' },
  retry: () => {},
});

export const useRBAC = () => useContext(RBACContext);

export const RBACProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [resolution, setResolution] = useState<RoleResolution>({ status: 'loading' });
  const [retryTick, setRetryTick] = useState(0);

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
            setResolution({ status: 'loading' });
          }
          return;
        }

        if (!cancelled) setUserId(user.id);

        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (rolesError) {
          // Lookup FAILURE is distinct from "no row". Do NOT silently
          // downgrade to pilot — surface an authorization-error state.
          console.error('Error fetching user roles:', rolesError);
          if (!cancelled) setResolution({ status: 'error', error: rolesError });
          return;
        }

        if (!cancelled) {
          if (userRoles) {
            setResolution({ status: 'internal', role: userRoles.role as AppRole });
          } else {
            setResolution({ status: 'pilot' });
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        if (!cancelled) setResolution({ status: 'error', error });
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
    if (!role) return false;
    return requiredRoles.includes(role);
  };

  return (
    <RBACContext.Provider value={{ role, loading, hasAccess, userId, isInternal, resolution, retry }}>
      {children}
    </RBACContext.Provider>
  );
};