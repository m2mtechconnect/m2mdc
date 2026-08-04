-- 1. Function search_path
ALTER FUNCTION public.update_document_analysis_jobs_updated_at() SET search_path = public;

-- 2. Lock down SECURITY DEFINER functions exposed via the Data API
-- 2a. Vault access: server-side (edge functions) only
REVOKE ALL ON FUNCTION public.store_secret_in_vault(text, text) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.get_secret_from_vault(text) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.update_secret_in_vault(text, text) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.delete_secret_from_vault(text) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.store_secret_in_vault(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_secret_from_vault(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_secret_in_vault(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_secret_from_vault(text) TO service_role;

-- 2b. Maintenance / cleanup routines: server-side only
REVOKE ALL ON FUNCTION public.cleanup_agent_suggestions_cache() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_expired_oauth_states() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_old_copilot_cache() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_old_copilot_events() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_old_copilot_memory() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_agent_suggestions_cache() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_oauth_states() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_copilot_cache() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_copilot_events() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_copilot_memory() TO service_role;

-- 2c. Trigger-only helpers must never be callable over the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.dedupe_connector_ids() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.generate_avatar_color(uuid) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.generate_initials(text, text) FROM anon, authenticated, PUBLIC;

-- 2d. Privileged write helpers: server-side only
REVOKE ALL ON FUNCTION public.link_system_integration(uuid, uuid, text, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.unlink_system_integration(uuid, uuid) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_system_integration(uuid, uuid, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.unlink_system_integration(uuid, uuid) TO service_role;

-- 2e. Signed-in-only helpers: drop anonymous execute, keep authenticated
REVOKE ALL ON FUNCTION public.admin_assign_role(uuid, public.app_role, text) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.admin_revoke_role(uuid, public.app_role, text) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.check_user_has_role(uuid, text) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.user_has_role(uuid, text, text) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.user_can_access_agent(uuid, uuid, text) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.is_approved_user(uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_kpi_agents_deployed(timestamptz, timestamptz, uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_kpi_compliance_accuracy(timestamptz, timestamptz, uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_kpi_roi_growth(timestamptz, timestamptz, uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_kpi_time_saved(timestamptz, timestamptz, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_assign_role(uuid, public.app_role, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_revoke_role(uuid, public.app_role, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_user_has_role(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_role(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_access_agent(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_approved_user(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_kpi_agents_deployed(timestamptz, timestamptz, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_kpi_compliance_accuracy(timestamptz, timestamptz, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_kpi_roi_growth(timestamptz, timestamptz, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_kpi_time_saved(timestamptz, timestamptz, uuid) TO authenticated, service_role;

-- 3. Materialized view must not be exposed through the Data API
REVOKE ALL ON public.mv_ops_overview FROM anon, authenticated;

-- 4. Replace always-true write policies
DROP POLICY IF EXISTS "Authenticated users can insert action logs" ON public.agent_action_logs;
CREATE POLICY "Users can insert their own action logs"
  ON public.agent_action_logs FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND system_id IS NOT NULL
    AND public.user_can_access_agent(auth.uid(), system_id, 'operate')
  );

DROP POLICY IF EXISTS "Service role can manage cache" ON public.ai_recommendations_cache;
CREATE POLICY "Service role can manage cache"
  ON public.ai_recommendations_cache FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON public.capture_cache;
CREATE POLICY "Service role full access"
  ON public.capture_cache FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage all memory" ON public.copilot_memory;
CREATE POLICY "Service role can manage all memory"
  ON public.copilot_memory FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can submit onboarding form" ON public.onboarding_submissions;
CREATE POLICY "Anyone can submit onboarding form"
  ON public.onboarding_submissions FOR INSERT TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND length(email) BETWEEN 3 AND 320
    AND position('@' in email) > 1
  );

-- 5. agents: remove cross-tenant read exposure and duplicate permissive policies
DROP POLICY IF EXISTS "Users can view agents in their org" ON public.agents;
DROP POLICY IF EXISTS "Users can create agents" ON public.agents;
CREATE POLICY "Users can view agents in their org"
  ON public.agents FOR SELECT TO authenticated
  USING (
    auth.uid() = owner_id
    OR (
      org_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND p.org_id IS NOT NULL
          AND p.org_id = agents.org_id
      )
    )
  );

-- 6. industry_agents: catalogue writes restricted to admins
DROP POLICY IF EXISTS "Users can update connection status" ON public.industry_agents;
CREATE POLICY "Admins can update industry agents"
  ON public.industry_agents FOR UPDATE TO authenticated
  USING (public.check_user_has_role(auth.uid(), 'admin'))
  WITH CHECK (public.check_user_has_role(auth.uid(), 'admin'));

-- 7. storage.objects policies for the profile-images bucket
DROP POLICY IF EXISTS "Profile images are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile image" ON storage.objects;

CREATE POLICY "Profile images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-images');

CREATE POLICY "Users can upload their own profile image"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own profile image"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own profile image"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );