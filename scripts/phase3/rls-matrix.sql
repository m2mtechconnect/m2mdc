-- Phase 3.4 - executable tenant isolation and RLS matrix.
--
-- Runs entirely inside one transaction and ROLLS BACK, so it is safe against
-- any backend whose role can create auth users. It never runs as postgres for
-- the assertions themselves: every assertion is executed as `authenticated`
-- with a forged `request.jwt.claims`, which is exactly how PostgREST reaches
-- the table. A test that passes here is real RLS evidence, not a mock.
--
-- Usage: psql "$AURA_VALIDATION_DB_URL" -v ON_ERROR_STOP=1 -f scripts/phase3/rls-matrix.sql
\set ON_ERROR_STOP on
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.act_as(_uid uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', _uid, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);
END $$;

CREATE OR REPLACE FUNCTION pg_temp.expect(_label text, _got boolean, _want boolean)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF _got IS DISTINCT FROM _want THEN
    RAISE EXCEPTION 'FAIL % (got %, want %)', _label, _got, _want;
  END IF;
  RAISE NOTICE 'PASS %', _label;
END $$;

DO $outer$
DECLARE
  ua uuid := gen_random_uuid();
  ub uuid := gen_random_uuid();
  twin_a uuid;
  run_a uuid;
  n int;
  ok boolean;
BEGIN
  -- Two tenants, each with their own twin.
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at)
  VALUES (ua, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'tenant-a@validation.invalid', '', now(), now(), now()),
         (ub, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'tenant-b@validation.invalid', '', now(), now(), now());

  INSERT INTO public.data_centre_twins (name, created_by_user)
  VALUES ('validation-twin-a', ua) RETURNING id INTO twin_a;

  INSERT INTO public.simulation_runs (user_id, tenant_id, twin_id, lifecycle_status)
  VALUES (ua, ua, twin_a, 'succeeded') RETURNING id INTO run_a;

  ---------------------------------------------------------------- reads
  PERFORM pg_temp.act_as(ua);
  SELECT count(*) INTO n FROM public.simulation_runs WHERE id = run_a;
  PERFORM pg_temp.expect('owner reads own run', n = 1, true);
  RESET role;

  PERFORM pg_temp.act_as(ub);
  SELECT count(*) INTO n FROM public.simulation_runs WHERE id = run_a;
  PERFORM pg_temp.expect('tenant B cannot read tenant A run', n = 0, true);
  RESET role;

  ------------------------------------------------- cross-tenant writes
  PERFORM pg_temp.act_as(ub);
  ok := true;
  BEGIN
    UPDATE public.simulation_runs SET final_kpis = '{"pue":9}'::jsonb WHERE id = run_a;
    GET DIAGNOSTICS n = ROW_COUNT;
    ok := (n = 0);
  EXCEPTION WHEN insufficient_privilege THEN ok := true;
  END;
  PERFORM pg_temp.expect('tenant B cannot update tenant A run', ok, true);

  ok := false;
  BEGIN
    INSERT INTO public.simulation_runs (user_id, tenant_id, twin_id, lifecycle_status)
    VALUES (ub, ub, twin_a, 'queued');
  EXCEPTION WHEN OTHERS THEN ok := true;
  END;
  PERFORM pg_temp.expect('tenant B cannot attach a run to tenant A twin', ok, true);
  RESET role;

  --------------------------------------------- privileged field forgery
  PERFORM pg_temp.act_as(ua);
  INSERT INTO public.simulation_runs (user_id, tenant_id, twin_id, lifecycle_status,
                                      run_intent, verification_level)
  VALUES (ua, ua, twin_a, 'queued', 'authoritative', 'server-verified')
  RETURNING id INTO run_a;
  SELECT run_intent = 'preview' AND verification_level = 'client-generated-unverified'
    INTO ok FROM public.simulation_runs WHERE id = run_a;
  PERFORM pg_temp.expect('client-forged authoritative intent is downgraded', ok, true);

  ok := false;
  BEGIN
    UPDATE public.simulation_runs SET run_intent = 'authoritative' WHERE id = run_a;
  EXCEPTION WHEN OTHERS THEN ok := true;
  END;
  PERFORM pg_temp.expect('client cannot escalate run_intent by update', ok, true);

  ------------------------------------------------------ terminal states
  UPDATE public.simulation_runs SET lifecycle_status = 'succeeded' WHERE id = run_a;
  ok := false;
  BEGIN
    UPDATE public.simulation_runs SET lifecycle_status = 'running' WHERE id = run_a;
  EXCEPTION WHEN OTHERS THEN ok := true;
  END;
  PERFORM pg_temp.expect('a terminal run cannot be reopened', ok, true);

  -------------------------------------------------- decision immutability
  INSERT INTO public.decision_records (user_id, run_id, recommendation_id, outcome, rationale)
  VALUES (ua, run_a, 'rec-1', 'approved', 'validation rationale long enough');
  ok := false;
  BEGIN
    UPDATE public.decision_records SET outcome = 'rejected' WHERE run_id = run_a;
  EXCEPTION WHEN OTHERS THEN ok := true;
  END;
  PERFORM pg_temp.expect('decision records cannot be updated', ok, true);

  ok := false;
  BEGIN
    DELETE FROM public.decision_records WHERE run_id = run_a;
  EXCEPTION WHEN OTHERS THEN ok := true;
  END;
  PERFORM pg_temp.expect('decision records cannot be deleted', ok, true);
  RESET role;

  PERFORM pg_temp.act_as(ub);
  SELECT count(*) INTO n FROM public.decision_records WHERE run_id = run_a;
  PERFORM pg_temp.expect('tenant B cannot read tenant A decisions', n = 0, true);
  RESET role;

  ------------------------------------------------------------ anon role
  PERFORM set_config('request.jwt.claims', NULL, true);
  PERFORM set_config('role', 'anon', true);
  ok := false;
  BEGIN
    SELECT count(*) INTO n FROM public.simulation_runs;
    ok := (n = 0);
  EXCEPTION WHEN insufficient_privilege THEN ok := true;
  END;
  PERFORM pg_temp.expect('anonymous callers see no runs', ok, true);
  RESET role;

  RAISE NOTICE 'RLS MATRIX COMPLETE';
END $outer$;

ROLLBACK;
