-- AURA Phase 2: canonical facility setup and starter-twin deprecation.
--
-- Goals:
-- 1. Approval must never fabricate a Montreal/Tier III/5000 kW starter twin.
-- 2. First facility creation is an authenticated, tenant-bound transaction.
-- 3. Optional operational/design evidence remains NULL until explicitly supplied.
-- 4. Existing rows are preserved. This migration does not delete customer data.

BEGIN;

-- Retain the compatibility function signature because legacy approval flows call it,
-- but stop it from creating any resource. If a real twin already exists, return it;
-- otherwise return NULL and let the product's facility setup flow collect operator input.
CREATE OR REPLACE FUNCTION public.provision_default_twin(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_twin_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT t.id
  INTO v_twin_id
  FROM public.data_centre_twins t
  WHERE t.created_by_user = _user_id
    AND COALESCE(t.metadata ->> 'provisioned', '') <> 'default_starter_twin'
  ORDER BY t.created_at ASC, t.id ASC
  LIMIT 1;

  RETURN v_twin_id;
END;
$$;

COMMENT ON FUNCTION public.provision_default_twin(uuid) IS
  'Compatibility no-op for approval flows. Never fabricates a starter facility; returns an existing non-placeholder twin or NULL.';

-- Canonical first-run facility transaction. The function deliberately accepts only
-- identity/design inputs required by the current product flow. PUE, renewable mix,
-- carbon intensity and sovereignty remain NULL because they require separate evidence.
CREATE OR REPLACE FUNCTION public.create_facility_setup(
  _name text,
  _city text,
  _province text,
  _country text,
  _region_code text,
  _tier text,
  _capacity_kw integer,
  _source text DEFAULT 'manage-facilities'
)
RETURNS TABLE(location_id uuid, twin_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_location_id uuid;
  v_twin_id uuid;
  v_name text;
  v_city text;
  v_province text;
  v_country text;
  v_region_code text;
  v_tier text;
  v_source text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  v_org_id := public.active_org_id();
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'active organization is required';
  END IF;

  IF NOT public.org_has_role(
    v_org_id,
    v_user_id,
    ARRAY['owner','admin','operator','engineer','manager']::text[]
  ) THEN
    RAISE EXCEPTION 'facility write permission required';
  END IF;

  v_name := NULLIF(trim(COALESCE(_name, '')), '');
  v_city := NULLIF(trim(COALESCE(_city, '')), '');
  v_province := NULLIF(trim(COALESCE(_province, '')), '');
  v_country := NULLIF(trim(COALESCE(_country, '')), '');
  v_region_code := NULLIF(trim(COALESCE(_region_code, '')), '');
  v_tier := NULLIF(trim(COALESCE(_tier, '')), '');
  v_source := COALESCE(NULLIF(trim(COALESCE(_source, '')), ''), 'manage-facilities');

  IF v_name IS NULL THEN RAISE EXCEPTION 'facility name is required'; END IF;
  IF v_city IS NULL THEN RAISE EXCEPTION 'facility city is required'; END IF;
  IF v_country IS NULL THEN RAISE EXCEPTION 'facility country is required'; END IF;
  IF v_region_code IS NULL THEN RAISE EXCEPTION 'facility region is required'; END IF;
  IF v_tier IS NULL OR v_tier <> ALL (ARRAY['Tier I','Tier II','Tier III','Tier IV']::text[]) THEN
    RAISE EXCEPTION 'valid facility tier is required';
  END IF;
  IF _capacity_kw IS NULL OR _capacity_kw <= 0 THEN
    RAISE EXCEPTION 'design capacity must be greater than 0 kW';
  END IF;

  INSERT INTO public.data_centre_locations (
    name,
    city,
    province,
    country,
    cloud_region,
    provider_type,
    industry,
    capacity_kw,
    tier,
    tags,
    created_by
  )
  VALUES (
    v_name || ' - ' || v_city,
    v_city,
    v_province,
    v_country,
    v_region_code,
    'Unspecified',
    'data_centre',
    _capacity_kw,
    v_tier,
    '[]'::jsonb,
    v_user_id
  )
  RETURNING id INTO v_location_id;

  INSERT INTO public.data_centre_twins (
    location_id,
    name,
    city,
    region_code,
    tier,
    capacity_kw,
    industry,
    sovereignty_level,
    pue_target,
    renewable_target_pct,
    carbon_intensity,
    metadata,
    created_by_user,
    org_id
  )
  VALUES (
    v_location_id,
    v_name,
    v_city,
    v_region_code,
    v_tier,
    _capacity_kw,
    'data_centre',
    NULL,
    NULL,
    NULL,
    NULL,
    jsonb_build_object(
      'created_from', v_source,
      'facility_inputs', jsonb_build_object(
        'region_code', v_region_code,
        'tier', v_tier,
        'capacity_kw', _capacity_kw
      ),
      'evidence_state', 'operator_supplied_design_inputs'
    ),
    v_user_id,
    v_org_id
  )
  RETURNING id INTO v_twin_id;

  RETURN QUERY SELECT v_location_id, v_twin_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_facility_setup(text, text, text, text, text, text, integer, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_facility_setup(text, text, text, text, text, text, integer, text)
  TO authenticated;

COMMENT ON FUNCTION public.create_facility_setup(text, text, text, text, text, text, integer, text) IS
  'Creates the canonical facility location+twin transaction for the caller active organization. Optional evidence fields remain NULL until explicitly supplied.';

COMMIT;
