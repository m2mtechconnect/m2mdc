-- Create the trigger that was missing
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also backfill the missing profile for dami@m2mtechconnect.com
INSERT INTO public.profiles (user_id, email, full_name, is_approved, avatar_bg_color, avatar_initials)
VALUES (
  'dc4ffd38-7474-4ece-a76d-9203538687ed',
  'dami@m2mtechconnect.com',
  '',
  false,
  public.generate_avatar_color('dc4ffd38-7474-4ece-a76d-9203538687ed'::uuid),
  public.generate_initials('', 'dami@m2mtechconnect.com')
)
ON CONFLICT (user_id) DO NOTHING;