# Migration Chain — Disposable Replay Specification (B7.5)

**Status:** Static specification only. **No replay was executed** for
this checkpoint. This document is the acceptance contract for the
later disposable-environment replay that B7.6 will authorize.

## Prohibited targets

The replay **must not** run against:

- The current Lovable Cloud (production) database.
- Any Supabase project that shares credentials, schemas, users, or
  storage with the production database.
- Any environment whose write path is reachable from the
  application's production `VITE_SUPABASE_*` values.

The replay target **must** be a fresh, disposable Supabase-compatible
PostgreSQL instance that is destroyed at the end of the run.

## Environment prerequisites

- PostgreSQL **15.x** (Supabase-compatible build; matches Lovable
  Cloud production major version at time of this checkpoint).
- Roles present on the instance: `anon`, `authenticated`,
  `service_role`, `postgres` (superuser for extension install),
  `supabase_admin`, `supabase_auth_admin`, `supabase_storage_admin`.
- Schemas provisioned before migration: `auth`, `storage`, `vault`,
  `graphql`, `extensions`, `pg_catalog`, `public`, `realtime`.
- Extensions installable by superuser:
  - `pg_cron` (schema `pg_catalog`)
  - `pg_graphql` (schema `graphql`)
  - `pg_stat_statements` (schema `extensions`)
  - `pgcrypto` (schema `extensions`)
  - `plpgsql` (schema `pg_catalog`)
  - `supabase_vault` (schema `vault`)
  - `uuid-ossp` (schema `extensions`)
  - `vector` / pgvector (schema `public`)
- `auth.users` table populated by Supabase's auth service, or a stub
  table created ahead of the run (the trigger `handle_new_user`
  written in migration #1 references it).

## Deterministic migration order

Apply files in strict lexicographic order — identical to Supabase
CLI behaviour. Authoritative ordering, checksums and purposes are in
`migration-order-inventory.tsv`. The last migration is the B1
corrective:

```
18  20260724005954_e17e6492-dc51-46f8-bb87-642071501b8b.sql
    SHA256: d943d072e1c50d23e2d1ae3af369c1742a84ce382ab6cdd7f099af139e6dfcea
```

## Replay command (reference)

```bash
# 1. Provision disposable instance (docker or ephemeral Supabase project).
# 2. Verify hostname NOT equal to production project.
# 3. Apply migrations in order:
for f in $(ls supabase/migrations/*.sql | sort); do
  echo "APPLY $f"
  psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

## Preflight assertions

Before starting the replay:

- `SELECT current_database()` returns the disposable db name.
- `SELECT inet_server_addr()` is **not** the production host.
- `SUPABASE_DB_URL` (production) is **not** present in the shell
  environment.
- `pg_available_extensions` contains every extension listed above.

## Post-replay authorization assertions

Every assertion below must return exactly one row unless noted:

```sql
-- No self-manage escalation policies remain on user_roles
SELECT count(*)=0 FROM pg_policies
  WHERE schemaname='public' AND tablename='user_roles'
    AND policyname IN ('user_roles_insert_own','user_roles_update_own',
                       'user_roles_delete_own',
                       'Users can insert own roles',
                       'Users can update own roles',
                       'Users can delete own roles',
                       'Users can manage their own roles');

-- Only owner-scoped SELECT policy remains on user_roles
SELECT policyname, cmd FROM pg_policies
  WHERE schemaname='public' AND tablename='user_roles';
-- expected: user_roles_read_own | SELECT

-- DML on user_roles revoked from anon and authenticated
SELECT has_table_privilege('anon','public.user_roles','INSERT'),
       has_table_privilege('anon','public.user_roles','UPDATE'),
       has_table_privilege('anon','public.user_roles','DELETE'),
       has_table_privilege('authenticated','public.user_roles','INSERT'),
       has_table_privilege('authenticated','public.user_roles','UPDATE'),
       has_table_privilege('authenticated','public.user_roles','DELETE');
-- expected: all false

-- SELECT retained for authenticated
SELECT has_table_privilege('authenticated','public.user_roles','SELECT');
-- expected: true

-- Privileged functions exist and are SECURITY DEFINER with public search_path
SELECT p.proname, p.prosecdef,
       (SELECT config FROM pg_proc pp
         WHERE pp.oid = p.oid
           AND EXISTS (
             SELECT 1 FROM unnest(pp.proconfig) c(config)
             WHERE config = 'search_path=public'
           )) IS NOT NULL as safe_search_path
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('admin_assign_role','admin_revoke_role','is_approved_user');

-- Audit table exists with expected RLS
SELECT rowsecurity FROM pg_tables
  WHERE schemaname='public' AND tablename='role_change_audit';
-- expected: true

-- EXECUTE on privileged fns granted only to authenticated
SELECT has_function_privilege('anon',
  'public.admin_assign_role(uuid,public.app_role,text)','EXECUTE');
-- expected: false
SELECT has_function_privilege('authenticated',
  'public.admin_assign_role(uuid,public.app_role,text)','EXECUTE');
-- expected: true
```

## Rollback / teardown

The disposable instance is destroyed after evidence is collected:

- Docker: `docker rm -f <container>` and `docker volume rm <volume>`.
- Ephemeral Supabase project: delete via the project's own
  management console (not production's).
- No cleanup SQL is executed against production.

## Evidence to capture during replay

- SHA-256 of every migration file at the moment of application.
- Ordered log `psql-apply.log` with per-file timing and any NOTICE.
- JSON snapshot of `pg_policies`, `pg_proc`, and `information_schema.role_table_grants` after each of the following:
  1. After base dump (`20251209160634…`) applied.
  2. After P0 introducer (`20251211234933…`) applied.
  3. After B1 corrective (`20260724005954…`) applied.
- Diff between snapshots 2 and 3 proving the three escalation
  policies were removed and DML privileges revoked.
- Post-replay authorization assertion output from the SQL block
  above (all rows expected).
- Teardown record (container ID / project ID destroyed).

## Handoff

This specification governs any complete-chain replay attempted in
B7.6 or later. It does not authorize that replay. Approval to run
the replay against a disposable environment is a separate decision.