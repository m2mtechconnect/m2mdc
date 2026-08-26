# Diagnosis: "Start build" does nothing on /builder

## 1. Where this screen and button live

- `src/pages/Builder.tsx` — the whole `/builder` route.
- Lines 319-361 render the "Start a facility build" fallback screen; the button label is at line 350, its handler `startFacilityBuild` is defined at lines 320-329.
- Supporting logic: init effect lines 164-213, facility resolution effect lines 154-162, draft creation in `src/stores/wizardBuilderStore.ts` (lines 320-355) via `src/services/builderService.ts` `create()` (lines 53-85), which calls the `builders-create` edge function.

## 2. Exact control flow on click

```text
click -> startFacilityBuild()
  facilityId = activeTwinId if it is in configuredTwins, else configuredTwins[0]
  if no facilityId -> window.location.assign('/manage/facilities?create=true&next=builder')
  if activeTwinId !== facilityId -> await setActiveTwin(facilityId)
  navigate(`/builder?new=true&twin=${facilityId}&source=facility&type=3d_twin`)
```

## 3. Root cause

The reproduction URL is already exactly the URL the handler navigates to.

- The fallback screen renders because of the condition at line 319: `!hasIntent || initError || (!isLoading && !builderId)`. On this URL `hasIntent` is true, so the screen is showing because initialization did not yield a draft (`builderId` null) or because `initError` was set.
- `startFacilityBuild` then calls `navigate()` with a target string that is byte-identical to the current location (same path, same four params, same twin id). React Router treats a navigation to the identical location as a no-op: no remount, no history entry, no URL change.
- Nothing else in the handler changes state: `isInitialized` is already `true`, so the init effect at lines 164-213 will not re-run; `initError` is never cleared; the store's `initializeBuilder` is never called again. Hence: no URL change, no UI change, no saved build, no error.

So the button is structurally a dead control on precisely the URL that produces the screen it lives on. This is a UI control-flow defect, not an auth, RLS, or tenant defect.

### Why initialization did not produce a draft (secondary, to confirm at fix time)

`builders-create` fails closed with 403 when `active_org_id()` is null and 404 when the twin is not readable by the caller. Either surfaces as a thrown error that sets `initError` and a destructive toast. The requested facility `7fad266d-…` is a legacy personal record (`org_id` is null, readable only through the "Users can view their own twins" policy), while the created draft is written with the server-verified `org_id`. A build started from a personal, org-less facility is therefore a plausible trigger for the failure that lands the user on this screen. That correlation is not yet proven from a production log and should be confirmed rather than assumed; the dead-button defect is independent of it and is proven from source.

## 4. Smallest safe fix

All in `src/pages/Builder.tsx`, presentation/control flow only. No change to auth gates, RBAC checks, RLS, the edge function, the store's tenant rules, or provenance.

- In `startFacilityBuild`, build the target URL first and compare it with the current `location.pathname + location.search`.
  - If it differs: navigate as today (unchanged behaviour).
  - If it is identical: perform an in-place retry instead of a no-op navigation — clear `initError`, reset the wizard store, set `isInitialized(false)` so the existing init effect re-runs with the same, unmodified query parameters.
- Ensure the retry path cannot silently swallow a failure: the existing `.catch` in the init effect already sets `initError` and shows a destructive toast, so a repeated failure now yields a visible, truthful error instead of silence.
- When `initError` is present, label the button "Retry build" so the control states what it does.
- Keep every query parameter exactly as-is (`new`, `twin`, `source`, `type`); nothing is rewritten or dropped.

No files other than `src/pages/Builder.tsx` need to change for the defect itself.

## 5. Tests to add

New file `src/pages/__tests__/builder-start-build-action.test.tsx` (or the repo's existing Builder test location):

1. Rendering `/builder?new=true&twin=<id>&source=facility&type=3d_twin` with an init failure shows the start screen and the button is present.
2. Clicking the button on that identical URL triggers a re-initialization attempt (store `initializeBuilder` called again) rather than a no-op.
3. A second failure surfaces a visible error (alert region and destructive toast), never a silent no-op.
4. Clicking from a different Builder URL still navigates and preserves all four query parameters verbatim.
5. With no active organization, the button path is unreachable — the "No active organization" screen renders instead (fail-closed regression guard).
6. With no configured facilities, the button routes to facility creation.

Extend the existing Builder contract test to assert the handler never issues a navigation to a location identical to the current one.
