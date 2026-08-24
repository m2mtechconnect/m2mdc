-- AURA enterprise tenancy Phase 4: tenant storage + audit isolation.
-- Legacy digital-twin-assets remains compatibility-only until its writers are
-- migrated. New customer-owned objects must use aura-tenant-assets/{org_id}/...

BEGIN;

-- Bucket 'aura-tenant-assets' (private) created via the native storage API;
-- SQL writes to storage.buckets are rejected by the managed migration runner.

CREATE OR REPLACE FUNCTION public.storage_object_org_id(_name text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_segment text;
BEGIN
  v_segment := split_part(COALESCE(_name, ''), '/', 1);
  IF v_segment ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RETURN v_segment::uuid;
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.storage_object_org_id(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.storage_object_org_id(text) TO authenticated, service_role;

DROP POLICY IF EXISTS aura_tenant_assets_read ON storage.objects;
CREATE POLICY aura_tenant_assets_read
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'aura-tenant-assets'
    AND public.storage_object_org_id(name) IS NOT NULL
    AND public.is_org_member(public.storage_object_org_id(name), auth.uid())
  );

DROP POLICY IF EXISTS aura_tenant_assets_insert ON storage.objects;
CREATE POLICY aura_tenant_assets_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'aura-tenant-assets'
    AND public.storage_object_org_id(name) = public.active_org_id()
    AND public.org_has_role(
      public.storage_object_org_id(name),
      auth.uid(),
      ARRAY['owner','admin','operator','engineer','manager']::text[]
    )
  );

DROP POLICY IF EXISTS aura_tenant_assets_update ON storage.objects;
CREATE POLICY aura_tenant_assets_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'aura-tenant-assets'
    AND public.org_has_role(
      public.storage_object_org_id(name),
      auth.uid(),
      ARRAY['owner','admin','operator','engineer','manager']::text[]
    )
  )
  WITH CHECK (
    bucket_id = 'aura-tenant-assets'
    AND public.storage_object_org_id(name) = public.active_org_id()
    AND public.org_has_role(
      public.storage_object_org_id(name),
      auth.uid(),
      ARRAY['owner','admin','operator','engineer','manager']::text[]
    )
  );

DROP POLICY IF EXISTS aura_tenant_assets_delete ON storage.objects;
CREATE POLICY aura_tenant_assets_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'aura-tenant-assets'
    AND public.org_has_role(
      public.storage_object_org_id(name),
      auth.uid(),
      ARRAY['owner','admin']::text[]
    )
  );

-- Customer audit rows are stamped to the active organization. Service-role
-- events may remain org_id NULL only when they are truly platform-scoped.
CREATE OR REPLACE FUNCTION public.stamp_audit_org_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF NEW.org_id IS NOT NULL THEN
    IF auth.uid() IS NOT NULL THEN
      v_org_id := public.active_org_id();
      IF v_org_id IS NULL OR NEW.org_id IS DISTINCT FROM v_org_id THEN
        RAISE EXCEPTION 'audit organization must match the active organization';
      END IF;
      IF NOT public.is_org_member(NEW.org_id, auth.uid()) THEN
        RAISE EXCEPTION 'organization membership required';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    v_org_id := public.active_org_id();
    IF v_org_id IS NULL THEN
      RAISE EXCEPTION 'active organization is required for user audit events';
    END IF;
    NEW.org_id := v_org_id;
    RETURN NEW;
  END IF;

  -- Service-role compatibility: infer tenant from the represented user when
  -- possible. If there is no user/org relationship, retain NULL as a platform
  -- audit event that authenticated customer roles cannot read.
  IF NEW.user_id IS NOT NULL THEN
    SELECT COALESCE(p.last_active_org_id, p.org_id)
    INTO v_org_id
    FROM public.profiles p
    WHERE p.user_id = NEW.user_id
    LIMIT 1;
    NEW.org_id := v_org_id;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.stamp_audit_org_id() FROM PUBLIC;

DROP TRIGGER IF EXISTS audit_logs_stamp_org ON public.audit_logs;
CREATE TRIGGER audit_logs_stamp_org
BEFORE INSERT ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.stamp_audit_org_id();

-- Remove platform-global audit visibility from ordinary application roles.
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Security admins can view audit logs" ON public.audit_logs;

DROP POLICY IF EXISTS audit_logs_org_read ON public.audit_logs;
CREATE POLICY audit_logs_org_read
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    org_id IS NOT NULL
    AND public.org_has_role(
      org_id,
      auth.uid(),
      ARRAY['owner','admin','security_admin','executive']::text[]
    )
  );

DROP POLICY IF EXISTS "Users can insert their own audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert their own audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND org_id = public.active_org_id()
    AND public.is_org_member(org_id, auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created_at
  ON public.audit_logs(org_id, created_at DESC)
  WHERE org_id IS NOT NULL;

COMMIT;