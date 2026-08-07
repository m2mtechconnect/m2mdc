-- ============================================================================
-- AURA DC Phase 1 / B-06: privileged role mutations move out of the browser.
-- The client can no longer INSERT/UPDATE/DELETE public.user_roles directly
-- (grants revoked in the B-02 migration). These SECURITY DEFINER RPCs are the
-- only write path and every one of them appends to public.role_change_audit.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.assert_role_admin()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  _actor uuid := auth.uid();
BEGIN
  IF _actor IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_approved_user(_actor) THEN
    RAISE EXCEPTION 'caller not approved' USING ERRCODE = '42501';
  END IF;
  IF NOT (public.has_role(_actor, 'admin'::public.app_role)
       OR public.has_role(_actor, 'security_admin'::public.app_role)) THEN
    RAISE EXCEPTION 'caller not an administrator' USING ERRCODE = '42501';
  END IF;
  RETURN _actor;
END;
$$;

-- Grant one role, optionally scoped to a single agent.
CREATE OR REPLACE FUNCTION public.admin_grant_role(
  _target_user_id uuid,
  _role public.app_role,
  _scope text DEFAULT 'global',
  _reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  _actor uuid := public.assert_role_admin();
BEGIN
  INSERT INTO public.user_roles (user_id, role, scope, granted_by)
  VALUES (_target_user_id, _role, COALESCE(_scope, 'global'), _actor)
  ON CONFLICT (user_id, role, scope) DO NOTHING;

  INSERT INTO public.role_change_audit (actor_user_id, target_user_id, role, action, reason)
  VALUES (_actor, _target_user_id, _role, 'assign', _reason);
END;
$$;

-- Revoke one specific grant row.
CREATE OR REPLACE FUNCTION public.admin_revoke_role_grant(
  _role_id uuid,
  _reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  _actor uuid := public.assert_role_admin();
  _row   public.user_roles%ROWTYPE;
BEGIN
  SELECT * INTO _row FROM public.user_roles WHERE id = _role_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'role grant not found' USING ERRCODE = 'P0002';
  END IF;

  IF _row.user_id = _actor
     AND _row.role IN ('admin'::public.app_role, 'security_admin'::public.app_role) THEN
    RAISE EXCEPTION 'cannot revoke your own administrator role' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.user_roles WHERE id = _role_id;

  INSERT INTO public.role_change_audit (actor_user_id, target_user_id, role, action, reason)
  VALUES (_actor, _row.user_id, _row.role, 'revoke', _reason);
END;
$$;

-- Replace every role a user holds with exactly one role.
CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  _target_user_id uuid,
  _role public.app_role,
  _reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  _actor uuid := public.assert_role_admin();
  _old   public.user_roles%ROWTYPE;
BEGIN
  IF _target_user_id = _actor
     AND NOT public.has_role(_actor, _role) THEN
    RAISE EXCEPTION 'cannot change your own role' USING ERRCODE = '42501';
  END IF;

  FOR _old IN SELECT * FROM public.user_roles WHERE user_id = _target_user_id AND role <> _role LOOP
    DELETE FROM public.user_roles WHERE id = _old.id;
    INSERT INTO public.role_change_audit (actor_user_id, target_user_id, role, action, reason)
    VALUES (_actor, _target_user_id, _old.role, 'revoke', COALESCE(_reason, 'replaced by role change'));
  END LOOP;

  INSERT INTO public.user_roles (user_id, role, scope, granted_by)
  VALUES (_target_user_id, _role, 'global', _actor)
  ON CONFLICT (user_id, role, scope) DO NOTHING;

  INSERT INTO public.role_change_audit (actor_user_id, target_user_id, role, action, reason)
  VALUES (_actor, _target_user_id, _role, 'assign', _reason);
END;
$$;

-- Remove every role a user holds.
CREATE OR REPLACE FUNCTION public.admin_clear_user_roles(
  _target_user_id uuid,
  _reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  _actor uuid := public.assert_role_admin();
  _old   public.user_roles%ROWTYPE;
BEGIN
  IF _target_user_id = _actor THEN
    RAISE EXCEPTION 'cannot clear your own roles' USING ERRCODE = '42501';
  END IF;

  FOR _old IN SELECT * FROM public.user_roles WHERE user_id = _target_user_id LOOP
    DELETE FROM public.user_roles WHERE id = _old.id;
    INSERT INTO public.role_change_audit (actor_user_id, target_user_id, role, action, reason)
    VALUES (_actor, _target_user_id, _old.role, 'revoke', _reason);
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assert_role_admin()                                        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_grant_role(uuid, public.app_role, text, text)        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_role_grant(uuid, text)                        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role, text)           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_clear_user_roles(uuid, text)                         FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_grant_role(uuid, public.app_role, text, text)         TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_revoke_role_grant(uuid, text)                         TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role, text)            TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_clear_user_roles(uuid, text)                          TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assert_role_admin()                                         TO service_role;