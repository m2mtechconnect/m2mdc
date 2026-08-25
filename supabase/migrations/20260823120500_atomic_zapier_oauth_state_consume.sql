-- Consume Zapier OAuth state in one database statement so concurrent callback
-- requests cannot both observe and use the same one-time token.
--
-- This is deliberately service-role only. The callback Edge Function is the
-- trust boundary; browsers and normal authenticated clients must not be able to
-- consume arbitrary OAuth state tokens through PostgREST.

CREATE OR REPLACE FUNCTION public.consume_zapier_oauth_state(p_state_token text)
RETURNS TABLE (
  user_id uuid,
  system_id uuid,
  app_id text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.oauth_states AS state
  SET
    used = true,
    used_at = now()
  WHERE state.state_token = p_state_token
    AND state.provider = 'zapier'
    AND state.used = false
    AND state.expires_at > now()
  RETURNING state.user_id, state.system_id, state.app_id;
$$;

REVOKE ALL ON FUNCTION public.consume_zapier_oauth_state(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_zapier_oauth_state(text) FROM anon;
REVOKE ALL ON FUNCTION public.consume_zapier_oauth_state(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.consume_zapier_oauth_state(text) TO service_role;
