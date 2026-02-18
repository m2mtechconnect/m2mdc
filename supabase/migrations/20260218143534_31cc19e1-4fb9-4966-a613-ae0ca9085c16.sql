-- Enable realtime for profiles table to support live signup tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;