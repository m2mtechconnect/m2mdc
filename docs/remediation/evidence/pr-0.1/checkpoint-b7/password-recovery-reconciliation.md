# Password-Recovery Reconciliation - PR-0.1 B7.4B

**Anchor:** git HEAD `a1da5a1f01e673209579b3a95a574d50d834f0dc`
**Mode:** read-only. No remote authentication request was performed. No configuration was mutated.

## Declared recovery-entry route

`/forgot-password` - `src/App.tsx:178` (unauth branch) and `src/App.tsx:253` (authed branch).

Renders `src/pages/auth/ForgotPassword.tsx`, which calls:

```
supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/reset-password`,
});
```

No edge function is invoked. The call is an Auth-SDK request to Supabase GoTrue.

## `/reset-password` status

- Not declared in `src/App.tsx`. A production hit for `/reset-password` matches the wildcard (`*`) route.
- No page component exists to complete the recovery. There is no `ResetPassword.tsx` in `src/pages/`.
- Removed from `route-allowlist.json.production_routes` as of B7.4B. Not added anywhere in the classification tables.
- No new route added. Per the authorized decisions, `/reset-password` is not created in this checkpoint.

## Where the user lands after clicking a recovery link

| Client state              | Route match                   | Rendered outcome |
|---------------------------|-------------------------------|------------------|
| Not signed in             | wildcard, unauth branch       | `<Navigate to="/" replace />` - lands on public landing without recovery UI. |
| Signed in, not approved   | wildcard, not-approved branch | `<PendingApproval />` - no recovery UI. |
| Signed in and approved    | wildcard, authed branch       | `<NotFound />` - no recovery UI. |

## Classification of recovery completion

**BROKEN.** The recovery-entry route works truthfully (email is sent), but there is no completion surface.

## Consequence for B7.4B

- Pilot capability "password-recovery entry" is included and operable at `/forgot-password`.
- Pilot capability "password-recovery completion" is NOT included and NOT claimed as working.
- B7.5/B7.6 must decide whether to (a) build a `/reset-password` page and add it to the pilot after full a11y + provenance review, or (b) change the `redirectTo` to a route that clearly communicates recovery is not yet available.

## What was not done

- No remote GoTrue authentication request was issued.
- No Supabase project setting was changed.
- No new route or page was created.
- No copy was rewritten in `ForgotPassword.tsx`.
