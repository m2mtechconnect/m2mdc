# Blocked Runtime Execution Manifest - Stage 2B (PREPARED, NOT EXECUTED)

Target: the disposable hosted project **`aura-dc-security-test`**. Nothing in this manifest may run against
`psfvrskpnwcshvajzeix`. Every command must be preceded by `npm run guard:test-env`, which fails closed unless
`AURA_DC_TEST_ENV === "aura-dc-security-test"` and the resolved project reference equals `SUPABASE_PROJECT_ID`.

**No credential values appear in this document.** Personas are referenced by symbolic id only; the runner resolves
each id to a credential from the disposable-project secret store at execution time.

## Personas

| id | Description | Provisioning fixture | Cleanup |
|---|---|---|---|
| `tenant_a_admin` | Approved profile in org A, `admin` in `user_roles` | `fx-org-a`, `fx-user-a-admin` | delete auth user; cascade |
| `tenant_a_member` | Approved profile in org A, `engineer` | `fx-user-a-member` | delete auth user; cascade |
| `tenant_b_admin` | Approved profile in org B, `admin` | `fx-org-b`, `fx-user-b-admin` | delete auth user; cascade |
| `tenant_b_member` | Approved profile in org B, `engineer` | `fx-user-b-member` | delete auth user; cascade |
| `expired_member` | Org A membership with `expires_at` in the past | `fx-user-expired` | delete auth user |
| `disabled_member` | Org A membership, `profiles.is_approved = false` | `fx-user-disabled` | delete auth user |
| `unaffiliated_authenticated_user` | Valid session, no org, no role | `fx-user-orphan` | delete auth user |
| `anonymous_user` | Publishable anon key only, no session | none | none |
| `platform_admin` | `admin` role, no org affiliation | `fx-user-platform-admin` | delete auth user |

## Probe matrix

| # | Gate | Probe | Persona | Expected | Fixture | Cleanup | Evidence artifact |
|---|---|---|---|---|---|---|---|
| R-01 | Clean migration replay | `supabase db reset` on an empty disposable project, all 35 migrations in filename order | n/a | exit 0; 0 errors | empty project | drop schema | `50-migration-replay.log` |
| R-02 | Upgrade-path migration | replay to the pre-Phase-1 migration, seed, then apply the remaining migrations | n/a | exit 0; no data loss; row counts preserved | `fx-seed-legacy` | drop schema | `51-upgrade-path.log` |
| R-03 | Auth lifecycle | sign-up, email confirm, sign-in, refresh, sign-out, re-sign-in, password reset | `tenant_a_member` | each step 200; session invalid after sign-out | `fx-user-a-member` | delete auth user | `52-auth-lifecycle.json` |
| R-04 | Auth denial | sign-in then read any core table | `disabled_member` | 0 rows or 403 on every core table | `fx-user-disabled` | delete auth user | `52-auth-lifecycle.json` |
| R-05 | Auth denial | sign-in then read org A data | `expired_member` | 0 rows | `fx-user-expired` | delete auth user | `52-auth-lifecycle.json` |
| R-06 | B-02 UPDATE-escape | for each of the 53 policies that inherit `USING` as the effective `WITH CHECK`, attempt an UPDATE that rewrites the ownership column to another principal | `tenant_a_member` | every attempt rejected (`42501`) or 0 rows affected | `fx-rls-matrix` | truncate fixtures | `53-b02-update-escape.csv` |
| R-07 | B-02 read scope | SELECT every core table as each persona and diff against the expected owned set | all authenticated personas | exactly the owned rows | `fx-rls-matrix` | truncate | `53-b02-update-escape.csv` |
| R-08 | B-04 cross-tenant read | read each of the 16 `authoritative_tenant_path` tables belonging to org B | `tenant_a_admin` | 0 rows | `fx-org-a`, `fx-org-b` | truncate | `54-b04-cross-tenant.csv` |
| R-09 | B-04 cross-user read | read each of the 28 `user_only_path` tables owned by another user in the same org | `tenant_a_member` | 0 rows - **and record whether the product intends org-wide visibility** | as above | truncate | `54-b04-cross-tenant.csv` |
| R-10 | B-04 unowned tables | read the 5 `no_authoritative_ownership_path` tables | `unaffiliated_authenticated_user` | record actual result; classify as intended catalog or leak | none | none | `54-b04-cross-tenant.csv` |
| R-11 | B-04 cross-tenant FK | insert a child row (e.g. `twin_telemetry`) pointing at a parent owned by org B | `tenant_a_admin` | rejected | `fx-org-b-twin` | truncate | `54-b04-cross-tenant.csv` |
| R-12 | Ownership reassignment | UPDATE `created_by_user` / `owner_id` / `user_id` on an owned row to another principal | `tenant_a_member` | rejected | `fx-rls-matrix` | truncate | `55-ownership-reassignment.csv` |
| R-13 | Tenant reassignment | UPDATE `org_id` on an owned row to org B | `tenant_a_admin` | rejected | `fx-org-a/b` | truncate | `55-ownership-reassignment.csv` |
| R-14 | B-06 role management | call `admin_grant_role`, `admin_revoke_role`, `admin_set_user_role`, `admin_clear_user_roles` | `tenant_a_admin` then `tenant_a_member` | admin succeeds and writes `role_change_audit`; member gets `42501` | `fx-user-a-*` | delete rows | `56-b06-role-management.csv` |
| R-15 | Privilege escalation | self-INSERT into `user_roles` with `admin` | `tenant_a_member` | rejected | none | truncate | `56-b06-role-management.csv` |
| R-16 | Storage isolation | list and download objects in every bucket owned by the other tenant | `tenant_b_member` | 403 or empty | `fx-storage-a` | delete objects | `57-storage-isolation.csv` |
| R-17 | Storage write | upload into another principal's prefix | `tenant_a_member` | rejected | `fx-storage-b` | delete objects | `57-storage-isolation.csv` |
| R-18 | Realtime isolation | subscribe to every table in the realtime publication and mutate as the other tenant | `tenant_a_member` observer, `tenant_b_admin` writer | observer receives zero events | `fx-org-a/b` | unsubscribe; truncate | `58-realtime-isolation.csv` |
| R-19 | RPC tenant enforcement | call `dsx_ingest_event`, `dsx_current_user_in_org`, `dsx_current_user_is_operator_in_org`, `rpc_kpi_*`, `match_documents`, `has_role` with another tenant's identifiers | `tenant_a_member` | 0 rows or explicit denial; no cross-tenant data in any result | `fx-dsx-a/b` | truncate | `59-rpc-tenant-enforcement.csv` |
| R-20 | Gateway default | call one no-in-code-auth function with **no** Authorization header | `anonymous_user` | records the platform `verify_jwt` default - **this single probe decides whether the 39 `unprotected_reachable` functions are anon-reachable or authenticated-only** | none | none | `60-edge-gateway-default.json` |
| R-21 | Privileged Edge abuse | `analytics-export`, `analytics-overview`, `analytics-systems`, `ai-systems`, `ops-overview`, `ops-systems`, `ops-heartbeat`, `ops-events`, `ops-environments`, `ops-ingest-health`, `metrics-summary` as a member of org A, requesting org B identifiers | `tenant_a_member` | must return only org A data | `fx-org-a/b` | none | `61-edge-privileged-abuse.csv` |
| R-22 | Privileged Edge abuse | `teams-invite` requesting `role: admin` for an arbitrary email | `tenant_a_member` | must be rejected for a non-admin caller | `fx-user-a-member` | delete invite rows | `61-edge-privileged-abuse.csv` |
| R-23 | Privileged Edge abuse | `templates-seed`, `website-cache-clear`, `aoc-runtime-control`, `migrate-credentials-to-vault` (state-changing, service-role) | `tenant_a_member`, `anonymous_user` | must be rejected | snapshot affected tables | restore snapshot | `61-edge-privileged-abuse.csv` |
| R-24 | Signed webhook | `dsx-ingest` with (a) no token, (b) a token signed by the wrong key, (c) an expired token, (d) a valid token for another org's connection | `anonymous_user` | (a)-(d) all rejected before any state read | `fx-dsx-connection` | truncate `dsx_events*` | `62-dsx-ingest-webhook.csv` |
| R-25 | DB-backed Edge probes | every function classified `authenticated_only` that reads a core table: call as `tenant_a_member` and assert the response contains no org B row | `tenant_a_member` | no cross-tenant rows | `fx-org-a/b` | none | `63-edge-db-probes.csv` |
| R-26 | Error-path disclosure | force each privileged function into its error branch (malformed body, bad uuid) | `tenant_a_member` | no stack trace, connection string, key or internal table name in the response body | none | none | `64-error-path-disclosure.csv` |

## Execution preconditions
1. `aura-dc-security-test` exists and is empty.
2. `AURA_DC_TEST_ENV`, `SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` are set for that project only.
3. `npm run guard:test-env` returns ALLOWED.
4. `tests/_setup/liveBackendGuard.ts` evaluates `allowed: true`.

Any precondition failing aborts the whole manifest. Per Stage 2A scope, **these variables are not being requested yet**.
