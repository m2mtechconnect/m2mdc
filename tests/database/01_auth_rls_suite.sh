#!/usr/bin/env bash
# PR-0.1 Checkpoint B6 — authz proof suite (transactional)
# Requires: PGHOST/PGPORT/PGUSER pointing at a DISPOSABLE Postgres instance.
# DO NOT run against production or the Lovable Cloud DB.
set -u
: "${PGDATABASE:=b6_test}"
run() {
  local name="$1" role="$2" sub="$3" sql="$4" expect="$5"
  local out; out=$(psql -X -q -v ON_ERROR_STOP=0 2>&1 <<EOF
BEGIN;
SET LOCAL ROLE $role;
$( [ -n "$sub" ] && echo "SET LOCAL \"request.jwt.claim.sub\" TO '$sub';" )
$sql
COMMIT;
EOF
)
  if [ "$expect" = "deny" ]; then
    echo "$out" | grep -qE "ERROR|permission denied|violates row-level" \
      && echo "PASS $name" || { echo "FAIL $name"; echo "$out"; exit 1; }
  else
    echo "$out" | grep -qE "ERROR|permission denied" \
      && { echo "FAIL $name"; echo "$out"; exit 1; } || echo "PASS $name"
  fi
}
run "T1 anon insert" anon "" "INSERT INTO public.user_roles(user_id,role) VALUES ('11111111-1111-1111-1111-111111111111','security_admin');" deny
run "T2 self-insert" authenticated "11111111-1111-1111-1111-111111111111" "INSERT INTO public.user_roles(user_id,role) VALUES ('11111111-1111-1111-1111-111111111111','security_admin');" deny
run "T3 self-update" authenticated "44444444-4444-4444-4444-444444444444" "UPDATE public.user_roles SET role='security_admin' WHERE user_id='44444444-4444-4444-4444-444444444444';" deny
run "T4 self-delete" authenticated "44444444-4444-4444-4444-444444444444" "DELETE FROM public.user_roles WHERE user_id='44444444-4444-4444-4444-444444444444';" deny
run "T5 unapproved admin" authenticated "33333333-3333-3333-3333-333333333333" "SELECT public.admin_assign_role('11111111-1111-1111-1111-111111111111','engineer','test');" deny
run "T6 non-admin" authenticated "22222222-2222-2222-2222-222222222222" "SELECT public.admin_assign_role('11111111-1111-1111-1111-111111111111','engineer','test');" deny
run "T7 admin assign" authenticated "44444444-4444-4444-4444-444444444444" "SELECT public.admin_assign_role('11111111-1111-1111-1111-111111111111','engineer','onboarding');" allow
run "T8 admin revoke" authenticated "44444444-4444-4444-4444-444444444444" "SELECT public.admin_revoke_role('11111111-1111-1111-1111-111111111111','engineer','test');" allow
run "T11 self-revoke security_admin" authenticated "44444444-4444-4444-4444-444444444444" "SELECT public.admin_revoke_role('44444444-4444-4444-4444-444444444444','security_admin','self');" deny
