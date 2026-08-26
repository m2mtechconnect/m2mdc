BEGIN;

REVOKE EXECUTE ON FUNCTION public.connection_tenant_visible(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.connection_visible(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.connection_tenant_visible(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.connection_visible(uuid) TO authenticated, service_role;

-- Make the service-role-only intent of the suggestion cache explicit rather
-- than leaving RLS enabled with zero declared policies.
DROP POLICY IF EXISTS agent_suggestions_cache_no_end_user_access ON public.agent_suggestions_cache;
CREATE POLICY agent_suggestions_cache_no_end_user_access
  ON public.agent_suggestions_cache FOR SELECT TO authenticated
  USING (false);

COMMIT;