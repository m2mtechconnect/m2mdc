-- The immutable-profile trigger must distinguish an ordinary authenticated
-- UPDATE from a reviewed SECURITY DEFINER transaction. auth.uid() intentionally
-- remains populated inside a definer function, while current_user becomes the
-- trusted function owner.

BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_profile_immutable_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

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

COMMENT ON FUNCTION public.enforce_profile_immutable_columns() IS
  'Prevents ordinary users from changing profile authority while allowing reviewed SECURITY DEFINER and service transactions to perform scoped authority changes.';

COMMIT;
