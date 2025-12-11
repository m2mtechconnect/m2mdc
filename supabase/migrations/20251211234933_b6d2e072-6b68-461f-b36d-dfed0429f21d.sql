-- Fix infinite recursion in user_roles RLS policies
-- The issue is that check_user_has_role and the admin_manage policy 
-- query user_roles while being policies ON user_roles

-- Drop all existing policies on user_roles
DROP POLICY IF EXISTS "user_roles_admin_manage" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read their own role" ON public.user_roles;

-- Create simple non-recursive policies
-- Users can always read their own role (no recursion)
CREATE POLICY "user_roles_read_own" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own role on signup
CREATE POLICY "user_roles_insert_own" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own role
CREATE POLICY "user_roles_update_own" 
ON public.user_roles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own role
CREATE POLICY "user_roles_delete_own" 
ON public.user_roles 
FOR DELETE 
USING (auth.uid() = user_id);