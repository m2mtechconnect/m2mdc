-- Add approval columns to profiles (columns may already exist from partial migration)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved_by uuid;

-- Drop existing restrictive SELECT policy and replace with one that also allows admin access
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view own or admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.check_user_has_role(auth.uid(), 'admin')
);

-- Allow admins to update any profile (for approval)
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.check_user_has_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.check_user_has_role(auth.uid(), 'admin')
);