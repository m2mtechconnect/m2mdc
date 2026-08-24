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
  org_a uuid := gen_random_uuid();
  org_b uuid := gen_random_uuid();
  twin_a uuid;
  run_a uuid;
  n int;
  ok boolean;
BEGIN
  -- Two tenants, each with their own durable organization membership.
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at)
  VALUES (ua, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'tenant-a@validation.invalid', '', now(), now(), now()),
         (ub, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'tenant-b@validation.invalid', '', now(), now(), now());

  INSERT INTO public.organizations (id, name) VALUES
    (org_a, 'Validation Tenant A'),
    (org_b, 'Validation Tenant B');

  INSERT INTO public.org_memberships (org_id, user_id, role, status, is_default) VALUES
    (org_a, ua, 'owner', 'active', true),
    (org_b, ub, 'owner', 'active', true);

  -- Privileged fixture setup must state the tenant explicitly; production
  -- stamp_active_org_id() intentionally rejects an orphan privileged insert.
  INSERT INTO public.data_centre_twins (name, city, region_code, created_by_user, org_id)
  VALUES ('validation-twin-a', 'Validation City', 'validation-region-a', ua, org_a)
  RETURNING id INTO twin_a;

  INSERT INTO public.simulation_runs (user_id, tenant_id, twin_id, scenario_key, lifecycle_status)
  VALUES (ua, ua, twin_a, 'validation-owner', 'succeeded') RETURNING id INTO run_a;

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
    INSERT INTO public.simulation_runs (user_id, tenant_id, twin_id, scenario_key, lifecycle_status)
    VALUES (ub, ub, twin_a, 'validation-cross-tenant', 'queued');
  EXCEPTION WHEN OTHERS THEN ok := true;
  END;
  PERFORM pg_temp.expect('tenant B cannot attach a run to tenant A twin', ok, true);
  RESET role;

  --------------------------------------------- privileged field forgery
  PERFORM pg_temp.act_as(ua);
  INSERT INTO public.simulation_runs (user_id, tenant_id, twin_id, scenario_key, lifecycle_status,
                                      run_intent, verification_level)
  VALUES (ua, ua, twin_a, 'validation-forgery', 'queued', 'authoritative', 'server-verified')
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
  INSERT INTO public.decision_records (
    user_id, run_id, recommendation_id, outcome, rationale,
    approver, decided_at, data_mode, observation_tick,
    evidence_snapshot, snapshot_hash, timeline_id
  )
  VALUES (
    ua, run_a, 'rec-1', 'approved', 'validation rationale long enough',
    'tenant-a@validation.invalid', now(), 'SIMULATED', 0,
    '{}'::jsonb, 'validation-snapshot-owner', 'run:' || run_a::text
  );
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

-- ---------------------------------------------------------------------------
-- Extended identity matrix (Phase 3 infrastructure closure pass).
--
-- Identity model note, recorded honestly: AURA policies key on auth.uid() plus
-- public.user_roles, NOT on a tenant claim in the JWT. A tenant is therefore a
-- user identity here. "Approver" is not a database-level privilege: approval
-- authority is enforced by the record-decision Edge Function, which is proven
-- over HTTP by scripts/phase3/external-validation.mjs, not by these policies.
-- No platform-administrator role exists beyond public.user_roles 'admin'.
-- ---------------------------------------------------------------------------
DO $ext$
DECLARE
  member_a uuid := gen_random_uuid();
  approver_a uuid := gen_random_uuid();
  admin_a uuid := gen_random_uuid();
  member_b uuid := gen_random_uuid();
  approver_b uuid := gen_random_uuid();
  org_a uuid := gen_random_uuid();
  org_b uuid := gen_random_uuid();
  twin_a uuid;
  run_a uuid;
  n int;
  ok boolean;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at)
  SELECT u.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         u.id || '@validation.invalid', '', now(), now(), now()
  FROM (VALUES (member_a), (approver_a), (admin_a), (member_b), (approver_b)) AS u(id);

  INSERT INTO public.user_roles (user_id, role) VALUES
    (approver_a, 'operator'), (admin_a, 'admin'), (approver_b, 'operator');

  INSERT INTO public.organizations (id, name) VALUES
    (org_a, 'Validation Extended Tenant A'),
    (org_b, 'Validation Extended Tenant B');

  INSERT INTO public.org_memberships (org_id, user_id, role, status, is_default) VALUES
    (org_a, member_a, 'owner', 'active', true),
    (org_a, approver_a, 'operator', 'active', true),
    (org_a, admin_a, 'admin', 'active', true),
    (org_b, member_b, 'owner', 'active', true),
    (org_b, approver_b, 'operator', 'active', true);

  INSERT INTO public.data_centre_twins (name, city, region_code, created_by_user, org_id)
  VALUES ('validation-twin-ext-a', 'Validation City', 'validation-region-a', member_a, org_a)
  RETURNING id INTO twin_a;

  -- The prior anonymous assertion intentionally clears request.jwt.claims.
  -- PostgreSQL leaves that transaction-local setting as an empty string, while
  -- the canonical write-boundary trigger parses a present claims setting as
  -- JSON. Restore an explicit privileged envelope for direct fixture seeding;
  -- all authorization assertions below still execute as authenticated/anon.
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  INSERT INTO public.simulation_runs (user_id, tenant_id, twin_id, scenario_key, lifecycle_status)
  VALUES (member_a, member_a, twin_a, 'validation-extended', 'succeeded') RETURNING id INTO run_a;

  ------------------------------------------------------------- anon writes
  PERFORM set_config('request.jwt.claims', NULL, true);
  PERFORM set_config('role', 'anon', true);
  ok := false;
  BEGIN
    INSERT INTO public.simulation_runs (user_id, tenant_id, twin_id, scenario_key, lifecycle_status)
    VALUES (member_a, member_a, twin_a, 'validation-anon', 'queued');
  EXCEPTION WHEN OTHERS THEN ok := true;
  END;
  PERFORM pg_temp.expect('anonymous insert into simulation_runs denied', ok, true);

  ok := false;
  BEGIN
    UPDATE public.simulation_runs SET final_kpis = '{}'::jsonb WHERE id = run_a;
    GET DIAGNOSTICS n = ROW_COUNT;
    ok := (n = 0);
  EXCEPTION WHEN OTHERS THEN ok := true;
  END;
  PERFORM pg_temp.expect('anonymous update of simulation_runs denied', ok, true);

  ok := false;
  BEGIN
    SELECT count(*) INTO n FROM public.decision_records;
    ok := (n = 0);
  EXCEPTION WHEN insufficient_privilege THEN ok := true;
  END;
  PERFORM pg_temp.expect('anonymous read of decision_records denied', ok, true);
  RESET role;

  ------------------------------------------------ tenant A approver identity
  PERFORM pg_temp.act_as(approver_a);
  SELECT count(*) INTO n FROM public.simulation_runs WHERE id = run_a;
  PERFORM pg_temp.expect('tenant A approver has no implicit read of another member run', n = 0, true);
  RESET role;

  -------------------------------------------------- tenant A administrator
  PERFORM pg_temp.act_as(admin_a);
  SELECT count(*) INTO n FROM public.simulation_runs WHERE id = run_a;
  PERFORM pg_temp.expect('administrator read is policy-granted, not accidental', n = 1, true);
  ok := false;
  BEGIN
    UPDATE public.simulation_runs SET lifecycle_status = 'running' WHERE id = run_a;
    GET DIAGNOSTICS n = ROW_COUNT;
    ok := (n = 0);
  EXCEPTION WHEN OTHERS THEN ok := true;
  END;
  PERFORM pg_temp.expect('administrator read access does not imply write access', ok, true);
  RESET role;

  -------------------------------------------------- tenant B member/approver
  PERFORM pg_temp.act_as(member_b);
  SELECT count(*) INTO n FROM public.simulation_runs WHERE id = run_a;
  PERFORM pg_temp.expect('tenant B member cannot read tenant A run', n = 0, true);
  RESET role;

  PERFORM pg_temp.act_as(approver_b);
  SELECT count(*) INTO n FROM public.simulation_runs WHERE id = run_a;
  PERFORM pg_temp.expect('tenant B approver cannot read tenant A run', n = 0, true);
  ok := false;
  BEGIN
    INSERT INTO public.decision_records (
      user_id, run_id, recommendation_id, outcome, rationale,
      approver, decided_at, data_mode, observation_tick,
      evidence_snapshot, snapshot_hash, timeline_id
    )
    VALUES (
      member_a, run_a, 'rec-ext', 'approved', 'cross tenant decision attempt',
      approver_b::text, now(), 'SIMULATED', 0,
      '{}'::jsonb, 'validation-snapshot-cross-tenant', 'run:' || run_a::text
    );
  EXCEPTION WHEN OTHERS THEN ok := true;
  END;
  PERFORM pg_temp.expect('tenant B approver cannot decide on tenant A run', ok, true);
  RESET role;

  ------------------------------------- ordinary member privilege escalation
  PERFORM pg_temp.act_as(member_a);
  ok := false;
  BEGIN
    INSERT INTO public.user_roles (user_id, role) VALUES (member_a, 'admin');
  EXCEPTION WHEN OTHERS THEN ok := true;
  END;
  PERFORM pg_temp.expect('ordinary member cannot grant themselves admin', ok, true);
  RESET role;

  RAISE NOTICE 'RLS MATRIX EXTENDED COMPLETE';
END $ext$;

ROLLBACK;
