-- Cross-persona simulation -> decision -> evidence handoff.
-- Additive RLS change: active organization members may read the shared run
-- and immutable decision evidence for their tenant. Write authority is not
-- expanded; canonical workspace writes continue through Edge Functions.

BEGIN;

DROP POLICY IF EXISTS "simulation_runs_select_own" ON public.simulation_runs;
DROP POLICY IF EXISTS "simulation_runs_select_admin" ON public.simulation_runs;
DROP POLICY IF EXISTS simulation_runs_org_read ON public.simulation_runs;
CREATE POLICY simulation_runs_org_read
  ON public.simulation_runs FOR SELECT TO authenticated
  USING (
    (
      tenant_id IS NOT NULL
      AND tenant_id = public.active_org_id()
      AND public.is_org_member(tenant_id, auth.uid())
    )
    OR (
      user_id = auth.uid()
      AND (tenant_id IS NULL OR tenant_id = user_id)
    )
  );

DROP POLICY IF EXISTS "decision_records_select_own" ON public.decision_records;
DROP POLICY IF EXISTS decision_records_org_read ON public.decision_records;
CREATE POLICY decision_records_org_read
  ON public.decision_records FOR SELECT TO authenticated
  USING (
    (
      tenant_id IS NOT NULL
      AND tenant_id = public.active_org_id()
      AND public.is_org_member(tenant_id, auth.uid())
    )
    OR (
      user_id = auth.uid()
      AND (tenant_id IS NULL OR tenant_id = user_id)
    )
  );

COMMENT ON POLICY simulation_runs_org_read ON public.simulation_runs IS
  'Active organization members can read tenant runs for governed cross-persona handoff; active_org_id prevents cross-tenant reads.';
COMMENT ON POLICY decision_records_org_read ON public.decision_records IS
  'Active organization members can read append-only tenant decision evidence; write authority is unchanged.';

COMMIT;
