CREATE TABLE IF NOT EXISTS public.deployment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id uuid NOT NULL REFERENCES public.deployments(id) ON DELETE CASCADE,
  system_id uuid NOT NULL,
  sequence integer NOT NULL,
  stage text NOT NULL,
  status text NOT NULL CHECK (status IN ('started','succeeded','failed','skipped')),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deployment_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_deployment_events_deployment ON public.deployment_events (deployment_id, sequence);
CREATE INDEX IF NOT EXISTS idx_deployment_events_system ON public.deployment_events (system_id, occurred_at DESC);

GRANT SELECT, INSERT ON public.deployment_events TO authenticated;
GRANT ALL ON public.deployment_events TO service_role;

ALTER TABLE public.deployment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view their own deployment events" ON public.deployment_events;
CREATE POLICY "Users view their own deployment events"
ON public.deployment_events FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.deployments d WHERE d.id = deployment_id AND d.deployed_by = auth.uid()));

DROP POLICY IF EXISTS "Users append events to their own deployments" ON public.deployment_events;
CREATE POLICY "Users append events to their own deployments"
ON public.deployment_events FOR INSERT TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.deployments d WHERE d.id = deployment_id AND d.deployed_by = auth.uid())
);

COMMENT ON TABLE public.deployment_events IS 'Immutable append-only deployment step log. No UPDATE/DELETE grants by design.';

REVOKE ALL ON public.deployment_tracking FROM anon, authenticated;
COMMENT ON TABLE public.deployment_tracking IS 'DEPRECATED (Phase 9): superseded by public.deployments + public.deployment_events. No client grants.';