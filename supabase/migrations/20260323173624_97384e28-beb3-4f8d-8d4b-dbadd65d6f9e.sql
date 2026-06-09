-- Drop the broken policy that references auth.users
DROP POLICY IF EXISTS "Users can view invites in their org" ON public.team_invites;

-- Create proper SELECT policy using profiles table instead of auth.users
CREATE POLICY "Users can view their sent or received invites"
ON public.team_invites
FOR SELECT
TO authenticated
USING (
  invited_by = auth.uid()
  OR email = (SELECT email FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);

-- Allow authenticated users to insert invites (they must be the inviter)
CREATE POLICY "Users can create invites"
ON public.team_invites
FOR INSERT
TO authenticated
WITH CHECK (invited_by = auth.uid());

-- Allow users to update invites they sent (e.g. revoke)
CREATE POLICY "Users can update their sent invites"
ON public.team_invites
FOR UPDATE
TO authenticated
USING (invited_by = auth.uid());

-- Allow users to delete invites they sent
CREATE POLICY "Users can delete their sent invites"
ON public.team_invites
FOR DELETE
TO authenticated
USING (invited_by = auth.uid());