CREATE OR REPLACE FUNCTION public.decision_records_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'decision_records is append-only; add a superseding record instead';
END $$;

REVOKE EXECUTE ON FUNCTION public.decision_records_immutable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_simulation_run_write_boundary() FROM PUBLIC, anon, authenticated;