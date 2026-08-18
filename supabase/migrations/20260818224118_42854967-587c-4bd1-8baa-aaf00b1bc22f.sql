GRANT ALL ON public.agent_suggestions_cache TO service_role;
REVOKE ALL ON public.agent_suggestions_cache FROM anon, authenticated;
ALTER TABLE public.agent_suggestions_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_suggestions_cache FORCE ROW LEVEL SECURITY;
COMMENT ON TABLE public.agent_suggestions_cache IS 'Server-only cache written and read exclusively by the agent-suggestions edge function using the service role. Intentionally has no RLS policies: all client (anon/authenticated) access is fail-closed.';