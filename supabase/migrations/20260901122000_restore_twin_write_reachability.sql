-- RLS already defines the tenant and role rules for twin creation, editing and
-- deletion. Restore the table privileges required for those policies to be
-- reachable after exact-head replay.

BEGIN;

GRANT INSERT, UPDATE, DELETE ON public.data_centre_twins TO authenticated;

COMMENT ON TABLE public.data_centre_twins IS
  'Organization-bound data-centre twins. Authenticated writes are reachable only through the existing tenant- and role-scoped RLS policies.';

COMMIT;
