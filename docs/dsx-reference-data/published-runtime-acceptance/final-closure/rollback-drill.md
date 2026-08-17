# Rollback drill

Executed against the published host with an administrator session, plus a
code-level correction.

1. Activated `?dataset=nvidia-dsx-reference`: banner present on all 20 routes.
2. Navigated consumer routes, opened Search, Simulation, Evidence: reference
   identity retained, parameter retained.
3. Anonymous attempt at the same URLs: redirected to `/`, banner absent -
   the canary cannot be activated without authority.
4. Legacy pass with no parameter: banner absent, original page components
   returned (different H1 on every route), no reference context.

## Defect found and fixed

`DatasetProvider` re-applied the remembered dataset intent whenever the URL
carried no parameter, including when an operator deliberately deleted
`?dataset=` from the address bar on the same page. That contradicts the
documented canonical-URL rule.

Fix (`src/data/dataset/DatasetProvider.tsx`): the intent is now re-applied only
when the pathname changed - i.e. a plain in-app link that could not carry the
query string. Removing the parameter while staying on the same page clears the
intent and resolves `legacy-synthetic`.

Not executed: durable-record mutation diffing across the drill and the
activation/rollback audit-event read-back - BLOCKED_UNVERIFIED.
