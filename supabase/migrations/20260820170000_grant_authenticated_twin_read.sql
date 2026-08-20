-- The run-lifecycle boundary verifies facility ownership through the caller's
-- RLS-scoped client before using its trusted write client. Make the table-level
-- prerequisite explicit for clean replays; row visibility remains constrained
-- by the existing data_centre_twins SELECT policies.
GRANT SELECT ON public.data_centre_twins TO authenticated;
