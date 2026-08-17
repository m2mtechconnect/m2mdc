-- Tenant resolution: a user's tenant is their profile's organisation.
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- A connection is reachable when it is platform-scope (no tenant) or belongs
-- to the caller's tenant. NULL tenant rows are the system/platform connections.
CREATE OR REPLACE FUNCTION public.connection_tenant_visible(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _tenant_id IS NULL OR _tenant_id = public.current_tenant_id()
$$;

-- Evidence tables reference a connection; scope them through its tenant.
CREATE OR REPLACE FUNCTION public.connection_visible(_connection_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.connection_instances ci
    WHERE ci.id = _connection_id
      AND public.connection_tenant_visible(ci.tenant_id)
  )
$$;

REVOKE ALL ON FUNCTION public.current_tenant_id() FROM anon;
REVOKE ALL ON FUNCTION public.connection_tenant_visible(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.connection_visible(uuid) FROM anon;

-- connection_instances
DROP POLICY IF EXISTS connection_instances_read ON public.connection_instances;
CREATE POLICY connection_instances_read
  ON public.connection_instances FOR SELECT TO authenticated
  USING (public.connection_tenant_visible(tenant_id));

DROP POLICY IF EXISTS connection_instances_admin_write ON public.connection_instances;
CREATE POLICY connection_instances_admin_write
  ON public.connection_instances FOR ALL TO authenticated
  USING (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
    AND public.connection_tenant_visible(tenant_id)
  )
  WITH CHECK (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
    AND public.connection_tenant_visible(tenant_id)
  );

-- connection_twin_mappings
DROP POLICY IF EXISTS connection_twin_mappings_read ON public.connection_twin_mappings;
CREATE POLICY connection_twin_mappings_read
  ON public.connection_twin_mappings FOR SELECT TO authenticated
  USING (public.connection_visible(connection_id));

DROP POLICY IF EXISTS connection_twin_mappings_admin_write ON public.connection_twin_mappings;
CREATE POLICY connection_twin_mappings_admin_write
  ON public.connection_twin_mappings FOR ALL TO authenticated
  USING (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
    AND public.connection_visible(connection_id)
  )
  WITH CHECK (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
    AND public.connection_visible(connection_id)
  );

-- connection_health_checks
DROP POLICY IF EXISTS connection_health_checks_read ON public.connection_health_checks;
CREATE POLICY connection_health_checks_read
  ON public.connection_health_checks FOR SELECT TO authenticated
  USING (public.connection_visible(connection_id));

-- connection_ingest_runs
DROP POLICY IF EXISTS connection_ingest_runs_read ON public.connection_ingest_runs;
CREATE POLICY connection_ingest_runs_read
  ON public.connection_ingest_runs FOR SELECT TO authenticated
  USING (public.connection_visible(connection_id));

-- connection_audit_events: connection_id may be null (platform-level events).
DROP POLICY IF EXISTS connection_audit_events_read ON public.connection_audit_events;
CREATE POLICY connection_audit_events_read
  ON public.connection_audit_events FOR SELECT TO authenticated
  USING (connection_id IS NULL OR public.connection_visible(connection_id));