-- AURA enterprise tenancy Phase 3: core resource ownership and collaborative RLS.
-- Stacked on the membership + org-bound onboarding phases.

BEGIN;

ALTER TABLE public.data_centre_twins
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.digital_twins
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.sovereign_dc_facilities
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_data_centre_twins_org_id ON public.data_centre_twins(org_id);
CREATE INDEX IF NOT EXISTS idx_digital_twins_org_id ON public.digital_twins(org_id);
CREATE INDEX IF NOT EXISTS idx_sovereign_dc_facilities_org_id ON public.sovereign_dc_facilities(org_id);

-- Existing resources inherit the organization currently associated with their
-- legacy owner. Rows whose owner has no organization remain owner-only until a
-- later data-quality pass assigns them explicitly.
UPDATE public.data_centre_twins t
SET org_id = COALESCE(p.last_active_org_id, p.org_id)
FROM public.profiles p
WHERE t.org_id IS NULL
  AND p.user_id = t.created_by_user
  AND COALESCE(p.last_active_org_id, p.org_id) IS NOT NULL;

UPDATE public.digital_twins t
SET org_id = COALESCE(p.last_active_org_id, p.org_id)
FROM public.profiles p
WHERE t.org_id IS NULL
  AND p.user_id = t.user_id
  AND COALESCE(p.last_active_org_id, p.org_id) IS NOT NULL;

UPDATE public.sovereign_dc_facilities f
SET org_id = COALESCE(p.last_active_org_id, p.org_id)
FROM public.profiles p
WHERE f.org_id IS NULL
  AND p.user_id = f.owner_id
  AND COALESCE(p.last_active_org_id, p.org_id) IS NOT NULL;

-- Existing application inserts do not yet send org_id. Stamp them from the
-- membership-backed active tenant. Privileged/service inserts must state org_id
-- explicitly because auth.uid() is absent in that execution context.
CREATE OR REPLACE FUNCTION public.stamp_active_org_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    IF NEW.org_id IS NULL THEN
      RAISE EXCEPTION 'org_id is required for privileged resource inserts';
    END IF;
    RETURN NEW;
  END IF;

  v_org_id := public.active_org_id();
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'active organization is required';
  END IF;

  IF NEW.org_id IS NULL THEN
    NEW.org_id := v_org_id;
  ELSIF NEW.org_id IS DISTINCT FROM v_org_id THEN
    RAISE EXCEPTION 'resource organization must match the active organization';
  END IF;

  IF NOT public.is_org_member(NEW.org_id, auth.uid()) THEN
    RAISE EXCEPTION 'organization membership required';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_org_id_reassignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND OLD.org_id IS DISTINCT FROM NEW.org_id THEN
    RAISE EXCEPTION 'organization ownership cannot be reassigned by a user request';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.stamp_active_org_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_org_id_reassignment() FROM PUBLIC;

DROP TRIGGER IF EXISTS data_centre_twins_stamp_org ON public.data_centre_twins;
CREATE TRIGGER data_centre_twins_stamp_org
BEFORE INSERT ON public.data_centre_twins
FOR EACH ROW EXECUTE FUNCTION public.stamp_active_org_id();
DROP TRIGGER IF EXISTS data_centre_twins_lock_org ON public.data_centre_twins;
CREATE TRIGGER data_centre_twins_lock_org
BEFORE UPDATE ON public.data_centre_twins
FOR EACH ROW EXECUTE FUNCTION public.prevent_org_id_reassignment();

DROP TRIGGER IF EXISTS digital_twins_stamp_org ON public.digital_twins;
CREATE TRIGGER digital_twins_stamp_org
BEFORE INSERT ON public.digital_twins
FOR EACH ROW EXECUTE FUNCTION public.stamp_active_org_id();
DROP TRIGGER IF EXISTS digital_twins_lock_org ON public.digital_twins;
CREATE TRIGGER digital_twins_lock_org
BEFORE UPDATE ON public.digital_twins
FOR EACH ROW EXECUTE FUNCTION public.prevent_org_id_reassignment();

DROP TRIGGER IF EXISTS sovereign_dc_facilities_stamp_org ON public.sovereign_dc_facilities;
CREATE TRIGGER sovereign_dc_facilities_stamp_org
BEFORE INSERT ON public.sovereign_dc_facilities
FOR EACH ROW EXECUTE FUNCTION public.stamp_active_org_id();
DROP TRIGGER IF EXISTS sovereign_dc_facilities_lock_org ON public.sovereign_dc_facilities;
CREATE TRIGGER sovereign_dc_facilities_lock_org
BEFORE UPDATE ON public.sovereign_dc_facilities
FOR EACH ROW EXECUTE FUNCTION public.prevent_org_id_reassignment();

-- Move the Connections plane to the same membership-backed tenant resolver.
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT public.active_org_id()
$$;

REVOKE ALL ON FUNCTION public.current_tenant_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO authenticated, service_role;

-- Remove the cross-customer global-admin bypass. Platform support access will
-- be reintroduced later only as an audited break-glass capability.
DROP POLICY IF EXISTS "Admins can view all twins" ON public.data_centre_twins;

-- ---------------------------------------------------------------------------
-- Legacy owner policies become fallback-only. PostgreSQL ORs permissive RLS
-- policies; leaving these broad would let a former creator bypass organization
-- membership after a row was tenant-owned.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their own twins" ON public.data_centre_twins;
CREATE POLICY "Users can view their own twins"
  ON public.data_centre_twins FOR SELECT TO authenticated
  USING (org_id IS NULL AND auth.uid() = created_by_user);
DROP POLICY IF EXISTS "Users can create their own twins" ON public.data_centre_twins;
CREATE POLICY "Users can create their own twins"
  ON public.data_centre_twins FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by_user
    AND org_id = public.active_org_id()
    AND public.is_org_member(org_id, auth.uid())
  );
DROP POLICY IF EXISTS "Users can update their own twins" ON public.data_centre_twins;
CREATE POLICY "Users can update their own twins"
  ON public.data_centre_twins FOR UPDATE TO authenticated
  USING (org_id IS NULL AND auth.uid() = created_by_user)
  WITH CHECK (org_id IS NULL AND auth.uid() = created_by_user);
DROP POLICY IF EXISTS "Users can delete their own twins" ON public.data_centre_twins;
CREATE POLICY "Users can delete their own twins"
  ON public.data_centre_twins FOR DELETE TO authenticated
  USING (org_id IS NULL AND auth.uid() = created_by_user);

DROP POLICY IF EXISTS "Users can view their own digital twins" ON public.digital_twins;
CREATE POLICY "Users can view their own digital twins"
  ON public.digital_twins FOR SELECT TO authenticated
  USING (org_id IS NULL AND auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their own digital twins" ON public.digital_twins;
CREATE POLICY "Users can create their own digital twins"
  ON public.digital_twins FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND org_id = public.active_org_id()
    AND public.is_org_member(org_id, auth.uid())
  );
DROP POLICY IF EXISTS "Users can update their own digital twins" ON public.digital_twins;
CREATE POLICY "Users can update their own digital twins"
  ON public.digital_twins FOR UPDATE TO authenticated
  USING (org_id IS NULL AND auth.uid() = user_id)
  WITH CHECK (org_id IS NULL AND auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own digital twins" ON public.digital_twins;
CREATE POLICY "Users can delete their own digital twins"
  ON public.digital_twins FOR DELETE TO authenticated
  USING (org_id IS NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own facilities" ON public.sovereign_dc_facilities;
CREATE POLICY "Users can view their own facilities"
  ON public.sovereign_dc_facilities FOR SELECT TO authenticated
  USING (org_id IS NULL AND auth.uid() = owner_id);
DROP POLICY IF EXISTS "Users can create their own facilities" ON public.sovereign_dc_facilities;
CREATE POLICY "Users can create their own facilities"
  ON public.sovereign_dc_facilities FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
    AND org_id = public.active_org_id()
    AND public.is_org_member(org_id, auth.uid())
  );
DROP POLICY IF EXISTS "Users can update their own facilities" ON public.sovereign_dc_facilities;
CREATE POLICY "Users can update their own facilities"
  ON public.sovereign_dc_facilities FOR UPDATE TO authenticated
  USING (org_id IS NULL AND auth.uid() = owner_id)
  WITH CHECK (org_id IS NULL AND auth.uid() = owner_id);
DROP POLICY IF EXISTS "Users can delete their own facilities" ON public.sovereign_dc_facilities;
CREATE POLICY "Users can delete their own facilities"
  ON public.sovereign_dc_facilities FOR DELETE TO authenticated
  USING (org_id IS NULL AND auth.uid() = owner_id);

-- Parent resource collaboration policies.
DROP POLICY IF EXISTS data_centre_twins_org_read ON public.data_centre_twins;
CREATE POLICY data_centre_twins_org_read
  ON public.data_centre_twins FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id, auth.uid()));

DROP POLICY IF EXISTS data_centre_twins_org_update ON public.data_centre_twins;
CREATE POLICY data_centre_twins_org_update
  ON public.data_centre_twins FOR UPDATE TO authenticated
  USING (public.org_has_role(org_id, auth.uid(), ARRAY['owner','admin','operator','engineer','manager','executive']::text[]))
  WITH CHECK (public.org_has_role(org_id, auth.uid(), ARRAY['owner','admin','operator','engineer','manager','executive']::text[]));

DROP POLICY IF EXISTS data_centre_twins_org_delete ON public.data_centre_twins;
CREATE POLICY data_centre_twins_org_delete
  ON public.data_centre_twins FOR DELETE TO authenticated
  USING (public.org_has_role(org_id, auth.uid(), ARRAY['owner','admin']::text[]));

DROP POLICY IF EXISTS digital_twins_org_read ON public.digital_twins;
CREATE POLICY digital_twins_org_read
  ON public.digital_twins FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id, auth.uid()));

DROP POLICY IF EXISTS digital_twins_org_update ON public.digital_twins;
CREATE POLICY digital_twins_org_update
  ON public.digital_twins FOR UPDATE TO authenticated
  USING (public.org_has_role(org_id, auth.uid(), ARRAY['owner','admin','operator','engineer','manager','executive']::text[]))
  WITH CHECK (public.org_has_role(org_id, auth.uid(), ARRAY['owner','admin','operator','engineer','manager','executive']::text[]));

DROP POLICY IF EXISTS digital_twins_org_delete ON public.digital_twins;
CREATE POLICY digital_twins_org_delete
  ON public.digital_twins FOR DELETE TO authenticated
  USING (public.org_has_role(org_id, auth.uid(), ARRAY['owner','admin']::text[]));

DROP POLICY IF EXISTS sovereign_dc_facilities_org_read ON public.sovereign_dc_facilities;
CREATE POLICY sovereign_dc_facilities_org_read
  ON public.sovereign_dc_facilities FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id, auth.uid()));

DROP POLICY IF EXISTS sovereign_dc_facilities_org_update ON public.sovereign_dc_facilities;
CREATE POLICY sovereign_dc_facilities_org_update
  ON public.sovereign_dc_facilities FOR UPDATE TO authenticated
  USING (public.org_has_role(org_id, auth.uid(), ARRAY['owner','admin','operator','engineer','manager','executive']::text[]))
  WITH CHECK (public.org_has_role(org_id, auth.uid(), ARRAY['owner','admin','operator','engineer','manager','executive']::text[]));

DROP POLICY IF EXISTS sovereign_dc_facilities_org_delete ON public.sovereign_dc_facilities;
CREATE POLICY sovereign_dc_facilities_org_delete
  ON public.sovereign_dc_facilities FOR DELETE TO authenticated
  USING (public.org_has_role(org_id, auth.uid(), ARRAY['owner','admin']::text[]));

-- ---------------------------------------------------------------------------
-- Child/run resources: narrow legacy creator policies to unassigned parents,
-- then add tenant collaboration through the parent org_id.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their own digital twin runs" ON public.digital_twin_runs;
CREATE POLICY "Users can view their own digital twin runs"
  ON public.digital_twin_runs FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.digital_twins t
      WHERE t.id = digital_twin_runs.twin_id AND t.org_id IS NULL
    )
  );
DROP POLICY IF EXISTS "Users can create their own digital twin runs" ON public.digital_twin_runs;
CREATE POLICY "Users can create their own digital twin runs"
  ON public.digital_twin_runs FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.digital_twins t
      WHERE t.id = digital_twin_runs.twin_id AND t.org_id IS NULL
    )
  );
DROP POLICY IF EXISTS "Users can update their own digital twin runs" ON public.digital_twin_runs;
CREATE POLICY "Users can update their own digital twin runs"
  ON public.digital_twin_runs FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.digital_twins t
      WHERE t.id = digital_twin_runs.twin_id AND t.org_id IS NULL
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.digital_twins t
      WHERE t.id = digital_twin_runs.twin_id AND t.org_id IS NULL
    )
  );

DROP POLICY IF EXISTS "Users can create simulation runs" ON public.sovereign_dc_simulation_runs;
CREATE POLICY "Users can create simulation runs"
  ON public.sovereign_dc_simulation_runs FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.sovereign_dc_facilities f
      WHERE f.id = sovereign_dc_simulation_runs.facility_id AND f.org_id IS NULL
    )
  );
DROP POLICY IF EXISTS "Users can update their simulation runs" ON public.sovereign_dc_simulation_runs;
CREATE POLICY "Users can update their simulation runs"
  ON public.sovereign_dc_simulation_runs FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.sovereign_dc_facilities f
      WHERE f.id = sovereign_dc_simulation_runs.facility_id AND f.org_id IS NULL
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.sovereign_dc_facilities f
      WHERE f.id = sovereign_dc_simulation_runs.facility_id AND f.org_id IS NULL
    )
  );
DROP POLICY IF EXISTS "Users can view simulation runs for their facilities" ON public.sovereign_dc_simulation_runs;
CREATE POLICY "Users can view simulation runs for their facilities"
  ON public.sovereign_dc_simulation_runs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sovereign_dc_facilities f
      WHERE f.id = sovereign_dc_simulation_runs.facility_id
        AND f.org_id IS NULL
        AND (auth.uid() = sovereign_dc_simulation_runs.user_id OR f.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view telemetry for their twins" ON public.twin_telemetry;
CREATE POLICY "Users can view telemetry for their twins"
  ON public.twin_telemetry FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_telemetry.twin_id AND t.org_id IS NULL AND t.created_by_user = auth.uid()
  ));
DROP POLICY IF EXISTS "Users can insert telemetry for their twins" ON public.twin_telemetry;
CREATE POLICY "Users can insert telemetry for their twins"
  ON public.twin_telemetry FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_telemetry.twin_id AND t.org_id IS NULL AND t.created_by_user = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can view KPIs for their twins" ON public.twin_kpi_snapshots;
CREATE POLICY "Users can view KPIs for their twins"
  ON public.twin_kpi_snapshots FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_kpi_snapshots.twin_id AND t.org_id IS NULL AND t.created_by_user = auth.uid()
  ));
DROP POLICY IF EXISTS "Users can insert KPIs for their twins" ON public.twin_kpi_snapshots;
CREATE POLICY "Users can insert KPIs for their twins"
  ON public.twin_kpi_snapshots FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_kpi_snapshots.twin_id AND t.org_id IS NULL AND t.created_by_user = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can view simulations for their twins" ON public.twin_simulation_runs;
CREATE POLICY "Users can view simulations for their twins"
  ON public.twin_simulation_runs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_simulation_runs.twin_id AND t.org_id IS NULL AND t.created_by_user = auth.uid()
  ));
DROP POLICY IF EXISTS "Users can create simulations for their twins" ON public.twin_simulation_runs;
CREATE POLICY "Users can create simulations for their twins"
  ON public.twin_simulation_runs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_simulation_runs.twin_id AND t.org_id IS NULL AND t.created_by_user = auth.uid()
  ));
DROP POLICY IF EXISTS "Users can update simulations for their twins" ON public.twin_simulation_runs;
CREATE POLICY "Users can update simulations for their twins"
  ON public.twin_simulation_runs FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_simulation_runs.twin_id AND t.org_id IS NULL AND t.created_by_user = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_simulation_runs.twin_id AND t.org_id IS NULL AND t.created_by_user = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can view sovereignty events for their twins" ON public.twin_sovereignty_events;
CREATE POLICY "Users can view sovereignty events for their twins"
  ON public.twin_sovereignty_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_sovereignty_events.twin_id AND t.org_id IS NULL AND t.created_by_user = auth.uid()
  ));
DROP POLICY IF EXISTS "Users can insert sovereignty events for their twins" ON public.twin_sovereignty_events;
CREATE POLICY "Users can insert sovereignty events for their twins"
  ON public.twin_sovereignty_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_sovereignty_events.twin_id AND t.org_id IS NULL AND t.created_by_user = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can view carbon emissions for their twins" ON public.twin_carbon_emissions;
CREATE POLICY "Users can view carbon emissions for their twins"
  ON public.twin_carbon_emissions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_carbon_emissions.twin_id AND t.org_id IS NULL AND t.created_by_user = auth.uid()
  ));
DROP POLICY IF EXISTS "Users can insert carbon emissions for their twins" ON public.twin_carbon_emissions;
CREATE POLICY "Users can insert carbon emissions for their twins"
  ON public.twin_carbon_emissions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_carbon_emissions.twin_id AND t.org_id IS NULL AND t.created_by_user = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can view financial records for their twins" ON public.twin_financial_records;
CREATE POLICY "Users can view financial records for their twins"
  ON public.twin_financial_records FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_financial_records.twin_id AND t.org_id IS NULL AND t.created_by_user = auth.uid()
  ));
DROP POLICY IF EXISTS "Users can insert financial records for their twins" ON public.twin_financial_records;
CREATE POLICY "Users can insert financial records for their twins"
  ON public.twin_financial_records FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_financial_records.twin_id AND t.org_id IS NULL AND t.created_by_user = auth.uid()
  ));

-- Organization collaboration on child resources.
DROP POLICY IF EXISTS digital_twin_runs_org_read ON public.digital_twin_runs;
CREATE POLICY digital_twin_runs_org_read
  ON public.digital_twin_runs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.digital_twins t
    WHERE t.id = digital_twin_runs.twin_id
      AND t.org_id IS NOT NULL
      AND public.is_org_member(t.org_id, auth.uid())
  ));
DROP POLICY IF EXISTS digital_twin_runs_org_write ON public.digital_twin_runs;
CREATE POLICY digital_twin_runs_org_write
  ON public.digital_twin_runs FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.digital_twins t
    WHERE t.id = digital_twin_runs.twin_id
      AND public.org_has_role(t.org_id, auth.uid(), ARRAY['owner','admin','operator','engineer','manager','executive']::text[])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.digital_twins t
    WHERE t.id = digital_twin_runs.twin_id
      AND public.org_has_role(t.org_id, auth.uid(), ARRAY['owner','admin','operator','engineer','manager','executive']::text[])
  ));

DROP POLICY IF EXISTS sovereign_dc_simulation_runs_org_read ON public.sovereign_dc_simulation_runs;
CREATE POLICY sovereign_dc_simulation_runs_org_read
  ON public.sovereign_dc_simulation_runs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sovereign_dc_facilities f
    WHERE f.id = sovereign_dc_simulation_runs.facility_id
      AND f.org_id IS NOT NULL
      AND public.is_org_member(f.org_id, auth.uid())
  ));
DROP POLICY IF EXISTS sovereign_dc_simulation_runs_org_write ON public.sovereign_dc_simulation_runs;
CREATE POLICY sovereign_dc_simulation_runs_org_write
  ON public.sovereign_dc_simulation_runs FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sovereign_dc_facilities f
    WHERE f.id = sovereign_dc_simulation_runs.facility_id
      AND public.org_has_role(f.org_id, auth.uid(), ARRAY['owner','admin','operator','engineer','manager','executive']::text[])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sovereign_dc_facilities f
    WHERE f.id = sovereign_dc_simulation_runs.facility_id
      AND public.org_has_role(f.org_id, auth.uid(), ARRAY['owner','admin','operator','engineer','manager','executive']::text[])
  ));

DROP POLICY IF EXISTS twin_simulation_runs_org_read ON public.twin_simulation_runs;
CREATE POLICY twin_simulation_runs_org_read
  ON public.twin_simulation_runs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_simulation_runs.twin_id
      AND t.org_id IS NOT NULL
      AND public.is_org_member(t.org_id, auth.uid())
  ));
DROP POLICY IF EXISTS twin_simulation_runs_org_write ON public.twin_simulation_runs;
CREATE POLICY twin_simulation_runs_org_write
  ON public.twin_simulation_runs FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_simulation_runs.twin_id
      AND public.org_has_role(t.org_id, auth.uid(), ARRAY['owner','admin','operator','engineer','manager','executive']::text[])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_simulation_runs.twin_id
      AND public.org_has_role(t.org_id, auth.uid(), ARRAY['owner','admin','operator','engineer','manager','executive']::text[])
  ));

-- Read-only collaboration for common DC evidence/telemetry surfaces.
DROP POLICY IF EXISTS twin_telemetry_org_read ON public.twin_telemetry;
CREATE POLICY twin_telemetry_org_read
  ON public.twin_telemetry FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_telemetry.twin_id
      AND t.org_id IS NOT NULL
      AND public.is_org_member(t.org_id, auth.uid())
  ));
DROP POLICY IF EXISTS twin_kpi_snapshots_org_read ON public.twin_kpi_snapshots;
CREATE POLICY twin_kpi_snapshots_org_read
  ON public.twin_kpi_snapshots FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_kpi_snapshots.twin_id
      AND t.org_id IS NOT NULL
      AND public.is_org_member(t.org_id, auth.uid())
  ));
DROP POLICY IF EXISTS twin_sovereignty_events_org_read ON public.twin_sovereignty_events;
CREATE POLICY twin_sovereignty_events_org_read
  ON public.twin_sovereignty_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_sovereignty_events.twin_id
      AND t.org_id IS NOT NULL
      AND public.is_org_member(t.org_id, auth.uid())
  ));
DROP POLICY IF EXISTS twin_carbon_emissions_org_read ON public.twin_carbon_emissions;
CREATE POLICY twin_carbon_emissions_org_read
  ON public.twin_carbon_emissions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_carbon_emissions.twin_id
      AND t.org_id IS NOT NULL
      AND public.is_org_member(t.org_id, auth.uid())
  ));
DROP POLICY IF EXISTS twin_financial_records_org_read ON public.twin_financial_records;
CREATE POLICY twin_financial_records_org_read
  ON public.twin_financial_records FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_financial_records.twin_id
      AND t.org_id IS NOT NULL
      AND public.is_org_member(t.org_id, auth.uid())
  ));

COMMIT;