-- Bind organization invitation creation and acceptance to the authenticated
-- actor inside atomic SECURITY DEFINER transactions. Edge Functions remain
-- orchestration boundaries; they no longer need broad table access for the
-- ordinary tenant invitation journey.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_org_invite(
  _email text,
  _role text,
  _token text,
  _expires_at timestamptz
)
RETURNS TABLE (
  id uuid,
  email text,
  role text,
  status text,
  invited_by uuid,
  org_id uuid,
  expires_at timestamptz,
  created_at timestamptz,
  organization_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_inviter_role text;
  v_email text := lower(trim(COALESCE(_email, '')));
  v_invite public.team_invites%ROWTYPE;
  v_organization_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF v_email = '' OR position('@' in v_email) <= 1 THEN
    RAISE EXCEPTION 'valid invite email required' USING ERRCODE = '22023';
  END IF;

  IF _role IS NULL OR _role <> ALL (ARRAY[
    'admin','viewer','operator','engineer','manager','executive',
    'security_admin','compliance','data_analyst','support'
  ]::text[]) THEN
    RAISE EXCEPTION 'role cannot be granted through an invite' USING ERRCODE = '22023';
  END IF;

  IF NULLIF(trim(COALESCE(_token, '')), '') IS NULL OR _expires_at <= now() THEN
    RAISE EXCEPTION 'valid invite token and expiry required' USING ERRCODE = '22023';
  END IF;

  v_org_id := public.active_org_id();
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'active organization required' USING ERRCODE = '42501';
  END IF;

  SELECT m.role
  INTO v_inviter_role
  FROM public.org_memberships m
  WHERE m.org_id = v_org_id
    AND m.user_id = v_user_id
    AND m.status = 'active';

  IF v_inviter_role IS NULL OR v_inviter_role <> ALL (ARRAY['owner','admin','security_admin']::text[]) THEN
    RAISE EXCEPTION 'member-management permission required' USING ERRCODE = '42501';
  END IF;

  IF _role = ANY (ARRAY['admin','security_admin']::text[]) AND v_inviter_role <> 'owner' THEN
    RAISE EXCEPTION 'owner permission required for elevated role' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.org_memberships m
      ON m.user_id = p.user_id
     AND m.org_id = v_org_id
     AND m.status = 'active'
    WHERE lower(p.email) = v_email
  ) THEN
    RAISE EXCEPTION 'account is already an active organization member' USING ERRCODE = '23505';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.team_invites i
    WHERE i.org_id = v_org_id
      AND lower(i.email) = v_email
      AND i.status = 'pending'
      AND i.expires_at > now()
  ) THEN
    RAISE EXCEPTION 'active invitation already exists' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.team_invites (
    email, role, invited_by, org_id, token, expires_at, status
  )
  VALUES (
    v_email, _role, v_user_id, v_org_id, trim(_token), _expires_at, 'pending'
  )
  RETURNING * INTO v_invite;

  SELECT o.name INTO v_organization_name
  FROM public.organizations o
  WHERE o.id = v_org_id;

  RETURN QUERY SELECT
    v_invite.id,
    v_invite.email,
    v_invite.role,
    v_invite.status,
    v_invite.invited_by,
    v_invite.org_id,
    v_invite.expires_at,
    v_invite.created_at,
    COALESCE(NULLIF(trim(v_organization_name), ''), 'your organization');
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_org_invite_token(_token text)
RETURNS TABLE (organization_id uuid, invited_role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := lower(trim(COALESCE(auth.jwt() ->> 'email', '')));
  v_invite public.team_invites%ROWTYPE;
  v_has_active_membership boolean;
BEGIN
  IF v_user_id IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_invite
  FROM public.team_invites i
  WHERE i.token = trim(COALESCE(_token, ''))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invite not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_invite.status <> 'pending' THEN
    RAISE EXCEPTION 'invite is not pending' USING ERRCODE = '23000';
  END IF;

  IF v_invite.expires_at <= now() THEN
    RAISE EXCEPTION 'invite expired' USING ERRCODE = '22023';
  END IF;

  IF v_invite.org_id IS NULL THEN
    RAISE EXCEPTION 'invite is not organization-bound' USING ERRCODE = '22023';
  END IF;

  IF lower(v_invite.email) <> v_email THEN
    RAISE EXCEPTION 'invite belongs to a different account' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.org_memberships m
    WHERE m.user_id = v_user_id AND m.status = 'active'
  ) INTO v_has_active_membership;

  INSERT INTO public.org_memberships (
    org_id, user_id, role, status, is_default, granted_by
  )
  VALUES (
    v_invite.org_id, v_user_id, v_invite.role, 'active',
    NOT v_has_active_membership, v_invite.invited_by
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
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.team_invites SET status = 'accepted' WHERE id = v_invite.id;

  RETURN QUERY SELECT v_invite.org_id, v_invite.role;
END;
$$;

REVOKE ALL ON FUNCTION public.create_org_invite(text, text, text, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_org_invite_token(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_org_invite(text, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_org_invite_token(text) TO authenticated;

COMMENT ON FUNCTION public.create_org_invite(text, text, text, timestamptz) IS
  'Creates one organization-bound invitation after checking the authenticated actor active organization, membership and role.';
COMMENT ON FUNCTION public.accept_org_invite_token(text) IS
  'Atomically accepts an organization invitation only when its email matches the authenticated JWT email claim.';

COMMIT;
