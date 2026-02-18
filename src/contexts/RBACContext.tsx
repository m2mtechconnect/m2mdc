import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

interface RBACContextType {
  role: AppRole | null;
  loading: boolean;
  hasAccess: (requiredRoles: AppRole[]) => boolean;
  userId: string | null;
}

const RBACContext = createContext<RBACContextType>({
  role: null,
  loading: true,
  hasAccess: () => false,
  userId: null,
});

export const useRBAC = () => useContext(RBACContext);

export const RBACProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<AppRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('Error fetching user:', userError);
          setLoading(false);
          return;
        }
        
        if (!user) {
          setLoading(false);
          return;
        }

        setUserId(user.id);

        // Fetch user role
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (rolesError) {
          console.error('Error fetching user roles:', rolesError);
        }

        if (userRoles) {
          setRole(userRoles.role as AppRole);
        } else {
          // Default role if no role assigned
          setRole('engineer');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Synchronously update user ID
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        setUserId(null);
        setRole(null);
      }
      
      // Defer async operations to avoid deadlock
      if (session?.user) {
        setTimeout(() => fetchUserRole(), 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasAccess = (requiredRoles: AppRole[]) => {
    if (!role) return false;
    return requiredRoles.includes(role);
  };

  return (
    <RBACContext.Provider value={{ role, loading, hasAccess, userId }}>
      {children}
    </RBACContext.Provider>
  );
};