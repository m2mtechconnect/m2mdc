-- AURA enterprise compatibility remediation.
--
-- The legacy profile-approval trigger provisions a starter data-centre twin through
-- public.provision_default_twin(). Core-resource tenancy now requires every
-- privileged insert to state org_id explicitly. Preserve the approval workflow
-- without weakening stamp_active_org_id(): resolve the represented user's active
-- organization from durable memberships and skip starter-twin creation for a
-- platform-only account that has no tenant membership.
--
-- Rollback: restore the previous provision_default_twin(uuid) body. This migration
-- changes no table shape, RLS policy, data ownership, or trigger registration.

BEGIN;

CREATE OR REPLACE FUNCTION public.provision_default_twin(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_twin_id uuid;
  v_profile_org_id uuid;
  v_org_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id
  INTO v_twin_id
  FROM public.data_centre_twins
  WHERE created_by_user = _user_id
  LIMIT 1;

  IF v_twin_id IS NOT NULL THEN
    RETURN v_twin_id;
  END IF;

  SELECT COALESCE(p.last_active_org_id, p.org_id)
  INTO v_profile_org_id
  FROM public.profiles p
  WHERE p.user_id = _user_id
  LIMIT 1;

  IF v_profile_org_id IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.org_memberships m
       WHERE m.org_id = v_profile_org_id
         AND m.user_id = _user_id
         AND m.status = 'active'
     ) THEN
    v_org_id := v_profile_org_id;
  ELSE
    SELECT m.org_id
    INTO v_org_id
    FROM public.org_memberships m
    WHERE m.user_id = _user_id
      AND m.status = 'active'
    ORDER BY m.is_default DESC, m.created_at ASC, m.org_id ASC
    LIMIT 1;
  END IF;

  -- Platform-only approval must not create an orphan tenant resource. The user
  -- receives a starter twin once an organization membership exists and the
  -- provisioner is invoked in that tenant context.
  IF v_org_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.data_centre_twins (
    name,
    city,
    region_code,
    tier,
    capacity_kw,
    created_by_user,
    org_id,
    industry,
    pue_target,
    renewable_target_pct,
    carbon_intensity,
    sovereignty_level,
    metadata
  )
  VALUES (
    'Montreal Sovereign AI DC',
    'Montreal',
    'CA-QC',
    'Tier III',
    5000,
    _user_id,
    v_org_id,
    'cloud_saas',
    1.3,
    80,
    30,
    'sovereign',
    jsonb_build_object('provisioned', 'default_starter_twin')
  )
  RETURNING id INTO v_twin_id;

  RETURN v_twin_id;
END;
$$;

COMMIT;
