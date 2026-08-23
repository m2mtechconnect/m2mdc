-- AURA enterprise tenancy foundation.
-- Additive and backward-compatible: profiles.org_id remains in place during the bridge period.

BEGIN;

CREATE TABLE IF NOT EXISTS public.org_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer',
  status text NOT NULL DEFAULT 'active',
  is_default boolean NOT NULL DEFAULT false,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_memberships_org_user_unique UNIQUE (org_id, user_id),
  CONSTRAINT org_memberships_role_check CHECK (
    role = ANY (ARRAY[
      'owner','admin','operator','engineer','manager','executive',
      'security_admin','compliance','data_analyst','support','viewer'
    ]::text[])
  ),
  CONSTRAINT org_memberships_status_check CHECK (
    status = ANY (ARRAY['pending','active','suspended']::text[])
  )
);

CREATE INDEX IF NOT EXISTS idx_org_memberships_user_id
  ON public.org_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org_status
  ON public.org_memberships(org_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_memberships_one_default_per_user
  ON public.org_memberships(user_id)
  WHERE is_default = true AND status = 'active';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_active_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Preserve the legacy profile relationship as the initial active organisation.
UPDATE public.profiles
SET last_active_org_id = org_id
WHERE last_active_org_id IS NULL
  AND org_id IS NOT NULL;

-- Backfill a membership for every existing profile that already belongs to an organisation.
-- Prefer an existing role when it maps cleanly; otherwise grant the least-privileged viewer role.
INSERT INTO public.org_memberships (org_id, user_id, role, status, is_default)
SELECT
  p.org_id,
  p.user_id,
  COALESCE(
    (
      SELECT ur.role
      FROM public.user_roles ur
      WHERE ur.user_id = p.user_id
        AND ur.role = ANY (ARRAY['owner','admin','operator','viewer']::text[])
      ORDER BY CASE ur.role
        WHEN 'owner' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'operator' THEN 3
        ELSE 4
      END
      LIMIT 1
    ),
    'viewer'
  ),
  'active',
  true
FROM public.profiles p
WHERE p.org_id IS NOT NULL
ON CONFLICT (org_id, user_id) DO UPDATE
SET
  is_default = EXCLUDED.is_default,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_memberships m
    WHERE m.org_id = _org_id
      AND m.user_id = _user_id
      AND m.status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.org_has_role(_org_id uuid, _user_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_memberships m
    WHERE m.org_id = _org_id
      AND m.user_id = _user_id
      AND m.status = 'active'
      AND m.role = ANY (_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.active_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT candidate.org_id
  FROM (
    SELECT COALESCE(p.last_active_org_id, p.org_id) AS org_id
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
    LIMIT 1
  ) candidate
  WHERE candidate.org_id IS NOT NULL
    AND public.is_org_member(candidate.org_id, auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.set_active_org(_org_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF NOT public.is_org_member(_org_id, auth.uid()) THEN
    RAISE EXCEPTION 'organization membership required';
  END IF;

  -- During the bridge period, keep the legacy org_id resolver aligned with
  -- last_active_org_id. Phase 3 will move current_tenant_id() to active_org_id().
  UPDATE public.profiles
  SET last_active_org_id = _org_id,
      org_id = _org_id,
      updated_at = now()
  WHERE user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found';
  END IF;

  UPDATE public.org_memberships
  SET is_default = (org_id = _org_id),
      updated_at = now()
  WHERE user_id = auth.uid()
    AND status = 'active';

  RETURN _org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.is_org_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.org_has_role(uuid, uuid, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.active_org_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_active_org(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.org_has_role(uuid, uuid, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.active_org_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_active_org(uuid) TO authenticated;

ALTER TABLE public.org_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_memberships_read ON public.org_memberships;
CREATE POLICY org_memberships_read
  ON public.org_memberships
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.org_has_role(org_id, auth.uid(), ARRAY['owner','admin']::text[])
  );

-- Membership writes remain server-authoritative in Phase 1. The onboarding
-- transaction introduced in Phase 2 will create/update them through a guarded
-- service-role function instead of exposing direct client writes.

COMMIT;