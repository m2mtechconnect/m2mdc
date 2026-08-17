CREATE OR REPLACE FUNCTION public.consume_public_intake_quota(
  _bucket_key text,
  _intake_kind text,
  _limit integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
BEGIN
  INSERT INTO public.public_intake_rate_limits (bucket_key, intake_kind, window_start, request_count)
  VALUES (_bucket_key, _intake_kind, date_trunc('hour', now()), 1)
  ON CONFLICT (bucket_key, intake_kind, window_start)
  DO UPDATE SET request_count = public.public_intake_rate_limits.request_count + 1,
                updated_at = now()
  RETURNING request_count INTO _count;

  RETURN _count <= _limit;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_public_intake_quota(text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_public_intake_quota(text, text, integer) TO service_role;