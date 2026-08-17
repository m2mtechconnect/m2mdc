# Onboarding and entry loading states

Reproduction: the audit's persistent spinner was not in the `/onboarding` form itself. It came from
the two unbounded loading gates in `src/App.tsx` (session/approval resolution and RBAC resolution),
which render an indefinite spinner for every authenticated entry, including redirects into
onboarding.

Correction: `src/components/shared/BoundedLoading.tsx`. Loading is bounded to 12 seconds, after
which the route reaches a terminal state that names the stage that stalled (session, approval,
authorization) and offers retry or sign-out. It never auto-retries and cannot loop.

Runtime result: `/dashboard` reaches useful content in under 2 seconds at 1280x900 and remains
settled at 5s, 10s and 16s. The onboarding form preserves entered data because the gate sits above
it and no remount is triggered by the timeout.
