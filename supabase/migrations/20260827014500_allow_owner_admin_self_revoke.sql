-- Let an approved global owner administer role grants without retaining a
-- redundant administrator grant. Self-revocation of administrator authority
-- remains blocked unless an active global owner grant survives the delete.

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
  IF NOT (
       public.has_role(_actor, 'owner'::public.app_role)
    OR public.has_role(_actor, 'admin'::public.app_role)
    OR public.has_role(_actor, 'security_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'caller not an administrator' USING ERRCODE = '42501';
  END IF;
  RETURN _actor;
END;
$$;

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
  SELECT *
  INTO _row
  FROM public.user_roles
  WHERE id = _role_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'role grant not found' USING ERRCODE = 'P0002';
  END IF;

  IF _row.user_id = _actor
     AND _row.role IN ('admin'::public.app_role, 'security_admin'::public.app_role)
     AND NOT EXISTS (
       SELECT 1
       FROM public.user_roles AS owner_grant
       WHERE owner_grant.user_id = _actor
         AND owner_grant.id <> _role_id
         AND owner_grant.role = 'owner'::public.app_role
         AND COALESCE(owner_grant.scope, 'global') = 'global'
         AND (owner_grant.expires_at IS NULL OR owner_grant.expires_at > now())
     ) THEN
    RAISE EXCEPTION 'cannot revoke your own administrator role without an active global owner grant'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.user_roles WHERE id = _role_id;

  INSERT INTO public.role_change_audit (actor_user_id, target_user_id, role, action, reason)
  VALUES (_actor, _row.user_id, _row.role, 'revoke', _reason);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assert_role_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_role_grant(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_role_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_revoke_role_grant(uuid, text) TO authenticated, service_role;
