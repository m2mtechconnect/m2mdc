# AURA DC Phase 1 — Security and Data Foundation: evidence

Baseline accepted: commit `6f6a502`, 1,430 tests / 1,097 passed / 224 failed / 109 skipped, Node v22.22.0.
Database: PostgreSQL 17.6. All evidence below was produced against the live project database
and the running application, not inferred from source.

Status vocabulary: PROVEN | IMPLEMENTED | CONFIGURED | STUBBED | OPEN

## B-02 — has_role() type mismatch — CLOSED (PROVEN)

### Root cause
`public.user_roles.role` was `text`. `public.has_role(_user_id uuid, _role public.app_role)`
compared that `text` column to an `app_role` parameter. PostgreSQL has no
`text = app_role` operator, so every call raised `SQLSTATE 42883:
operator does not exist: text = app_role` at query time. Any RLS policy whose
`USING` clause called `has_role()` could therefore never return true.

### Inventory of affected objects
Functions reading `public.user_roles`: `has_role`, `check_user_has_role`,
`user_has_role`, `user_can_access_agent`, `dsx_current_user_is_operator_in_org`,
`enforce_profile_immutable_columns`, `admin_assign_role`, `admin_revoke_role`,
`on_profile_approved_grant_default_role`.

Policies rebuilt against the repaired helper (15):
`audit_logs` x2, `contact_expert_logs`, `integration_logs`, `integrations` x4,
`mcp_sync_runs`, `role_change_audit`, `profiles` x2, `data_centre_twins`,
`industry_agents`, `onboarding_submissions`.

### Repair
1. `app_role` extended with every label the application and the legacy CHECK
   constraint already accepted: `admin`, `operator`, `viewer`, `owner`,
   `compliance`, `data_analyst`, `marketing`, `sales`, `support`, `finance`.
   Enum labels must be committed before use, so this is its own migration.
2. Dropped `user_roles_role_check` (a `text[]` whitelist that itself raised
   42883 against an enum column, and is now redundant with the enum).
3. `ALTER TABLE public.user_roles ALTER COLUMN role TYPE public.app_role`.
4. All helpers recreated with `SET search_path = pg_catalog, public`, schema-qualified
   names, and expiry honoured (`expires_at IS NULL OR expires_at > now()`).
5. `EXECUTE` on every authorization helper revoked from `PUBLIC` and `anon`.

### Verification (post-migration, live DB)
```
information_schema.columns: public.user_roles.role -> udt_name = app_role
role distribution preserved: admin = 5, engineer = 15   (unchanged from baseline)
has_function_privilege('anon',          'has_role(uuid,app_role)','EXECUTE') = false
has_function_privilege('authenticated', 'has_role(uuid,app_role)','EXECUTE') = true
```
`tests/unit/permissions.test.ts`: 10 passed.

### Limitation, stated plainly
An end-to-end signed-in assertion that a rebuilt policy now returns rows was
NOT executed. `LOVABLE_BROWSER_AUTH_STATUS=signed_out`, and the sandbox psql
role cannot `SET ROLE authenticated` (`permission denied to set role`). The type
repair is proven at the catalog and privilege level; per-policy row visibility
for a signed-in administrator is **UNVERIFIED** until a session is available.
`tests/database/01_auth_rls_suite.sh` is the intended harness and requires a
disposable Postgres instance.

## B-03 — unintended anonymous reads — CLOSED (PROVEN)

### Inventory before
`anon` held `arwdDxtm` (all privileges) on every table in `public`. Live REST
probes with the publishable key returned HTTP 200 with row data from
`public.sites`, `public.dc_blueprint_templates` and `public.agent_definitions`.
Other tables returned 200 with `[]` — denied by RLS, not by privilege.

### Closure
- `REVOKE ALL` for `anon` on all tables, sequences and functions in `public`.
- `ALTER DEFAULT PRIVILEGES` so future objects inherit default-deny.
- Sole retained anonymous capability: `GRANT INSERT ON public.onboarding_submissions`
  (marketing lead capture; no read-back).
- The three `{public}`-role read policies replaced with explicit
  `TO authenticated` policies so intent is legible in the catalog.

### Verification (post-migration)
See `b03-anon-probes-after.txt`. Every probed table returns
`401 / 42501 permission denied`, including the three that previously leaked.
`rpc/has_role` returns `401 / 42501`. The intentional lead-capture write returns
`400 / 23502` (a NOT NULL column complaint), which proves privilege is granted
and only payload validation rejected the probe.

### Regression check on signed-out surfaces
Playwright, Chromium, 1280x1800, against the running app:
`/`, `/?demo=true` and `/login` all render, titles correct, **zero console errors
and zero `/rest/v1/` requests**. No signed-out surface depended on anonymous
database access.

## B-06 — browser-side privileged writes — CLOSED for role mutations (IMPLEMENTED)

`INSERT/UPDATE/DELETE/TRUNCATE` on `public.user_roles` revoked from `anon` and
`authenticated`; the table is read-own only. All role changes now run through
audited `SECURITY DEFINER` RPCs that verify the caller is authenticated, approved
and an administrator, refuse self-escalation and self-lockout, and append to
`public.role_change_audit`:
`admin_grant_role`, `admin_revoke_role_grant`, `admin_set_user_role`,
`admin_clear_user_roles` (plus the pre-existing `admin_assign_role` / `admin_revoke_role`).

Call sites migrated off direct table writes: `src/pages/Teams.tsx` (approve,
edit role, remove member) and `src/pages/account/AccessControl.tsx` (grant, revoke).
`npx tsgo --noEmit -p tsconfig.app.json`: exit 0.

## Still OPEN

- **B-04 tenant isolation.** No `tenant_id` on most entities; ownership is still
  `user_id`. Not addressed in this slice.
- **B-01 duplicate role systems.** `RBACContext` and `useUserPermissions` still
  coexist; both now read a correctly typed column, but the consolidation onto a
  single permission-based authority is not done.
- **Signed-in RLS assertion** for the 15 rebuilt policies (see limitation above).
