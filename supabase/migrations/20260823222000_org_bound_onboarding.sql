-- AURA enterprise onboarding: organization-bound invites and transactional acceptance.
-- Depends on 20260823220500_org_membership_foundation.sql.

BEGIN;

-- The legacy enum cannot represent the full organization role vocabulary used
-- by the application. Invitations are tenant roles, so normalize them to text
-- with an explicit constraint shared with org_memberships.
ALTER TABLE public.team_invites
  ALTER COLUMN role TYPE text USING role::text;

ALTER TABLE public.team_invites
  DROP CONSTRAINT IF EXISTS team_invites_role_check;

ALTER TABLE public.team_invites
  ADD CONSTRAINT team_invites_role_check CHECK (
    role = ANY (ARRAY[
      'owner','admin','operator','engineer','manager','executive',
      'security_admin','compliance','data_analyst','support','viewer'
    ]::text[])
  );

CREATE INDEX IF NOT EXISTS idx_team_invites_org_status
  ON public.team_invites(org_id, status);
CREATE INDEX IF NOT EXISTS idx_team_invites_org_email
  ON public.team_invites(org_id, lower(email));

-- Membership becomes the durable organization-read boundary while the legacy
-- profiles.org_id policy remains available during the bridge period.
DROP POLICY IF EXISTS organization_members_can_view ON public.organizations;
CREATE POLICY organization_members_can_view
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(id, auth.uid()));

-- Platform-only transaction used by the guarded organization-provision Edge
-- Function. It creates the customer and its first owner invitation atomically.
CREATE OR REPLACE FUNCTION public.platform_provision_organization(
  _name text,
  _domain text,
  _industry text,
  _owner_email text,
  _invited_by uuid
)
RETURNS TABLE (
  org_id uuid,
  invite_id uuid,
  invite_token text,
  invite_expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_invite_id uuid;
  v_token text;
  v_expires_at timestamptz;
  v_email text;
BEGIN
  IF _invited_by IS NULL THEN
    RAISE EXCEPTION 'inviter is required';
  END IF;

  IF NULLIF(trim(_name), '') IS NULL THEN
    RAISE EXCEPTION 'organization name is required';
  END IF;

  v_email := lower(trim(COALESCE(_owner_email, '')));
  IF v_email = '' OR position('@' in v_email) <= 1 THEN
    RAISE EXCEPTION 'valid owner email is required';
  END IF;

  INSERT INTO public.organizations (name, domain, industry)
  VALUES (
    trim(_name),
    NULLIF(lower(trim(COALESCE(_domain, ''))), ''),
    NULLIF(trim(COALESCE(_industry, '')), '')
  )
  RETURNING id INTO v_org_id;

  v_token := gen_random_uuid()::text;
  v_expires_at := now() + interval '7 days';

  INSERT INTO public.team_invites (
    email,
    role,
    invited_by,
    org_id,
    status,
    token,
    expires_at
  )
  VALUES (
    v_email,
    'owner',
    _invited_by,
    v_org_id,
    'pending',
    v_token,
    v_expires_at
  )
  RETURNING id INTO v_invite_id;

  RETURN QUERY
  SELECT v_org_id, v_invite_id, v_token, v_expires_at;
END;
$$;

-- Service-role-only transaction used after the Edge Function validates the
-- recipient JWT email against the invite. It creates/activates membership,
-- establishes the legacy profile bridge for a first organization, approves the
-- invited account, and consumes the invite under one row lock.
CREATE OR REPLACE FUNCTION public.accept_org_invite(
  _invite_id uuid,
  _user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.team_invites%ROWTYPE;
  v_has_active_membership boolean;
BEGIN
  IF _invite_id IS NULL OR _user_id IS NULL THEN
    RAISE EXCEPTION 'invite and user are required';
  END IF;

  SELECT *
  INTO v_invite
  FROM public.team_invites
  WHERE id = _invite_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invite not found';
  END IF;

  IF v_invite.status <> 'pending' THEN
    RAISE EXCEPTION 'invite is not pending';
  END IF;

  IF v_invite.expires_at <= now() THEN
    RAISE EXCEPTION 'invite expired';
  END IF;

  IF v_invite.org_id IS NULL THEN
    RAISE EXCEPTION 'invite is not organization-bound';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.org_memberships m
    WHERE m.user_id = _user_id
      AND m.status = 'active'
  )
  INTO v_has_active_membership;

  INSERT INTO public.org_memberships (
    org_id,
    user_id,
    role,
    status,
    is_default,
    granted_by
  )
  VALUES (
    v_invite.org_id,
    _user_id,
    v_invite.role,
    'active',
    NOT v_has_active_membership,
    v_invite.invited_by
  )
  ON CONFLICT (org_id, user_id) DO UPDATE
  SET role = EXCLUDED.role,
      status = 'active',
      granted_by = EXCLUDED.granted_by,
      updated_at = now();

  UPDATE public.profiles
  SET is_approved = true,
      org_id = COALESCE(org_id, v_invite.org_id),
      last_active_org_id = COALESCE(last_active_org_id, v_invite.org_id),
      updated_at = now()
  WHERE user_id = _user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found';
  END IF;

  UPDATE public.team_invites
  SET status = 'accepted'
  WHERE id = v_invite.id;

  RETURN v_invite.org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_provision_organization(text, text, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_org_invite(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.platform_provision_organization(text, text, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.accept_org_invite(uuid, uuid) TO service_role;

COMMIT;