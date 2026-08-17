ALTER TABLE public.simulation_runs
  ADD COLUMN IF NOT EXISTS run_key text,
  ADD COLUMN IF NOT EXISTS blueprint_id uuid,
  ADD COLUMN IF NOT EXISTS blueprint_version text,
  ADD COLUMN IF NOT EXISTS scenario_type text NOT NULL DEFAULT 'operational',
  ADD COLUMN IF NOT EXISTS input_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS output_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metric_provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS engine_version text NOT NULL DEFAULT 'aura-workspace-scenario-engine@1.0.0',
  ADD COLUMN IF NOT EXISTS execution_origin text NOT NULL DEFAULT 'client-browser',
  ADD COLUMN IF NOT EXISTS validation_status text NOT NULL DEFAULT 'client-produced-unverified',
  ADD COLUMN IF NOT EXISTS error_detail text,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS checksum text,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

ALTER TABLE public.simulation_runs
  DROP CONSTRAINT IF EXISTS simulation_runs_execution_origin_check;
ALTER TABLE public.simulation_runs
  ADD CONSTRAINT simulation_runs_execution_origin_check
  CHECK (execution_origin IN ('client-browser', 'server-edge-function', 'imported-legacy'));

ALTER TABLE public.simulation_runs
  DROP CONSTRAINT IF EXISTS simulation_runs_validation_status_check;
ALTER TABLE public.simulation_runs
  ADD CONSTRAINT simulation_runs_validation_status_check
  CHECK (validation_status IN ('client-produced-unverified', 'server-validated', 'imported-unverified', 'invalid'));

CREATE UNIQUE INDEX IF NOT EXISTS simulation_runs_idempotency_uidx
  ON public.simulation_runs (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS simulation_runs_user_created_idx
  ON public.simulation_runs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS simulation_runs_twin_idx
  ON public.simulation_runs (twin_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.simulation_runs_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.run_key := COALESCE(NEW.run_key, 'SIM-' || to_char(now(), 'YYYY-MM-DD') || '-' || substr(NEW.id::text, 1, 8));
    RETURN NEW;
  END IF;

  -- Ownership and facility can never be reassigned by an ordinary update.
  NEW.user_id := OLD.user_id;
  NEW.twin_id := OLD.twin_id;
  NEW.id := OLD.id;
  NEW.created_at := OLD.created_at;
  NEW.updated_at := now();

  -- A finished run is immutable apart from user-visible annotations.
  IF OLD.status IN ('completed', 'failed', 'cancelled') THEN
    NEW.status := OLD.status;
    NEW.input_snapshot := OLD.input_snapshot;
    NEW.output_snapshot := OLD.output_snapshot;
    NEW.baseline_kpis := OLD.baseline_kpis;
    NEW.final_kpis := OLD.final_kpis;
    NEW.kpi_snapshots := OLD.kpi_snapshots;
    NEW.events := OLD.events;
    NEW.metric_provenance := OLD.metric_provenance;
    NEW.execution_origin := OLD.execution_origin;
    NEW.validation_status := OLD.validation_status;
    NEW.engine_version := OLD.engine_version;
    NEW.checksum := OLD.checksum;
    NEW.started_at := OLD.started_at;
    NEW.finished_at := OLD.finished_at;
    NEW.run_key := OLD.run_key;
    NEW.idempotency_key := OLD.idempotency_key;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS simulation_runs_guard_trg ON public.simulation_runs;
CREATE TRIGGER simulation_runs_guard_trg
  BEFORE INSERT OR UPDATE ON public.simulation_runs
  FOR EACH ROW EXECUTE FUNCTION public.simulation_runs_guard();

-- Ownership-scoped access, explicitly limited to signed-in users.
DROP POLICY IF EXISTS "Users can view their own simulation runs" ON public.simulation_runs;
DROP POLICY IF EXISTS "Users can create their own simulation runs" ON public.simulation_runs;
DROP POLICY IF EXISTS "Users can update their own simulation runs" ON public.simulation_runs;
DROP POLICY IF EXISTS "Users can delete their own simulation runs" ON public.simulation_runs;
DROP POLICY IF EXISTS "simulation_runs_select_own" ON public.simulation_runs;
DROP POLICY IF EXISTS "simulation_runs_insert_own" ON public.simulation_runs;
DROP POLICY IF EXISTS "simulation_runs_update_own" ON public.simulation_runs;
DROP POLICY IF EXISTS "simulation_runs_delete_own" ON public.simulation_runs;
DROP POLICY IF EXISTS "simulation_runs_select_admin" ON public.simulation_runs;

CREATE POLICY "simulation_runs_select_own" ON public.simulation_runs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "simulation_runs_select_admin" ON public.simulation_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "simulation_runs_insert_own" ON public.simulation_runs
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.data_centre_twins t
      WHERE t.id = simulation_runs.twin_id AND t.created_by_user = auth.uid()
    )
  );

CREATE POLICY "simulation_runs_update_own" ON public.simulation_runs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "simulation_runs_delete_own" ON public.simulation_runs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

REVOKE ALL ON public.simulation_runs FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.simulation_runs TO authenticated;
GRANT ALL ON public.simulation_runs TO service_role;