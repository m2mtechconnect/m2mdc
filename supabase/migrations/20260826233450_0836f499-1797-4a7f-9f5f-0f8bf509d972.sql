-- Phase 1 of the production-readiness remediation plan: authorization surface
-- hardening. No table is created and no data is modified.

BEGIN;

-- 1. RLS helper predicates are policy-internal. Signed-out callers have no
--    legitimate reason to execute them directly.
REVOKE EXECUTE ON FUNCTION public.connection_tenant_visible(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.connection_visible(uuid) FROM anon;

-- 2. agent_suggestions_cache had RLS enabled with zero policies, which is
--    correct behaviour (service-role only) but indistinguishable from an
--    unfinished migration. Make the intent explicit and revoke Data API access.
REVOKE ALL ON TABLE public.agent_suggestions_cache FROM anon, authenticated;
GRANT ALL ON TABLE public.agent_suggestions_cache TO service_role;
COMMENT ON TABLE public.agent_suggestions_cache IS
  'Service-role-only suggestion cache. RLS is enabled with no policies by design: no end-user role may read or write it through the Data API.';

-- 3. Executive reads were platform-wide across tenant integration data.
--    Scope them to organizations the caller actually belongs to.
DROP POLICY IF EXISTS "Executives can view all integrations" ON public.integrations;
CREATE POLICY "Executives can view integrations in their organizations"
  ON public.integrations FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'executive'::app_role)
    AND org_id IS NOT NULL
    AND public.is_org_member(org_id, auth.uid())
  );

DROP POLICY IF EXISTS "Executives can update integrations" ON public.integrations;
CREATE POLICY "Executives can update integrations in their organizations"
  ON public.integrations FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'executive'::app_role)
    AND org_id IS NOT NULL
    AND public.is_org_member(org_id, auth.uid())
  );

DROP POLICY IF EXISTS "Executives can delete integrations" ON public.integrations;
CREATE POLICY "Executives can delete integrations in their organizations"
  ON public.integrations FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'executive'::app_role)
    AND org_id IS NOT NULL
    AND public.is_org_member(org_id, auth.uid())
  );

DROP POLICY IF EXISTS "Executives can view all logs" ON public.integration_logs;
CREATE POLICY "Executives can view logs for their organizations"
  ON public.integration_logs FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'executive'::app_role)
    AND EXISTS (
      SELECT 1
      FROM public.integrations i
      WHERE i.id = integration_logs.integration_id
        AND i.org_id IS NOT NULL
        AND public.is_org_member(i.org_id, auth.uid())
    )
  );

-- 4. Published twin derivatives are a shared reference library (no first-party
--    tenant content is written to this legacy bucket), but reading it should
--    still require an approved account rather than any authenticated session.
DROP POLICY IF EXISTS "Authenticated users can read published twin derivatives" ON storage.objects;
CREATE POLICY "Approved users can read published twin derivatives"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'digital-twin-assets'
    AND (storage.foldername(name))[array_length(storage.foldername(name), 1)] = 'web'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_approved = true
    )
  );

COMMIT;