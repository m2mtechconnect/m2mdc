-- AURA production reconciliation: make builder/system activation a single
-- database-authorized transaction. Browser state and Edge Function caller
-- claims are not sufficient authority.

CREATE OR REPLACE FUNCTION public.activate_builder_deployment(
  p_builder_id uuid,
  p_model text,
  p_grounding boolean,
  p_region text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile_count integer := 0;
  v_profile_approved boolean := false;
  v_deployment_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT count(*)::integer, coalesce(bool_and(p.is_approved), false)
    INTO v_profile_count, v_profile_approved
  FROM public.profiles AS p
  WHERE p.user_id = v_user_id;

  IF v_profile_count <> 1 OR v_profile_approved IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Approved profile required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles AS ur
    WHERE ur.user_id = v_user_id
      AND ur.role::text = ANY (ARRAY[
        'security_admin',
        'admin',
        'owner',
        'manager',
        'engineer',
        'operator'
      ]::text[])
      AND (ur.scope IS NULL OR ur.scope = 'global')
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
  ) THEN
    RAISE EXCEPTION 'Deployment execution permission required' USING ERRCODE = '42501';
  END IF;

  -- Lock the caller-owned builder before recording activation. If any later
  -- statement fails, PostgreSQL rolls the whole function call back.
  PERFORM 1
  FROM public.agents AS a
  WHERE a.id = p_builder_id
    AND a.owner_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Builder not found or not owned by caller' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.deployments (
    system_id,
    version,
    status,
    deployed_by,
    region,
    model,
    grounding,
    runtime_url,
    health,
    error_message
  )
  VALUES (
    p_builder_id,
    'v1',
    'active',
    v_user_id,
    coalesce(nullif(trim(p_region), ''), 'northamerica-northeast1'),
    nullif(trim(p_model), ''),
    p_grounding,
    NULL,
    NULL,
    NULL
  )
  RETURNING id INTO v_deployment_id;

  UPDATE public.agents
  SET status = 'active',
      deployed_at = now()
  WHERE id = p_builder_id
    AND owner_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Builder activation failed' USING ERRCODE = 'P0001';
  END IF;

  RETURN v_deployment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_builder_deployment(uuid, text, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.activate_builder_deployment(uuid, text, boolean, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.activate_builder_deployment(uuid, text, boolean, text) TO authenticated;

COMMENT ON FUNCTION public.activate_builder_deployment(uuid, text, boolean, text) IS
  'Atomically activates one caller-owned AURA system only for an approved user with an active global deployment-execute role grant. Runtime health is not inferred.';
