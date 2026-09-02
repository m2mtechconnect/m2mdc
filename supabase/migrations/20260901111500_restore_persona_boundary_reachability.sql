-- RLS policies cannot authorize a request that lacks table-level reachability.
-- Persona onboarding reads these records before the trusted invitation boundary
-- performs any privileged write. Keep the grant read-only and let the existing
-- tenant/self policies decide which rows are visible.

BEGIN;

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.org_memberships TO authenticated;
GRANT SELECT ON public.organizations TO authenticated;

COMMENT ON TABLE public.org_memberships IS
  'Canonical organization membership authority. Authenticated reads remain tenant-scoped by RLS; writes use guarded member-management and invitation boundaries.';

COMMIT;
