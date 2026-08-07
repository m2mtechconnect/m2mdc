-- ============================================================================
-- AURA DC Phase 1 / B-03: anonymous access is default-deny.
-- Evidence: anon held arwdDxtm on every public table; live REST probes with the
-- publishable key returned HTTP 200 with rows from public.sites,
-- public.dc_blueprint_templates and public.agent_definitions.
-- Sole intentional anonymous capability: marketing lead capture
-- (INSERT into public.onboarding_submissions, no read-back).
-- ============================================================================

-- 1. Blanket revoke for the anonymous role.
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE USAGE ON SCHEMA public FROM anon;

-- PostgREST needs schema usage to resolve the one allowed write; object-level
-- privileges remain the enforcement point.
GRANT USAGE ON SCHEMA public TO anon;

-- 2. Future objects inherit default-deny.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES    FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;

-- 3. The single intentional public capability.
GRANT INSERT ON public.onboarding_submissions TO anon;

-- 4. Make the previously public read policies explicitly authenticated-only, so
--    intent is readable in the catalog and not merely implied by grants.
DROP POLICY IF EXISTS "Anyone can view blueprint templates" ON public.dc_blueprint_templates;
CREATE POLICY "Signed-in users can view blueprint templates" ON public.dc_blueprint_templates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view sites" ON public.sites;
CREATE POLICY "Signed-in users can view sites" ON public.sites
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view system default agents" ON public.agent_definitions;
CREATE POLICY "Signed-in users can view system default agents" ON public.agent_definitions
  FOR SELECT TO authenticated USING (is_system_default = true);

-- 5. Confirm the authenticated and service roles retain what they need.
GRANT SELECT ON public.dc_blueprint_templates TO authenticated;
GRANT SELECT ON public.sites                  TO authenticated;
GRANT SELECT ON public.agent_definitions      TO authenticated;
GRANT ALL    ON public.onboarding_submissions TO service_role;