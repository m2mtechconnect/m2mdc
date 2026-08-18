-- Prefer the JWT's verified email claim over a SECURITY DEFINER helper: the
-- claim is signed by the auth server, needs no elevated function, and keeps
-- the exposed API surface smaller.
DROP POLICY IF EXISTS "Users can view their sent or received invites" ON public.team_invites;

CREATE POLICY "Users can view their sent or received invites"
ON public.team_invites
FOR SELECT
TO authenticated
USING (
  invited_by = (select auth.uid())
  OR lower(email) = lower((select auth.jwt() ->> 'email'))
);

DROP FUNCTION IF EXISTS public.current_auth_email();