BEGIN;

-- Post-release authorization hardening.
-- Platform/global helpers must never treat resource-qualified grants such as
-- agent:<uuid> as global administrative authority.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND (ur.scope = 'global' OR ur.scope IS NULL)
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.check_user_has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role::text = _role
      AND (ur.scope = 'global' OR ur.scope IS NULL)
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
  );
$$;

-- Profile security-sensitive columns are a platform/global authority boundary.
CREATE OR REPLACE FUNCTION public.enforce_profile_immutable_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = v_uid
      AND ur.role::text = 'admin'
      AND (ur.scope = 'global' OR ur.scope IS NULL)
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
  ) INTO v_is_admin;

  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id     IS DISTINCT FROM OLD.user_id
  OR NEW.email       IS DISTINCT FROM OLD.email
  OR NEW.org_id      IS DISTINCT FROM OLD.org_id
  OR NEW.is_approved IS DISTINCT FROM OLD.is_approved
  OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
  OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
  THEN
    RAISE EXCEPTION
      'profile authority: non-admin caller cannot modify security-sensitive columns'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- DSX operator authority derives from an approved profile plus a global
-- platform role. Resource-qualified grants cannot elevate this organization
-- level capability.
CREATE OR REPLACE FUNCTION public.dsx_current_user_is_operator_in_org(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.user_roles r ON r.user_id = p.user_id
    WHERE p.user_id = auth.uid()
      AND p.is_approved = true
      AND p.org_id = p_org_id
      AND r.role::text IN ('admin','operator')
      AND (r.scope = 'global' OR r.scope IS NULL)
      AND (r.expires_at IS NULL OR r.expires_at > now())
  );
$$;

-- Keep helper execution default-deny for anonymous/public callers after replace.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_user_has_role(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.dsx_current_user_is_operator_in_org(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_user_has_role(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dsx_current_user_is_operator_in_org(uuid) TO authenticated, service_role;

-- Organization-owned data-centre twin child records previously had org read
-- policies but no org write path. Mirror the existing twin_simulation_runs
-- collaboration contract without weakening legacy user-owned twin policies.
DROP POLICY IF EXISTS twin_sovereignty_events_org_write ON public.twin_sovereignty_events;
CREATE POLICY twin_sovereignty_events_org_write
  ON public.twin_sovereignty_events FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_sovereignty_events.twin_id
      AND t.org_id IS NOT NULL
      AND public.org_has_role(
        t.org_id,
        auth.uid(),
        ARRAY['owner','admin','operator','engineer','manager','executive']::text[]
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_sovereignty_events.twin_id
      AND t.org_id IS NOT NULL
      AND public.org_has_role(
        t.org_id,
        auth.uid(),
        ARRAY['owner','admin','operator','engineer','manager','executive']::text[]
      )
  ));

DROP POLICY IF EXISTS twin_carbon_emissions_org_write ON public.twin_carbon_emissions;
CREATE POLICY twin_carbon_emissions_org_write
  ON public.twin_carbon_emissions FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_carbon_emissions.twin_id
      AND t.org_id IS NOT NULL
      AND public.org_has_role(
        t.org_id,
        auth.uid(),
        ARRAY['owner','admin','operator','engineer','manager','executive']::text[]
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_carbon_emissions.twin_id
      AND t.org_id IS NOT NULL
      AND public.org_has_role(
        t.org_id,
        auth.uid(),
        ARRAY['owner','admin','operator','engineer','manager','executive']::text[]
      )
  ));

DROP POLICY IF EXISTS twin_financial_records_org_write ON public.twin_financial_records;
CREATE POLICY twin_financial_records_org_write
  ON public.twin_financial_records FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_financial_records.twin_id
      AND t.org_id IS NOT NULL
      AND public.org_has_role(
        t.org_id,
        auth.uid(),
        ARRAY['owner','admin','operator','engineer','manager','executive']::text[]
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_financial_records.twin_id
      AND t.org_id IS NOT NULL
      AND public.org_has_role(
        t.org_id,
        auth.uid(),
        ARRAY['owner','admin','operator','engineer','manager','executive']::text[]
      )
  ));

COMMIT;
