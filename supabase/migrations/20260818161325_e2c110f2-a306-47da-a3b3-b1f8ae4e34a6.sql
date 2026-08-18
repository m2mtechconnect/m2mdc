-- Phase 3: canonical truth chain (additive only)

-- ---------- simulation_runs: canonical run envelope ----------
ALTER TABLE public.simulation_runs
  ADD COLUMN IF NOT EXISTS tenant_id uuid,
  ADD COLUMN IF NOT EXISTS lifecycle_status text,
  ADD COLUMN IF NOT EXISTS requested_provider text,
  ADD COLUMN IF NOT EXISTS actual_provider text,
  ADD COLUMN IF NOT EXISTS provider_version text,
  ADD COLUMN IF NOT EXISTS requested_execution_class text,
  ADD COLUMN IF NOT EXISTS outcome_execution_class text,
  ADD COLUMN IF NOT EXISTS run_intent text,
  ADD COLUMN IF NOT EXISTS verification_level text,
  ADD COLUMN IF NOT EXISTS seed text,
  ADD COLUMN IF NOT EXISTS prng_version text,
  ADD COLUMN IF NOT EXISTS seed_derivation_version text,
  ADD COLUMN IF NOT EXISTS canonical_schema_version text,
  ADD COLUMN IF NOT EXISTS input_hash text,
  ADD COLUMN IF NOT EXISTS configuration_hash text,
  ADD COLUMN IF NOT EXISTS output_hash text,
  ADD COLUMN IF NOT EXISTS telemetry_snapshot_id text,
  ADD COLUMN IF NOT EXISTS telemetry_snapshot_hash text,
  ADD COLUMN IF NOT EXISTS external_job_id text,
  ADD COLUMN IF NOT EXISTS failure_code text,
  ADD COLUMN IF NOT EXISTS failure_message text,
  ADD COLUMN IF NOT EXISTS measured_duration_ms integer,
  ADD COLUMN IF NOT EXISTS server_created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS provenance_envelope jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS retry_of_run_id uuid REFERENCES public.simulation_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attempt integer NOT NULL DEFAULT 1;

-- Backfill honest values for historical rows; never invent provenance.
UPDATE public.simulation_runs SET
  tenant_id = COALESCE(tenant_id, user_id),
  lifecycle_status = COALESCE(lifecycle_status, CASE status
    WHEN 'completed' THEN 'succeeded'
    WHEN 'pending' THEN 'queued'
    WHEN 'running' THEN 'running'
    WHEN 'failed' THEN 'failed'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'unavailable' END),
  run_intent = COALESCE(run_intent, CASE WHEN execution_origin = 'client-browser' THEN 'preview' ELSE 'authoritative' END),
  verification_level = COALESCE(verification_level, CASE
    WHEN validation_status = 'server-validated' THEN 'server-validated'
    WHEN validation_status = 'client-produced-unverified' THEN 'client-generated-unverified'
    ELSE 'legacy-unverified' END),
  requested_provider = COALESCE(requested_provider, 'legacy-unknown'),
  actual_provider = COALESCE(actual_provider, 'legacy-unknown'),
  requested_execution_class = COALESCE(requested_execution_class, 'legacy-unknown'),
  outcome_execution_class = COALESCE(outcome_execution_class, 'legacy-unknown'),
  canonical_schema_version = COALESCE(canonical_schema_version, 'legacy-unversioned'),
  measured_duration_ms = COALESCE(measured_duration_ms, duration_ms);

ALTER TABLE public.simulation_runs ALTER COLUMN lifecycle_status SET DEFAULT 'queued';
ALTER TABLE public.simulation_runs ALTER COLUMN run_intent SET DEFAULT 'preview';
ALTER TABLE public.simulation_runs ALTER COLUMN verification_level SET DEFAULT 'client-generated-unverified';

DO $$ BEGIN
  ALTER TABLE public.simulation_runs ADD CONSTRAINT simulation_runs_lifecycle_status_check
    CHECK (lifecycle_status IN ('queued','running','succeeded','failed','unavailable','cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.simulation_runs ADD CONSTRAINT simulation_runs_run_intent_check
    CHECK (run_intent IN ('preview','authoritative'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.simulation_runs ADD CONSTRAINT simulation_runs_verification_level_check
    CHECK (verification_level IN ('server-validated','client-generated-unverified','legacy-unverified','invalid'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS simulation_runs_tenant_idx ON public.simulation_runs(tenant_id);
CREATE INDEX IF NOT EXISTS simulation_runs_lifecycle_idx ON public.simulation_runs(lifecycle_status);
CREATE UNIQUE INDEX IF NOT EXISTS simulation_runs_user_idem_uidx
  ON public.simulation_runs(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Trusted write boundary: the browser may never author an authoritative or
-- server-validated run, nor reopen a terminal run.
CREATE OR REPLACE FUNCTION public.enforce_simulation_run_write_boundary()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_privileged boolean := (current_setting('request.jwt.claims', true) IS NULL)
    OR (coalesce(current_setting('request.jwt.claim.role', true), (current_setting('request.jwt.claims', true)::jsonb ->> 'role')) = 'service_role');
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.server_created_at := now();
    NEW.tenant_id := COALESCE(NEW.tenant_id, NEW.user_id);
    IF NOT is_privileged THEN
      NEW.run_intent := 'preview';
      NEW.verification_level := 'client-generated-unverified';
      NEW.execution_origin := 'client-browser';
      NEW.validation_status := 'client-produced-unverified';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF OLD.lifecycle_status IN ('succeeded','failed','cancelled') AND NEW.lifecycle_status IS DISTINCT FROM OLD.lifecycle_status THEN
    RAISE EXCEPTION 'illegal lifecycle transition: % -> % (terminal run cannot be reopened)', OLD.lifecycle_status, NEW.lifecycle_status;
  END IF;
  IF NOT is_privileged THEN
    IF NEW.run_intent IS DISTINCT FROM OLD.run_intent
       OR NEW.verification_level IS DISTINCT FROM OLD.verification_level
       OR NEW.execution_origin IS DISTINCT FROM OLD.execution_origin
       OR NEW.validation_status IS DISTINCT FROM OLD.validation_status
       OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'privileged run fields may only be changed by the trusted server boundary';
    END IF;
  END IF;
  NEW.server_created_at := OLD.server_created_at;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS simulation_runs_write_boundary ON public.simulation_runs;
CREATE TRIGGER simulation_runs_write_boundary
  BEFORE INSERT OR UPDATE ON public.simulation_runs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_simulation_run_write_boundary();

-- ---------- decision_records: server-owned, append-only ----------
ALTER TABLE public.decision_records
  ADD COLUMN IF NOT EXISTS run_id uuid REFERENCES public.simulation_runs(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS tenant_id uuid,
  ADD COLUMN IF NOT EXISTS decision_hash text,
  ADD COLUMN IF NOT EXISTS prior_decision_id uuid REFERENCES public.decision_records(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS prior_decision_hash text,
  ADD COLUMN IF NOT EXISTS supersedes_decision_id uuid REFERENCES public.decision_records(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS evidence_schema_version text NOT NULL DEFAULT 'aura-evidence-v1',
  ADD COLUMN IF NOT EXISTS decision_status text NOT NULL DEFAULT 'recorded',
  ADD COLUMN IF NOT EXISTS authored_by text NOT NULL DEFAULT 'legacy-client';

UPDATE public.decision_records SET tenant_id = COALESCE(tenant_id, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS decision_records_user_idem_uidx
  ON public.decision_records(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS decision_records_run_idx ON public.decision_records(run_id);

-- Append-only: no update/delete for any client role.
REVOKE UPDATE, DELETE ON public.decision_records FROM authenticated, anon;
GRANT SELECT, INSERT ON public.decision_records TO authenticated;
GRANT ALL ON public.decision_records TO service_role;

CREATE OR REPLACE FUNCTION public.decision_records_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'decision_records is append-only; add a superseding record instead';
END $$;

DROP TRIGGER IF EXISTS decision_records_no_update ON public.decision_records;
CREATE TRIGGER decision_records_no_update
  BEFORE UPDATE OR DELETE ON public.decision_records
  FOR EACH ROW EXECUTE FUNCTION public.decision_records_immutable();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.simulation_runs TO authenticated;
GRANT ALL ON public.simulation_runs TO service_role;