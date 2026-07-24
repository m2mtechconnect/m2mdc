
-- PR-0.1 Checkpoint B: lock down public.user_roles and add audited
-- server-side role assignment. Forward-only.

DROP POLICY IF EXISTS "user_roles_insert_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_own" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can delete own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can manage their own roles" ON public.user_roles;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_roles' AND policyname='user_roles_read_own'
  ) THEN
    CREATE POLICY "user_roles_read_own" ON public.user_roles
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

CREATE OR REPLACE FUNCTION public.is_approved_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_approved FROM public.profiles WHERE user_id = _user_id),
    false
  );
$$;
REVOKE ALL ON FUNCTION public.is_approved_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_approved_user(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.role_change_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  action text NOT NULL CHECK (action IN ('assign','revoke')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.role_change_audit TO authenticated;
GRANT ALL ON public.role_change_audit TO service_role;

ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_change_audit_admin_read" ON public.role_change_audit;
CREATE POLICY "role_change_audit_admin_read" ON public.role_change_audit
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'security_admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.admin_assign_role(
  _target_user_id uuid,
  _role public.app_role,
  _reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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
  IF NOT public.has_role(_actor, 'security_admin'::public.app_role) THEN
    RAISE EXCEPTION 'caller not security_admin' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_target_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.role_change_audit (actor_user_id, target_user_id, role, action, reason)
  VALUES (_actor, _target_user_id, _role, 'assign', _reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_role(
  _target_user_id uuid,
  _role public.app_role,
  _reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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
  IF NOT public.has_role(_actor, 'security_admin'::public.app_role) THEN
    RAISE EXCEPTION 'caller not security_admin' USING ERRCODE = '42501';
  END IF;
  IF _actor = _target_user_id AND _role = 'security_admin'::public.app_role THEN
    RAISE EXCEPTION 'cannot revoke own security_admin role' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = _target_user_id AND role = _role;

  INSERT INTO public.role_change_audit (actor_user_id, target_user_id, role, action, reason)
  VALUES (_actor, _target_user_id, _role, 'revoke', _reason);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_assign_role(uuid, public.app_role, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_revoke_role(uuid, public.app_role, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_assign_role(uuid, public.app_role, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_role(uuid, public.app_role, text) TO authenticated;
