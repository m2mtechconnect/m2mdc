#!/usr/bin/env bash
# Phase 2.c — Adversarial RLS proof for the DSX tables.
#
# Requires PGHOST/PGPORT/PGUSER pointing at a DISPOSABLE Postgres
# instance that already has the Phase 2.a DSX migration applied plus
# the AURA baseline (profiles, user_roles, auth.uid, service_role,
# authenticated, anon roles). DO NOT run against production.
#
# Fixture UUIDs — deterministic so failed rows are easy to identify.
#   Org A         : aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
#   Org B         : bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb
#   Twin A        : a1111111-1111-1111-1111-111111111111
#   Twin B        : b1111111-1111-1111-1111-111111111111
#   Conn A        : a2222222-2222-2222-2222-222222222222
#   Conn B        : b2222222-2222-2222-2222-222222222222
#   User Approved-A : a3333333-3333-3333-3333-333333333333
#   User Approved-B : b3333333-3333-3333-3333-333333333333
#   User Unapproved : c3333333-3333-3333-3333-333333333333

set -u
: "${PGDATABASE:=b7_dsx_test}"

psql -X -q -v ON_ERROR_STOP=1 <<'SEED'
BEGIN;
-- Seed two orgs, two approved users bound to those orgs, and one
-- unapproved user. Assumes public.profiles(org_id, is_approved) exists
-- from the AURA baseline migrations.
INSERT INTO public.profiles (user_id, email, org_id, is_approved)
VALUES
  ('a3333333-3333-3333-3333-333333333333','a@test','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true),
  ('b3333333-3333-3333-3333-333333333333','b@test','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true),
  ('c3333333-3333-3333-3333-333333333333','c@test','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false)
ON CONFLICT (user_id) DO NOTHING;

-- Two connections in two orgs.
INSERT INTO public.dsx_connections (id, org_id, twin_id, status,
  gateway_jwt_issuer, gateway_jwt_audience, gateway_jwt_key_ref,
  allowed_source_subjects)
VALUES
  ('a2222222-2222-2222-2222-222222222222','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','a1111111-1111-1111-1111-111111111111',
   'active','iss','aud','key-a', ARRAY['dc.a.power.pdu-1']),
  ('b2222222-2222-2222-2222-222222222222','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','b1111111-1111-1111-1111-111111111111',
   'active','iss','aud','key-b', ARRAY['dc.b.power.pdu-1'])
ON CONFLICT (id) DO NOTHING;
COMMIT;
SEED

run() {
  local name="$1" role="$2" sub="$3" sql="$4" expect="$5"
  local out
  out=$(psql -X -q -v ON_ERROR_STOP=0 2>&1 <<EOF
BEGIN;
SET LOCAL ROLE $role;
$( [ -n "$sub" ] && echo "SET LOCAL \"request.jwt.claim.sub\" TO '$sub';" )
$sql
ROLLBACK;
EOF
)
  if [ "$expect" = "deny" ]; then
    if echo "$out" | grep -qE "ERROR|permission denied|violates row-level"; then
      echo "PASS $name"
    elif echo "$out" | grep -qE "^\s*0$|^\(0 rows\)"; then
      echo "PASS $name (0 rows)"
    else
      echo "FAIL $name"; echo "$out"; exit 1
    fi
  else
    if echo "$out" | grep -qE "ERROR|permission denied"; then
      echo "FAIL $name"; echo "$out"; exit 1
    else
      echo "PASS $name"
    fi
  fi
}

# ---- Read isolation ----
run "D1 org-A sees own dsx_connections" authenticated \
  "a3333333-3333-3333-3333-333333333333" \
  "SELECT id FROM public.dsx_connections WHERE org_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';" allow
run "D2 org-A cannot see org-B dsx_connections" authenticated \
  "a3333333-3333-3333-3333-333333333333" \
  "SELECT count(*) FROM public.dsx_connections WHERE org_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';" deny
run "D3 unapproved user sees nothing" authenticated \
  "c3333333-3333-3333-3333-333333333333" \
  "SELECT count(*) FROM public.dsx_connections;" deny
run "D4 anon cannot select dsx_connections" anon "" \
  "SELECT count(*) FROM public.dsx_connections;" deny

# ---- Write denial for end users ----
run "D5 authenticated cannot INSERT dsx_events" authenticated \
  "a3333333-3333-3333-3333-333333333333" \
  "INSERT INTO public.dsx_events (connection_id, org_id, twin_id, asset_mapping_id, event_id, observed_at, received_at, quality, numeric_value, unit, source_subject, gateway_id, schema_version, ingestion_version, envelope)
   VALUES ('a2222222-2222-2222-2222-222222222222','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','a1111111-1111-1111-1111-111111111111',NULL,'evt-1',now(),now(),'validated',1,'kW','x','gw',1,'gw-1','{}'::jsonb);" deny
run "D6 authenticated cannot UPDATE dsx_connections" authenticated \
  "a3333333-3333-3333-3333-333333333333" \
  "UPDATE public.dsx_connections SET status='paused' WHERE id='a2222222-2222-2222-2222-222222222222';" deny
run "D7 authenticated cannot DELETE dsx_connections" authenticated \
  "a3333333-3333-3333-3333-333333333333" \
  "DELETE FROM public.dsx_connections WHERE id='a2222222-2222-2222-2222-222222222222';" deny

# ---- Audit + quarantine end-user denial ----
run "D8 authenticated cannot SELECT dsx_ingestion_audit cross-org" authenticated \
  "a3333333-3333-3333-3333-333333333333" \
  "SELECT count(*) FROM public.dsx_ingestion_audit WHERE org_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';" deny
run "D9 authenticated cannot INSERT dsx_events_quarantine" authenticated \
  "a3333333-3333-3333-3333-333333333333" \
  "INSERT INTO public.dsx_events_quarantine (connection_id, org_id, twin_id, sanitized_reason, reason_code, envelope_snippet, source_subject_hash)
   VALUES ('a2222222-2222-2222-2222-222222222222','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','a1111111-1111-1111-1111-111111111111','x','y','{}'::jsonb,'hash');" deny

# ---- RPC callable only by service_role ----
run "D10 authenticated cannot call dsx_ingest_event" authenticated \
  "a3333333-3333-3333-3333-333333333333" \
  "SELECT public.dsx_ingest_event('a2222222-2222-2222-2222-222222222222','evt',now(),now(),'validated',1,'kW','dc.a.power.pdu-1','gw',1,'dc.a.power.pdu-1','{}'::jsonb,'req');" deny
run "D11 anon cannot call dsx_ingest_event" anon "" \
  "SELECT public.dsx_ingest_event('a2222222-2222-2222-2222-222222222222','evt',now(),now(),'validated',1,'kW','dc.a.power.pdu-1','gw',1,'dc.a.power.pdu-1','{}'::jsonb,'req');" deny
run "D12 service_role can call dsx_ingest_event" service_role "" \
  "SELECT public.dsx_ingest_event('a2222222-2222-2222-2222-222222222222','evt-svc',now(),now(),'validated',1,'kW','dc.a.power.pdu-1','gw',1,'dc.a.power.pdu-1','{}'::jsonb,'req-svc');" allow

echo "ALL DSX RLS ADVERSARIAL PROOFS PASSED"