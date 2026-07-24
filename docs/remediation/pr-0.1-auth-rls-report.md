# PR-0.1 Auth / RLS Report - Checkpoint A findings

## Effective policies on privileged tables (as of HEAD f3511b30)

### `public.user_roles`

Final state after `20251211234933_...sql`:

| Policy | Cmd | Predicate |
| --- | --- | --- |
| `user_roles_read_own` | SELECT | `auth.uid() = user_id` |
| `user_roles_insert_own` | INSERT | WITH CHECK `auth.uid() = user_id` |
| `user_roles_update_own` | UPDATE | USING `auth.uid() = user_id` |
| `user_roles_delete_own` | DELETE | USING `auth.uid() = user_id` |

**Verdict:** privilege escalation is intentional-looking but unsafe. Any
authenticated user issues:

```
POST /rest/v1/user_roles
{ "user_id": "<their own uid>", "role": "admin" }
```

and PostgREST accepts it. The `has_role()` SECURITY DEFINER function then
returns `true` for that user, so every subsequent `has_role`-gated policy
(admin views, admin functions) grants access.

### `public.profiles.is_approved`

- Column added by `20260212133602_bf66e00b-...sql` (default `false`).
- No policy references `is_approved` on any table.
- No edge function references `is_approved`.
- Only the SPA gate in `src/App.tsx:131-139` enforces it.

**Verdict:** the approval workflow is UX-only; the database and edge
functions treat approved and unapproved users identically.

## Applied forward-only migration (Checkpoint B - APPLIED 2026-07-24)

Note: `app_role` enum in this project is `executive | manager | engineer | security_admin` — the privileged role is `security_admin`, not `admin`. The applied migration uses `security_admin` accordingly.

Verification after apply (via `pg_policies` on `public.user_roles`):

| Policy | Cmd | Predicate |
| --- | --- | --- |
| `user_roles_read_own` | SELECT | `auth.uid() = user_id` |

No INSERT/UPDATE/DELETE policies remain, and `INSERT, UPDATE, DELETE` on `public.user_roles` are revoked from `anon` and `authenticated`. Role changes now go exclusively through `public.admin_assign_role` / `public.admin_revoke_role` (approved `security_admin` only), and every change appends to `public.role_change_audit` (RLS: only `security_admin` can read; no write policy — writes only via the two SECURITY DEFINER functions).

### Applied SQL (as-applied, condensed)

```sql
-- Remove self-role assignment vectors
DROP POLICY IF EXISTS "user_roles_insert_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_own" ON public.user_roles;

-- Role changes are server-only (service_role via controlled edge functions)
-- No INSERT/UPDATE/DELETE policies -> authenticated/anon cannot write.
-- Existing user_roles_read_own remains (auth.uid() = user_id).

-- Approved-user helper (SECURITY DEFINER, fixed search_path, non-recursive)
CREATE OR REPLACE FUNCTION public.is_approved_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_approved FROM public.profiles WHERE user_id = _user_id), false);
$$;
REVOKE ALL ON FUNCTION public.is_approved_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_approved_user(uuid) TO authenticated;
-- plus role_change_audit table + admin_assign_role / admin_revoke_role
-- SECURITY DEFINER functions, REVOKE FROM PUBLIC, GRANT EXECUTE TO authenticated.
```

### Runtime verification status

The database schema and grants are proven by `pg_policies` inspection above. End-to-end runtime proof (authenticated self-INSERT rejected via PostgREST, admin_assign_role success path, cross-tenant read denial, audit row present) still requires a disposable Postgres run and is tracked as UNVERIFIED in `gate-results.json`.

Every RLS policy on user-facing tables will then compose approval:
`auth.uid() = owner AND public.is_approved_user(auth.uid())`. Enumeration
of those tables and their current predicates is Checkpoint B work.

## Planned shared edge-function guards

`supabase/functions/_shared/authz.ts` will export:

- `requireAuthenticatedUser(req)` - JWT present, `getClaims` valid, returns `{ userId, supabase }`.
- `requireApprovedUser(req)` - above + `is_approved_user(userId) = true`, else 403 without disclosing why.
- `requireAdmin(req)` - approved + `has_role(userId, 'admin')`.
- `requireSignedWebhook(req, secretName)` - HMAC verification; no user context.

The existing `_shared/auth.ts` will be preserved as a thin re-export shim
so no consumer breaks in the same PR.

## RLS verification plan

Section 8 of the PR-0.1 brief requires RLS tests against a real database.
Two viable paths:

1. `supabase start` in CI - spins a local Postgres from `supabase/migrations`.
2. Ephemeral Postgres container + `supabase db reset --local`.

Neither has been attempted yet. If both fail in-sandbox, we document as an
external blocker and RLS enforcement remains **unverified** for PR-0.1
completion.
