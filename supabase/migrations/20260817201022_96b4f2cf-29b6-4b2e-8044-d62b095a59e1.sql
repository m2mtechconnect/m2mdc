-- 1. asset_canary_events: admin/owner only
DROP POLICY IF EXISTS "Authenticated users can read canary history" ON public.asset_canary_events;
CREATE POLICY "asset_canary_events_admin_read"
ON public.asset_canary_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role));

-- 2. connector_definitions: explicit publication state
ALTER TABLE public.connector_definitions
  ADD COLUMN IF NOT EXISTS publication_status text NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE public.connector_definitions
  DROP CONSTRAINT IF EXISTS connector_definitions_publication_status_check;
ALTER TABLE public.connector_definitions
  ADD CONSTRAINT connector_definitions_publication_status_check
  CHECK (publication_status IN ('PUBLISHED','DRAFT','INTERNAL','BLOCKED'));

DROP POLICY IF EXISTS "connector_definitions_read" ON public.connector_definitions;
CREATE POLICY "connector_definitions_published_read"
ON public.connector_definitions FOR SELECT TO authenticated
USING (publication_status = 'PUBLISHED');
CREATE POLICY "connector_definitions_admin_read_all"
ON public.connector_definitions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role));

-- 3. connection_data_contracts: platform templates vs tenant contracts
ALTER TABLE public.connection_data_contracts
  ADD COLUMN IF NOT EXISTS tenant_id uuid;
COMMENT ON COLUMN public.connection_data_contracts.tenant_id IS
  'NULL = platform-published template. Non-null = tenant-owned contract, readable only by that tenant.';

DROP POLICY IF EXISTS "connection_data_contracts_read" ON public.connection_data_contracts;
CREATE POLICY "connection_data_contracts_platform_template_read"
ON public.connection_data_contracts FOR SELECT TO authenticated
USING (tenant_id IS NULL AND validation_status IN ('VALIDATED','RUNTIME_VERIFIED'));
CREATE POLICY "connection_data_contracts_tenant_read"
ON public.connection_data_contracts FOR SELECT TO authenticated
USING (tenant_id IS NOT NULL AND tenant_id = public.current_tenant_id());
CREATE POLICY "connection_data_contracts_admin_read_all"
ON public.connection_data_contracts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role));

-- 4. agent_suggestions_cache: no client access at all (service role only)
DROP POLICY IF EXISTS "Allow anonymous read of valid cache" ON public.agent_suggestions_cache;
REVOKE ALL ON public.agent_suggestions_cache FROM anon;
REVOKE ALL ON public.agent_suggestions_cache FROM authenticated;
GRANT ALL ON public.agent_suggestions_cache TO service_role;

-- 5. contact_expert_logs: server-derived identity
ALTER TABLE public.contact_expert_logs
  ADD COLUMN IF NOT EXISTS intake_source text NOT NULL DEFAULT 'AUTHENTICATED_CLIENT',
  ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS correlation_id uuid NOT NULL DEFAULT gen_random_uuid();

DROP POLICY IF EXISTS "Authenticated users can create contact logs" ON public.contact_expert_logs;
CREATE POLICY "contact_expert_logs_self_insert"
ON public.contact_expert_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND is_anonymous = false);
GRANT ALL ON public.contact_expert_logs TO service_role;

-- 6. onboarding_submissions: server-controlled intake only
ALTER TABLE public.onboarding_submissions
  ADD COLUMN IF NOT EXISTS correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS intake_source text NOT NULL DEFAULT 'SERVER_INTAKE';

DROP POLICY IF EXISTS "Anyone can submit onboarding form" ON public.onboarding_submissions;
REVOKE INSERT ON public.onboarding_submissions FROM anon;
REVOKE INSERT ON public.onboarding_submissions FROM authenticated;
GRANT ALL ON public.onboarding_submissions TO service_role;

-- 7. rate limiting for public intake (service role only)
CREATE TABLE IF NOT EXISTS public.public_intake_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_key text NOT NULL,
  intake_kind text NOT NULL,
  window_start timestamp with time zone NOT NULL DEFAULT date_trunc('hour', now()),
  request_count integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (bucket_key, intake_kind, window_start)
);
GRANT ALL ON public.public_intake_rate_limits TO service_role;
ALTER TABLE public.public_intake_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_intake_rate_limits_service_only"
ON public.public_intake_rate_limits FOR ALL TO authenticated
USING (false) WITH CHECK (false);
CREATE TRIGGER public_intake_rate_limits_updated_at
BEFORE UPDATE ON public.public_intake_rate_limits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. quarantine legacy Google OAuth token storage
DROP POLICY IF EXISTS "Users can manage their own RAG tokens" ON public.rag_tokens;
CREATE POLICY "rag_tokens_quarantined_no_client_access"
ON public.rag_tokens FOR ALL TO authenticated
USING (false) WITH CHECK (false);
REVOKE ALL ON public.rag_tokens FROM anon;
REVOKE ALL ON public.rag_tokens FROM authenticated;
COMMENT ON TABLE public.rag_tokens IS
  'QUARANTINED: legacy parallel Google/Microsoft OAuth token store. No client access. Zero rows. Superseded by the managed App User Connector path.';