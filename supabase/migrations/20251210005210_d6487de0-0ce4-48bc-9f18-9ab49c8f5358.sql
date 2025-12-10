-- Fix infinite recursion in user_roles RLS policy
-- Drop the problematic policies and recreate with non-recursive logic

DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_read" ON public.user_roles;

-- Create a simple, non-recursive policy for reading user roles
CREATE POLICY "Users can read their own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);