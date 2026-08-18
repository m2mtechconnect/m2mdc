-- ============================================================================
-- team_invites authority hardening
-- 1. Reachability: the table had NO privileges granted, so every client read
--    failed regardless of policy. Grant a minimal, column-scoped read.
-- 2. Identity: recipient matching moved off the mirrored profiles.email onto
--    the verified auth.users email, normalised case-insensitively.
-- 3. Write boundary: invite creation/revocation is server-only (edge function
--    running as service_role, after an authority check). No client writes.
-- ============================================================================

-- Verified caller identity, sourced from auth.users (not a mirror table).
CREATE OR REPLACE FUNCTION public.current_auth_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
  SELECT lower(u.email) FROM auth.users u WHERE u.id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.current_auth_email() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_auth_email() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_auth_email() TO authenticated;

COMMENT ON FUNCTION public.current_auth_email() IS
  'Returns the authenticated caller''s verified, lower-cased auth.users email. Used by team_invites RLS so recipient matching never depends on the user-facing profiles.email mirror.';

-- Replace the profiles-mirror policy with verified-identity matching.
DROP POLICY IF EXISTS "Users can view their sent or received invites" ON public.team_invites;
DROP POLICY IF EXISTS "Users can view invites in their org" ON public.team_invites;

CREATE POLICY "Users can view their sent or received invites"
ON public.team_invites
FOR SELECT
TO authenticated
USING (
  invited_by = (select auth.uid())
  OR lower(email) = public.current_auth_email()
);

-- Client-side writes are retired: an invite mints a role-bearing token, so it
-- must not be creatable or editable by an ordinary authenticated caller.
DROP POLICY IF EXISTS "Users can create invites" ON public.team_invites;
DROP POLICY IF EXISTS "Users can update their sent invites" ON public.team_invites;
DROP POLICY IF EXISTS "Users can delete their sent invites" ON public.team_invites;

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Column-scoped read: the acceptance token is never exposed to the Data API.
REVOKE ALL ON public.team_invites FROM PUBLIC;
REVOKE ALL ON public.team_invites FROM anon;
REVOKE ALL ON public.team_invites FROM authenticated;

GRANT SELECT (id, email, role, status, invited_by, expires_at, created_at)
  ON public.team_invites TO authenticated;
GRANT ALL ON public.team_invites TO service_role;

COMMENT ON TABLE public.team_invites IS
  'Team invitations. Read-only over the Data API (token column withheld); all writes go through the teams-invite edge function, which verifies the caller holds admin or owner before minting an invite.';