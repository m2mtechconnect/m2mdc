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

## Planned forward-only migration (Checkpoint B - not yet applied)

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
```

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
