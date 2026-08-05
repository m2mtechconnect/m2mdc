CREATE OR REPLACE FUNCTION public.on_profile_approved_grant_default_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_approved THEN
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id) THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.user_id, 'engineer'::public.app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_approved_grant_default_role_ins ON public.profiles;
CREATE TRIGGER trg_profile_approved_grant_default_role_ins
AFTER INSERT ON public.profiles
FOR EACH ROW
WHEN (NEW.is_approved)
EXECUTE FUNCTION public.on_profile_approved_grant_default_role();

DROP TRIGGER IF EXISTS trg_profile_approved_grant_default_role_upd ON public.profiles;
CREATE TRIGGER trg_profile_approved_grant_default_role_upd
AFTER UPDATE OF is_approved ON public.profiles
FOR EACH ROW
WHEN (NEW.is_approved AND (OLD.is_approved IS DISTINCT FROM NEW.is_approved))
EXECUTE FUNCTION public.on_profile_approved_grant_default_role();