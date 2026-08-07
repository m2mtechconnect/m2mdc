-- ============================================================================
-- AURA DC Phase 1 / B-02 step 2 - canonical role type = public.app_role.
-- Root cause: public.user_roles.role was TEXT while public.has_role(uuid, app_role)
-- compared it to an app_role parameter. PostgreSQL has no text = app_role operator,
-- so every RLS policy calling has_role() raised SQLSTATE 42883 at query time.
-- ============================================================================

-- 1. Drop policies depending on public.user_roles.role. Recreated in section 4.
DROP POLICY IF EXISTS "Admins can view submissions"                     ON public.onboarding_submissions;
DROP POLICY IF EXISTS "Admins can view audit logs"                      ON public.audit_logs;
DROP POLICY IF EXISTS "Security admins can view audit logs"             ON public.audit_logs;
DROP POLICY IF EXISTS "Executives can view all contact logs"            ON public.contact_expert_logs;
DROP POLICY IF EXISTS "Executives can view all logs"                    ON public.integration_logs;
DROP POLICY IF EXISTS "Executives can delete integrations"              ON public.integrations;
DROP POLICY IF EXISTS "Executives can insert integrations"              ON public.integrations;
DROP POLICY IF EXISTS "Executives can update integrations"              ON public.integrations;
DROP POLICY IF EXISTS "Executives can view all integrations"            ON public.integrations;
DROP POLICY IF EXISTS "Executives can view sync runs"                   ON public.mcp_sync_runs;
DROP POLICY IF EXISTS "role_change_audit_admin_read"                    ON public.role_change_audit;
DROP POLICY IF EXISTS "Admins can update any profile"                   ON public.profiles;
DROP POLICY IF EXISTS "Users can view own or admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all twins"                       ON public.data_centre_twins;
DROP POLICY IF EXISTS "Admins can update industry agents"               ON public.industry_agents;

-- 2. Establish the canonical role type on the authoritative table.
-- The legacy CHECK constraint compares role to a text[] whitelist; once the
-- column becomes app_role that predicate raises 42883. The enum now enforces
-- exactly the same vocabulary, so the constraint is redundant.
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE public.app_role USING role::public.app_role;

-- 3. Authorization helpers. One implementation; the text variants are thin,
--    non-throwing compatibility wrappers scheduled for removal.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
  );
$$;

-- Deprecated text wrapper. Compares the textual form so an unknown label
-- returns false instead of raising 22P02.
CREATE OR REPLACE FUNCTION public.check_user_has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role::text = _role
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_role(check_user_id uuid, check_role text, check_scope text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = check_user_id
      AND ur.role::text = check_role
      AND (check_scope IS NULL OR ur.scope = check_scope OR ur.scope = 'global' OR ur.scope IS NULL)
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_agent(check_user_id uuid, check_agent_id uuid, required_permission text DEFAULT 'view'::text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agents a
    WHERE a.id = check_agent_id AND a.owner_id = check_user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = check_user_id
      AND (
        (required_permission = 'view'       AND ur.role::text IN ('viewer','operator','admin'))
        OR (required_permission = 'operate' AND ur.role::text IN ('operator','admin'))
        OR (required_permission = 'admin'   AND ur.role::text = 'admin')
      )
      AND (ur.scope = 'global' OR ur.scope IS NULL OR ur.scope = 'agent:' || check_agent_id::text)
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
  );
$$;

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
      AND (r.expires_at IS NULL OR r.expires_at > now())
  );
$$;

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
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = v_uid AND ur.role::text = 'admin'
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

-- 4. Recreate dependent policies against the repaired helper.
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'executive'::public.app_role)
      OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Security admins can view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'security_admin'::public.app_role));

CREATE POLICY "Executives can view all contact logs" ON public.contact_expert_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'executive'::public.app_role));

CREATE POLICY "Executives can view all logs" ON public.integration_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'executive'::public.app_role));

CREATE POLICY "Executives can view all integrations" ON public.integrations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'executive'::public.app_role));

CREATE POLICY "Executives can insert integrations" ON public.integrations
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'executive'::public.app_role));

CREATE POLICY "Executives can update integrations" ON public.integrations
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'executive'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'executive'::public.app_role));

CREATE POLICY "Executives can delete integrations" ON public.integrations
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'executive'::public.app_role));

CREATE POLICY "Executives can view sync runs" ON public.mcp_sync_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'executive'::public.app_role));

CREATE POLICY "role_change_audit_admin_read" ON public.role_change_audit
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'security_admin'::public.app_role));

CREATE POLICY "Users can view own or admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can view all twins" ON public.data_centre_twins
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update industry agents" ON public.industry_agents
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can view submissions" ON public.onboarding_submissions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 5. Execution privileges: default-deny for PUBLIC and anon.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)                 FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_user_has_role(uuid, text)                 FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_has_role(uuid, text, text)                 FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_can_access_agent(uuid, uuid, text)         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.dsx_current_user_is_operator_in_org(uuid)       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_approved_user(uuid)                          FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_assign_role(uuid, public.app_role, text)  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_role(uuid, public.app_role, text)  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)                  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_user_has_role(uuid, text)                  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_role(uuid, text, text)                  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_access_agent(uuid, uuid, text)          TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dsx_current_user_is_operator_in_org(uuid)        TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_approved_user(uuid)                           TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_assign_role(uuid, public.app_role, text)   TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_revoke_role(uuid, public.app_role, text)   TO authenticated, service_role;

-- 6. Privilege-escalation guard: user_roles is read-own only; all writes go
--    through the audited security-definer admin RPCs.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.user_roles FROM anon, authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL    ON public.user_roles TO service_role;