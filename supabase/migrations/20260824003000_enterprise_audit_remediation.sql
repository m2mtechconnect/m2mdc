-- AURA enterprise audit remediation.
-- Align the database authorization boundary with the canonical tenant permission model,
-- make active-organization fallback deterministic, and expose guarded tenant/platform
-- read models without creating additional Edge Function perimeter surface.

BEGIN;

-- Server and client must resolve the same active organization. If a legacy profile
-- pointer is missing/stale, fall back to the active default membership, then the
-- oldest active membership. Explicit switches still persist through set_active_org().
CREATE OR REPLACE FUNCTION public.active_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  WITH profile_candidate AS (
    SELECT COALESCE(p.last_active_org_id, p.org_id) AS org_id
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
    LIMIT 1
  ),
  valid_profile_candidate AS (
    SELECT pc.org_id
    FROM profile_candidate pc
    WHERE pc.org_id IS NOT NULL
      AND public.is_org_member(pc.org_id, auth.uid())
  ),
  fallback_membership AS (
    SELECT m.org_id
    FROM public.org_memberships m
    WHERE m.user_id = auth.uid()
      AND m.status = 'active'
    ORDER BY m.is_default DESC, m.created_at ASC, m.org_id ASC
    LIMIT 1
  )
  SELECT COALESCE(
    (SELECT org_id FROM valid_profile_candidate LIMIT 1),
    (SELECT org_id FROM fallback_membership LIMIT 1)
  )
$$;

-- Canonical tenant writers: owner/admin/operator/engineer/manager. Executive,
-- security-admin, compliance, analyst, support and viewer are read-oriented for
-- twin resources in src/auth/organizationAuthorization.ts.
DROP POLICY IF EXISTS "Users can create their own twins" ON public.data_centre_twins;
CREATE POLICY "Users can create their own twins"
  ON public.data_centre_twins FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by_user
    AND org_id = public.active_org_id()
    AND public.org_has_role(
      org_id,
      auth.uid(),
      ARRAY['owner','admin','operator','engineer','manager']::text[]
    )
  );

DROP POLICY IF EXISTS "Users can create their own digital twins" ON public.digital_twins;
CREATE POLICY "Users can create their own digital twins"
  ON public.digital_twins FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND org_id = public.active_org_id()
    AND public.org_has_role(
      org_id,
      auth.uid(),
      ARRAY['owner','admin','operator','engineer','manager']::text[]
    )
  );

DROP POLICY IF EXISTS "Users can create their own facilities" ON public.sovereign_dc_facilities;
CREATE POLICY "Users can create their own facilities"
  ON public.sovereign_dc_facilities FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
    AND org_id = public.active_org_id()
    AND public.org_has_role(
      org_id,
      auth.uid(),
      ARRAY['owner','admin','operator','engineer','manager']::text[]
    )
  );

DROP POLICY IF EXISTS data_centre_twins_org_update ON public.data_centre_twins;
CREATE POLICY data_centre_twins_org_update
  ON public.data_centre_twins FOR UPDATE TO authenticated
  USING (public.org_has_role(org_id, auth.uid(), ARRAY['owner','admin','operator','engineer','manager']::text[]))
  WITH CHECK (public.org_has_role(org_id, auth.uid(), ARRAY['owner','admin','operator','engineer','manager']::text[]));

DROP POLICY IF EXISTS digital_twins_org_update ON public.digital_twins;
CREATE POLICY digital_twins_org_update
  ON public.digital_twins FOR UPDATE TO authenticated
  USING (public.org_has_role(org_id, auth.uid(), ARRAY['owner','admin','operator','engineer','manager']::text[]))
  WITH CHECK (public.org_has_role(org_id, auth.uid(), ARRAY['owner','admin','operator','engineer','manager']::text[]));

DROP POLICY IF EXISTS sovereign_dc_facilities_org_update ON public.sovereign_dc_facilities;
CREATE POLICY sovereign_dc_facilities_org_update
  ON public.sovereign_dc_facilities FOR UPDATE TO authenticated
  USING (public.org_has_role(org_id, auth.uid(), ARRAY['owner','admin','operator','engineer','manager']::text[]))
  WITH CHECK (public.org_has_role(org_id, auth.uid(), ARRAY['owner','admin','operator','engineer','manager']::text[]));

DROP POLICY IF EXISTS digital_twin_runs_org_write ON public.digital_twin_runs;
CREATE POLICY digital_twin_runs_org_write
  ON public.digital_twin_runs FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.digital_twins t
    WHERE t.id = digital_twin_runs.twin_id
      AND public.org_has_role(t.org_id, auth.uid(), ARRAY['owner','admin','operator','engineer','manager']::text[])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.digital_twins t
    WHERE t.id = digital_twin_runs.twin_id
      AND public.org_has_role(t.org_id, auth.uid(), ARRAY['owner','admin','operator','engineer','manager']::text[])
  ));

DROP POLICY IF EXISTS sovereign_dc_simulation_runs_org_write ON public.sovereign_dc_simulation_runs;
CREATE POLICY sovereign_dc_simulation_runs_org_write
  ON public.sovereign_dc_simulation_runs FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sovereign_dc_facilities f
    WHERE f.id = sovereign_dc_simulation_runs.facility_id
      AND public.org_has_role(f.org_id, auth.uid(), ARRAY['owner','admin','operator','engineer','manager']::text[])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sovereign_dc_facilities f
    WHERE f.id = sovereign_dc_simulation_runs.facility_id
      AND public.org_has_role(f.org_id, auth.uid(), ARRAY['owner','admin','operator','engineer','manager']::text[])
  ));

DROP POLICY IF EXISTS twin_simulation_runs_org_write ON public.twin_simulation_runs;
CREATE POLICY twin_simulation_runs_org_write
  ON public.twin_simulation_runs FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_simulation_runs.twin_id
      AND public.org_has_role(t.org_id, auth.uid(), ARRAY['owner','admin','operator','engineer','manager']::text[])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.data_centre_twins t
    WHERE t.id = twin_simulation_runs.twin_id
      AND public.org_has_role(t.org_id, auth.uid(), ARRAY['owner','admin','operator','engineer','manager']::text[])
  ));

-- Tenant People & Access snapshot. PII is returned only to organization roles
-- that carry tenant.view_members in the canonical frontend model.
CREATE OR REPLACE FUNCTION public.tenant_people_access_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_org_id uuid;
  v_org_name text;
  v_members jsonb;
  v_invites jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  v_org_id := public.active_org_id();
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'active organization is required';
  END IF;

  IF NOT public.org_has_role(
    v_org_id,
    auth.uid(),
    ARRAY['owner','admin','security_admin','manager','executive','compliance']::text[]
  ) THEN
    RAISE EXCEPTION 'member-list permission required';
  END IF;

  SELECT o.name INTO v_org_name
  FROM public.organizations o
  WHERE o.id = v_org_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'userId', m.user_id,
        'name', COALESCE(NULLIF(trim(p.full_name), ''), split_part(COALESCE(p.email, ''), '@', 1), 'Member'),
        'email', p.email,
        'role', m.role,
        'status', m.status,
        'joinedAt', m.created_at,
        'avatarUrl', p.avatar_url,
        'avatarBgColor', p.avatar_bg_color,
        'avatarInitials', p.avatar_initials
      ) ORDER BY m.created_at ASC
    ),
    '[]'::jsonb
  ) INTO v_members
  FROM public.org_memberships m
  LEFT JOIN public.profiles p ON p.user_id = m.user_id
  WHERE m.org_id = v_org_id
    AND m.status = 'active';

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'email', i.email,
        'role', i.role,
        'status', i.status,
        'expiresAt', i.expires_at,
        'createdAt', i.created_at
      ) ORDER BY i.created_at DESC
    ),
    '[]'::jsonb
  ) INTO v_invites
  FROM public.team_invites i
  WHERE i.org_id = v_org_id
    AND i.status = 'pending';

  RETURN jsonb_build_object(
    'organization', jsonb_build_object('id', v_org_id, 'name', v_org_name),
    'members', v_members,
    'invites', v_invites
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_active_org_member_role(_user_id uuid, _role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_org_id uuid;
  v_caller_role text;
  v_target_role text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF _user_id IS NULL OR _role IS NULL THEN RAISE EXCEPTION 'user and role are required'; END IF;
  IF _user_id = auth.uid() THEN RAISE EXCEPTION 'use another administrator to change your own role'; END IF;

  IF _role <> ALL (ARRAY['admin','operator','engineer','manager','executive','security_admin','compliance','data_analyst','support','viewer']::text[]) THEN
    RAISE EXCEPTION 'invalid organization role';
  END IF;

  v_org_id := public.active_org_id();
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'active organization is required'; END IF;

  SELECT m.role INTO v_caller_role
  FROM public.org_memberships m
  WHERE m.org_id = v_org_id AND m.user_id = auth.uid() AND m.status = 'active';

  IF v_caller_role IS NULL OR v_caller_role <> ALL (ARRAY['owner','admin','security_admin']::text[]) THEN
    RAISE EXCEPTION 'member-management permission required';
  END IF;

  IF _role = ANY (ARRAY['admin','security_admin']::text[]) AND v_caller_role <> 'owner' THEN
    RAISE EXCEPTION 'only the organization owner can grant elevated administration';
  END IF;

  SELECT m.role INTO v_target_role
  FROM public.org_memberships m
  WHERE m.org_id = v_org_id AND m.user_id = _user_id AND m.status = 'active';

  IF v_target_role IS NULL THEN RAISE EXCEPTION 'active membership not found'; END IF;
  IF v_target_role = 'owner' THEN RAISE EXCEPTION 'owner role cannot be changed through member management'; END IF;

  UPDATE public.org_memberships
  SET role = _role, updated_at = now()
  WHERE org_id = v_org_id AND user_id = _user_id AND status = 'active';
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_active_org_member(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_org_id uuid;
  v_caller_role text;
  v_target_role text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF _user_id IS NULL THEN RAISE EXCEPTION 'user is required'; END IF;
  IF _user_id = auth.uid() THEN RAISE EXCEPTION 'you cannot remove your own active membership'; END IF;

  v_org_id := public.active_org_id();
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'active organization is required'; END IF;

  SELECT m.role INTO v_caller_role
  FROM public.org_memberships m
  WHERE m.org_id = v_org_id AND m.user_id = auth.uid() AND m.status = 'active';

  IF v_caller_role IS NULL OR v_caller_role <> ALL (ARRAY['owner','admin','security_admin']::text[]) THEN
    RAISE EXCEPTION 'member-management permission required';
  END IF;

  SELECT m.role INTO v_target_role
  FROM public.org_memberships m
  WHERE m.org_id = v_org_id AND m.user_id = _user_id AND m.status = 'active';

  IF v_target_role IS NULL THEN RAISE EXCEPTION 'active membership not found'; END IF;
  IF v_target_role = 'owner' THEN RAISE EXCEPTION 'organization owner cannot be removed through member management'; END IF;

  UPDATE public.org_memberships
  SET status = 'suspended', is_default = false, updated_at = now()
  WHERE org_id = v_org_id AND user_id = _user_id AND status = 'active';
END;
$$;

-- Platform customer inventory is exposed as a bounded, paginated read model.
-- It does not create an extra Edge Function and independently proves approval
-- plus a live global owner grant before cross-tenant reads.
CREATE OR REPLACE FUNCTION public.platform_list_organizations(
  _page integer DEFAULT 1,
  _page_size integer DEFAULT 25,
  _search text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id uuid;
  v_page integer;
  v_page_size integer;
  v_offset integer;
  v_term text;
  v_total bigint;
  v_organizations jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = v_user_id AND p.is_approved = true
  ) THEN
    RAISE EXCEPTION 'approved platform account required';
  END IF;

  IF public.user_has_role(v_user_id, 'owner', 'global') IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'platform owner role required';
  END IF;

  v_page := GREATEST(COALESCE(_page, 1), 1);
  v_page_size := LEAST(GREATEST(COALESCE(_page_size, 25), 1), 100);
  v_offset := (v_page - 1) * v_page_size;
  v_term := NULLIF(trim(COALESCE(_search, '')), '');

  SELECT count(*) INTO v_total
  FROM public.organizations o
  WHERE v_term IS NULL
    OR o.name ILIKE '%' || v_term || '%'
    OR COALESCE(o.domain, '') ILIKE '%' || v_term || '%'
    OR COALESCE(o.industry, '') ILIKE '%' || v_term || '%';

  SELECT COALESCE(jsonb_agg(q.row_json ORDER BY q.created_at DESC), '[]'::jsonb)
  INTO v_organizations
  FROM (
    SELECT
      o.created_at,
      jsonb_build_object(
        'id', o.id,
        'name', o.name,
        'domain', o.domain,
        'industry', o.industry,
        'mfa_enabled', o.mfa_enabled,
        'sso_enabled', o.sso_enabled,
        'created_at', o.created_at,
        'memberCount', (SELECT count(*) FROM public.org_memberships m WHERE m.org_id = o.id AND m.status = 'active'),
        'facilityCount', (SELECT count(*) FROM public.sovereign_dc_facilities f WHERE f.org_id = o.id),
        'twinCount', (SELECT count(*) FROM public.data_centre_twins t WHERE t.org_id = o.id),
        'connectionCount', (SELECT count(*) FROM public.connection_instances c WHERE c.tenant_id = o.id),
        'edgeGatewayCount', (SELECT count(*) FROM public.edge_gateways g WHERE g.org_id = o.id),
        'onlineEdgeGatewayCount', (SELECT count(*) FROM public.edge_gateways g WHERE g.org_id = o.id AND g.status = 'ONLINE'),
        'ownerInvite', CASE WHEN oi.id IS NULL THEN NULL ELSE jsonb_build_object(
          'id', oi.id,
          'email', oi.email,
          'status', oi.status,
          'expiresAt', oi.expires_at
        ) END,
        'deploymentProfile', CASE WHEN dp.org_id IS NULL THEN NULL ELSE jsonb_build_object(
          'type', dp.deployment_type,
          'capabilityStatus', dp.capability_status,
          'lifecycleStatus', dp.lifecycle_status,
          'automationStatus', dp.automation_status,
          'hostingProvider', dp.hosting_provider,
          'preferredRegion', dp.preferred_region,
          'controlPlaneLocation', dp.control_plane_location,
          'dataPlaneLocation', dp.data_plane_location,
          'customerManaged', dp.customer_managed,
          'edgeRequired', dp.edge_required,
          'dataResidency', dp.data_residency
        ) END
      ) AS row_json
    FROM public.organizations o
    LEFT JOIN LATERAL (
      SELECT i.id, i.email, i.status, i.expires_at
      FROM public.team_invites i
      WHERE i.org_id = o.id AND i.role = 'owner'
      ORDER BY (i.status = 'pending') DESC, i.created_at DESC
      LIMIT 1
    ) oi ON true
    LEFT JOIN public.organization_deployment_profiles dp ON dp.org_id = o.id
    WHERE v_term IS NULL
      OR o.name ILIKE '%' || v_term || '%'
      OR COALESCE(o.domain, '') ILIKE '%' || v_term || '%'
      OR COALESCE(o.industry, '') ILIKE '%' || v_term || '%'
    ORDER BY o.created_at DESC
    LIMIT v_page_size OFFSET v_offset
  ) q;

  RETURN jsonb_build_object(
    'organizations', v_organizations,
    'page', v_page,
    'pageSize', v_page_size,
    'total', v_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.tenant_people_access_snapshot() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_active_org_member_role(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_active_org_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.platform_list_organizations(integer, integer, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.tenant_people_access_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_active_org_member_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_active_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_list_organizations(integer, integer, text) TO authenticated;

COMMIT;
