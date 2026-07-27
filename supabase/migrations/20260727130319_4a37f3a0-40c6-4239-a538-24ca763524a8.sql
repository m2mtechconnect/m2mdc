-- ============================================================================
-- Pre-Phase-2.a: profile authority hardening
-- Establishes trustworthy profiles.org_id as the root of DSX tenant authority.
-- Additive: no existing data mutated, no rows deleted.
-- ============================================================================

-- 1. Column-level UPDATE privilege (PRIMARY control).
--    Revoke broad table-level UPDATE and grant only the columns ordinary
--    authenticated users are legitimately allowed to change.

REVOKE UPDATE ON public.profiles FROM PUBLIC;
REVOKE UPDATE ON public.profiles FROM anon;
REVOKE UPDATE ON public.profiles FROM authenticated;

-- Self-service editable fields (verified via repo audit of every profiles.update() call site).
GRANT UPDATE (
  full_name,
  avatar_url,
  job_title,
  phone,
  locale,
  timezone,
  department_id,
  avatar_bg_color,
  avatar_initials,
  updated_at
) ON public.profiles TO authenticated;

-- Approval fields: column privilege granted so the existing admin approval
-- workflow (Teams / AdminUserApproval / AdminSignupsDashboard) continues to
-- function via the "Admins can update any profile" RLS policy. The trigger
-- below is the row-level control that blocks non-admin callers from
-- exercising this column privilege.
GRANT UPDATE (
  is_approved,
  approved_at,
  approved_by
) ON public.profiles TO authenticated;

-- service_role retains full access for edge functions, migrations, admin RPCs.
GRANT ALL ON public.profiles TO service_role;

-- 2. Recreate the self-update policy with explicit WITH CHECK.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- 3. Defense-in-depth trigger: block non-admin callers from mutating
--    security-sensitive columns even if column privileges are later relaxed.

CREATE OR REPLACE FUNCTION public.enforce_profile_immutable_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER          -- fires under caller's role; service_role bypasses via NULL auth.uid()
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  -- Trusted execution paths: service_role, migrations, SECURITY DEFINER
  -- functions like public.handle_new_user() all have NULL auth.uid()
  -- because no end-user JWT is present. Allow them through.
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Inline authoritative admin check against public.user_roles (fully
  -- qualified, does not route through the parallel text-based
  -- check_user_has_role() surface as instructed). Admins may change
  -- approval / tenancy fields via their existing RLS policy.
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_uid AND role = 'admin'
  ) INTO v_is_admin;

  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  -- Non-admin, non-service caller: enforce immutability of security fields.
  -- IS DISTINCT FROM covers NULL<->value transitions in both directions.
  IF NEW.user_id     IS DISTINCT FROM OLD.user_id
  OR NEW.email       IS DISTINCT FROM OLD.email
  OR NEW.org_id      IS DISTINCT FROM OLD.org_id
  OR NEW.is_approved IS DISTINCT FROM OLD.is_approved
  OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
  OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
  THEN
    RAISE EXCEPTION
      'profile authority: non-admin caller cannot modify security-sensitive columns (user_id, email, org_id, is_approved, approved_at, approved_by)'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_profile_immutable_columns() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_profile_immutable_columns() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_profile_immutable_columns() FROM authenticated;

DROP TRIGGER IF EXISTS enforce_profile_immutable_columns ON public.profiles;
CREATE TRIGGER enforce_profile_immutable_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_immutable_columns();

COMMENT ON FUNCTION public.enforce_profile_immutable_columns() IS
  'Pre-Phase-2.a hardening: defense-in-depth block on non-admin mutation of user_id/email/org_id/is_approved/approved_at/approved_by. Column privileges (revoke UPDATE / grant only self-service columns) are the primary control; this trigger is the safety net.';