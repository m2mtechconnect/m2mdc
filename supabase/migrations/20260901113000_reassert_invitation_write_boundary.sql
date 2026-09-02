-- Reassert the invitation table's intended privilege boundary after replay.
-- Authenticated callers may inspect non-secret invitation metadata through RLS,
-- while token lookup and every write stay service-role-only.

BEGIN;

REVOKE ALL ON public.team_invites FROM PUBLIC, anon, authenticated;

GRANT SELECT (id, email, role, status, invited_by, org_id, expires_at, created_at)
  ON public.team_invites TO authenticated;
GRANT ALL ON public.team_invites TO service_role;

COMMENT ON TABLE public.team_invites IS
  'Organization invitations. Authenticated callers receive RLS-scoped non-secret metadata only; token lookup and writes are restricted to trusted invitation boundaries using service_role.';

COMMIT;
