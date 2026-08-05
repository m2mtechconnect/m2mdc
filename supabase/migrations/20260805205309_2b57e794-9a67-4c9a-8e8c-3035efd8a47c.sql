ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check CHECK (
  role = ANY (ARRAY[
    'admin','operator','viewer','owner',
    'executive','manager','engineer','security_admin',
    'compliance','data_analyst','marketing','sales','support','finance'
  ]::text[])
);

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
      VALUES (NEW.user_id, 'engineer');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;