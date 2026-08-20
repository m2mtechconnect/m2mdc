-- Create the trigger that was missing
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill only when the corresponding auth identity exists. Clean database
-- replays must not fabricate auth.users rows or fail on user-specific data that
-- existed only in the source environment.
INSERT INTO public.profiles (user_id, email, full_name, is_approved, avatar_bg_color, avatar_initials)
SELECT
  source_user.id,
  'dami@m2mtechconnect.com',
  '',
  false,
  public.generate_avatar_color(source_user.id),
  public.generate_initials('', 'dami@m2mtechconnect.com')
FROM auth.users AS source_user
WHERE source_user.id = 'dc4ffd38-7474-4ece-a76d-9203538687ed'::uuid
ON CONFLICT (user_id) DO NOTHING;
