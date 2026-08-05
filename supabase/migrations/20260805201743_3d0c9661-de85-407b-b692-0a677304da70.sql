
-- 1) Admins can view all twins
DROP POLICY IF EXISTS "Admins can view all twins" ON public.data_centre_twins;
CREATE POLICY "Admins can view all twins"
ON public.data_centre_twins
FOR SELECT
TO authenticated
USING (public.check_user_has_role(auth.uid(), 'admin'));

-- 2) Auto-provision a starter twin for approved users who have none
CREATE OR REPLACE FUNCTION public.provision_default_twin(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_twin_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_twin_id
  FROM public.data_centre_twins
  WHERE created_by_user = _user_id
  LIMIT 1;

  IF v_twin_id IS NOT NULL THEN
    RETURN v_twin_id;
  END IF;

  INSERT INTO public.data_centre_twins (
    name, city, region_code, tier, capacity_kw, created_by_user,
    industry, pue_target, renewable_target_pct, carbon_intensity,
    sovereignty_level, metadata
  ) VALUES (
    'Montreal Sovereign AI DC', 'Montreal', 'CA-QC', 'Tier III', 5000, _user_id,
    'cloud_saas', 1.3, 80, 30, 'sovereign',
    jsonb_build_object('provisioned', 'default_starter_twin')
  )
  RETURNING id INTO v_twin_id;

  RETURN v_twin_id;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_default_twin(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.on_profile_approved_provision_twin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_approved THEN
    PERFORM public.provision_default_twin(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_approved_provision_twin_ins ON public.profiles;
CREATE TRIGGER trg_profile_approved_provision_twin_ins
AFTER INSERT ON public.profiles
FOR EACH ROW
WHEN (NEW.is_approved)
EXECUTE FUNCTION public.on_profile_approved_provision_twin();

DROP TRIGGER IF EXISTS trg_profile_approved_provision_twin_upd ON public.profiles;
CREATE TRIGGER trg_profile_approved_provision_twin_upd
AFTER UPDATE OF is_approved ON public.profiles
FOR EACH ROW
WHEN (NEW.is_approved AND NOT COALESCE(OLD.is_approved, false))
EXECUTE FUNCTION public.on_profile_approved_provision_twin();
