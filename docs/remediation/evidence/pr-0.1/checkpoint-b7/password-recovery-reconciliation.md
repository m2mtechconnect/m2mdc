# Password-Recovery Reconciliation - PR-0.1 B7.4C

**Anchor:** git HEAD `15bc43860593053c739230df0f2a3b9891ab5b55`
**Mode:** read-only. No remote authentication request was performed. No configuration was mutated.
**Supersedes:** the B7.4B version, which still counted `/forgot-password` toward pilot workflows.

## Split classification (authoritative)

| Route              | Role                | Status         | Counts toward pilot workflows? |
|--------------------|---------------------|----------------|--------------------------------|
| `/forgot-password` | recovery-entry page | FUNCTIONAL     | NO - entry only                |
| `/reset-password`  | recovery-completion | ABSENT/BROKEN  | NO                             |
| overall recovery   | end-to-end flow     | NOT OPERABLE   | NO                             |

The overall password-recovery workflow is NOT operable and is NOT counted as a completed pilot workflow at B7.4C.

## `/forgot-password`

- Declared: `src/App.tsx:178` (unauth branch, gated by `onboarding_completed=true`) and `src/App.tsx:253` (authed branch, redirected to `/`).
- Renders: `src/pages/auth/ForgotPassword.tsx`.
- Backend call: `supabase.auth.resetPasswordForEmail(email, { redirectTo: ${origin}/reset-password })`. This is an Auth SDK request to GoTrue. No edge function is invoked.

## `/reset-password`

- NOT declared in `src/App.tsx`.
- No page component exists in `src/pages/`.
- Any hit resolves to the wildcard `*` route: `<Navigate to="/" replace />` (unauth), `<PendingApproval />` (not-approved), `<NotFound />` (authed-approved).
- Consequently, the URL sent by GoTrue's magic-link email lands on a route with no completion UI.

## Recovery-completion failure modes

| Client state              | Route match                   | Outcome                                                 |
|---------------------------|-------------------------------|---------------------------------------------------------|
| Not signed in             | wildcard, unauth branch       | `<Navigate to="/" replace />` - public landing, no UI   |
| Signed in, not approved   | wildcard, not-approved branch | `<PendingApproval />` - no recovery UI                  |
| Signed in and approved    | wildcard, authed branch       | `<NotFound />` - no recovery UI                         |

## What was NOT done in B7.4C

- No `/reset-password` page or route was created.
- No `redirectTo` copy in `ForgotPassword.tsx` was changed.
- No remote GoTrue authentication request was issued.
- No Supabase project setting was changed.

## Consequence for the B7.4C verdict

- Password recovery does NOT contribute to the approved-user pilot workflow set.
- `/forgot-password` remains classified as a `recovery-entry` public route in the allowlist (`recovery_entry_only_routes`).
- `/reset-password` is enumerated in `recovery_broken_routes` for traceability only; it is NOT added as a route.
