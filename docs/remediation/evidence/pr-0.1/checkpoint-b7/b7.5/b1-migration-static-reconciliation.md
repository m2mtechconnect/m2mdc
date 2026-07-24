# B1 Corrective Migration — Static Reconciliation

**Migration file:** `20260724005954_e17e6492-dc51-46f8-bb87-642071501b8b.sql`
**SHA-256:** `d943d072e1c50d23e2d1ae3af369c1742a84ce382ab6cdd7f099af139e6dfcea`
**Position in chain:** 18 of 18 (last)
**Reconciliation script:** `scripts/verify-b1-static-reconciliation.mjs`
**Result:** **PASS** — 26/26 checks

## Chain context (repository-only)

| # | File | Role wrt B1 |
|---|------|-------------|
| 01 | `20251209160634_remix_migration_from_pg_dump.sql` | Baseline — creates `user_roles`, `app_role` enum, `has_role`, `profiles` |
| 10 | `20251211234933_..._b6d2e072...sql` | **P0 introducer** — creates `user_roles_insert_own` / `_update_own` / `_delete_own`, permitting a caller to grant themselves any `app_role` |
| 11–17 | intermediate | Do **not** modify `user_roles` policies or grants |
| 18 | `20260724005954_..._e17e6492...sql` | **B1 corrective** — this file |

No migration file is positioned after B1, so no later file can
visibly reintroduce the escalation path in the repository chain.

## Statically proven facts

All checks are pattern-based static reads of the migration source.
They do not claim the corrective is effective remotely — that is a
B7.6 concern.

### Policy removal

- `DROP POLICY IF EXISTS "user_roles_insert_own"` — present.
- `DROP POLICY IF EXISTS "user_roles_update_own"` — present.
- `DROP POLICY IF EXISTS "user_roles_delete_own"` — present.
- Legacy variants (`"Users can insert own roles"`,
  `"Users can update own roles"`, `"Users can delete own roles"`,
  `"Users can manage their own roles"`) are also dropped.

### Grant reduction

- `REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated`.
- `GRANT SELECT ON public.user_roles TO authenticated` (read only).
- `GRANT ALL ON public.user_roles TO service_role` (edge/admin path).

### Read policy replacement

- `CREATE POLICY "user_roles_read_own" ... USING (auth.uid() = user_id)`.

### Audit table

- `CREATE TABLE IF NOT EXISTS public.role_change_audit (...)` created
  **before** the admin functions that INSERT into it (positional
  check verified: audit_pos < assign_pos).
- RLS enabled; admin-only SELECT policy scoped to
  `has_role(auth.uid(), 'security_admin')`.

### Privileged functions

For each of `admin_assign_role` and `admin_revoke_role`:

- `CREATE OR REPLACE FUNCTION public.<fn>(...)` present.
- `SECURITY DEFINER` set.
- `SET search_path = public` set (matches the project's safe-search-path convention).
- Body requires `is_approved_user(_actor)`.
- Body requires `has_role(_actor, 'security_admin')`.
- `REVOKE ALL ON FUNCTION public.<fn>(uuid, public.app_role, text) FROM PUBLIC`.
- `GRANT EXECUTE ON FUNCTION public.<fn>(uuid, public.app_role, text) TO authenticated`.

### Dependency reconciliation

- `is_approved_user` reads `public.profiles` (present since migration 01).
- `has_role(uuid, public.app_role)` created in migration 01.
- `app_role` enum created in migration 01.
- No later migration weakens or shadows these objects.

### Between-P0-and-B1 regression scan

Every migration between file 10 (P0) and file 18 (B1) was scanned
for `CREATE POLICY user_roles_(insert|update|delete)_own` and for
`GRANT INSERT|UPDATE|DELETE ON ... user_roles TO (anon|authenticated)`.
**Zero matches.**

## What this reconciliation does not prove

- That the migration has actually been applied to the production
  Lovable Cloud database. That determination requires remote
  authorization verification (B7.6+ external blocker).
- That no out-of-band manual change was applied to production
  policies or grants after migration 10 and before migration 18.
- That the intermediate database state between migrations 10 and 18
  (when the escalation policies existed) never allowed a
  role-elevation to persist in a user's `user_roles` row. Any
  pre-existing residue must be addressed by the remote audit that
  B7.6 will authorize.

## Verdict

**B1 corrective migration statically reconciled — chain shows no
regression through the last repository file.**

Complete-chain runtime proof remains pending on the disposable
replay described in `migration-replay-specification.md`.