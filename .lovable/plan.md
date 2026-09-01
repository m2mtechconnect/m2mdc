# Builder create failure — diagnosis and smallest safe repair

## Verdict

Not an auth, tenant, RLS, or schema problem. The last two live `builders-create`
invocations failed **input validation at the edge (HTTP 400)** before any database
access. The browser sent `type: "operational"`, which is not in the function's
accepted enum.

## Log evidence (connected backend, function `builders-create`)

Two POST invocations, both rejected identically:

```text
[builders-create:c3a3dc78-...] Validation failed {
  issues: [{ received: "operational",
             code: "invalid_enum_value",
             options: [ "agent", "process_twin", "3d_twin" ],
             path: [ "type" ] }] }
[builders-create:cc3929fd-...] (identical)
```

- HTTP status: **400** (`supabase/functions/_shared/handler.ts:107-115` returns
  `VALIDATION_ERROR` / "Request validation failed" with status 400 on schema failure).
- Error code: `VALIDATION_ERROR`; failing contract: `InputSchema.type` in
  `supabase/functions/builders-create/index.ts:17`.
- The `supabase.functions.invoke` client surfaces any non-2xx as the generic
  "Edge Function returned a non-2xx status code" the owner saw, hiding the 400 body.

## Ruled out (with evidence)

- **Gateway/JWT**: only one earlier `401 Invalid or expired token` at 1788235121,
  from a stale session; the two later attempts passed auth and reached validation.
- **active_org_id / membership / facility lookup / RLS / insert constraint / schema**:
  all of those run *after* validation. No such log line exists for these attempts.
  OPTIONS preflights returned normally.

## Non-sensitive IDs available

Only correlation IDs (`c3a3dc78-…`, `cc3929fd-…`) and the function id. The logs
carry no user, org, or twin id for the failing calls, because the handler rejects
before the `Creating builder draft` log line. No tokens or personal data present.

## Root cause in source

`src/lib/builder/templateToBlueprint.ts:177`

```ts
type: ((template as any).twin_type || config.type || 'agent') as any,
```

`twin_type` is a *template taxonomy* value (`operational`, `workforce`,
`compliance`, …, see `src/lib/templateLoader.ts:18`), while the builder `type` is
the *build kind* (`agent | process_twin | 3d_twin`). The Data Centre master
template declares `"twin_type": "operational"`
(`src/data/templates/data-centre-master.json:7`, also
`src/twins/dataCenter/MasterTemplate.ts:30`), so every template-seeded build sends
`type: "operational"` and is rejected. The `as any` cast is what lets the two
incompatible vocabularies collide silently.

A secondary, same-class exposure: `src/stores/wizardBuilderStore.ts:344` casts an
unvalidated `?type=` URL parameter straight into the request.

## Smallest safe repair (when authorized — no edits made)

1. In `templateToBlueprint.ts`, stop assigning `twin_type` to `type`. Map through
   an explicit whitelist: `3d_twin` for facility/data-centre templates, `agent`
   otherwise, and never pass an unrecognized value through.
2. In `wizardBuilderStore.ts`, validate the `?type=` param against the same three
   values and drop it when it does not match.
3. Optionally surface the server's validation detail in `builderService.create`
   so a 400 reads as a field error instead of the opaque non-2xx message.

Frontend-only, no Edge Function redeploy, no migration, no data mutation.

## Rollback path

All three are localized frontend edits; revert the commit and republish the prior
build. Backend state is untouched, so no rollback is required there. The already
deployed `builders-create/get/update/deploy` functions stay as-is.

## Not done here

Diagnostic only: no code edited, nothing deployed, published, migrated, or mutated.
