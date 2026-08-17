# Published-runtime results

Target: `https://auradc.m2mtechconnect.com` (published host), compared against
the current build on the local dev server to separate code defects from publish
staleness.

## Anonymous sweep — published host

| Route | Status | Final URL | Console errors |
| --- | --- | --- | --- |
| `/` | 200 | `/` | 0 |
| `/login` | 200 | `/login` | 0 |
| `/onboarding` | 200 | `/onboarding` (step 1 of 4 renders) | 0 |
| `/dashboard` | 200 | redirected to `/` | 0 |
| `/manage/connections` | 200 | redirected to `/` | 0 |
| `/admin/platform-readiness` | 200 | redirected to `/` | 0 |
| `/builder`, `/simulation`, `/evidence` | 200 | redirected to `/` | 0 |

Unauthorized redirect is fail-closed on every protected route. No protected
content rendered before the redirect.

One failed request on every landing render:
`/landing/hero-datacenter.mp4 -> ERR_ABORTED`. The hero video asset is missing
from the published bundle. Cosmetic, no console error, no functional impact.
Logged in `deferred-backlog.md`.

## Authenticated sweep — published host vs current build

| Route | Published host | Current build |
| --- | --- | --- |
| `/dashboard` | `TypeError: Failed to fetch` + "Failed to fetch locations" | clean, 0 console errors |
| `/manage/connections` | **404 route not found** | renders, 0 console errors |
| `/manage/connections?tab=catalogue` | **404 route not found** | renders, 0 console errors |
| `/admin/platform-readiness` | **404 route not found** | renders, 0 console errors |
| `/builder` | 200, 0 errors | 200, 0 errors |
| `/simulation` | 200, 0 errors, deep link resolves to `?step=inspect` | identical |
| `/evidence` | 200, 0 errors, deep link restores scenario/mode/run/tick | identical |

**The published host is stale.** It predates the connections control plane, so
`/manage/connections` and `/admin/platform-readiness` do not exist there and the
dashboard fetch failure is from a superseded bundle. Both are absent from the
current build. This is a publish-pending state, not a code regression — but it
means the published-runtime acceptance for the connections control plane is
`BLOCKED_UNVERIFIED` until the app is republished.

Everything that *does* exist on the published host behaves correctly.

## Connection control-plane surfaces (current build)

Catalogue, wizard, detail drawer, managed-access history, activation, health
check and deletion all render and operate with zero console errors. One
non-fatal failed request on `/manage/connections`
(`rest/v1/dsx_events?select=id`) is the expected policy-denied probe used to
determine whether a DSX runtime is present; it is handled and surfaces as an
honest "not deployed" state rather than an error.

## Managed connector truth checks

| Requirement | Result |
| --- | --- |
| No connector marked operational without runtime evidence | pass |
| Unconfigured connectors show an honest unavailable state | pass — `AVAILABLE_ARCHITECTURE_NOT_CONFIGURED` |
| No authorization button starts a non-configured flow | pass — the Google Drive buttons are removed entirely |
| No fake provider response generated | pass |
| Build-time assistant capabilities not shown as runtime-connected | pass |
| MQTT classified as AURA native | pass |
| DSX classified by actual deployment state | pass — "not deployed" |
| Google Drive not promoted, tested or presented as connected | pass — zero occurrences of "Google Drive" in the rendered text of every authenticated route swept |

## Accessibility and responsive

Zero console errors and no layout overflow at 1280x1800 across the sweep. The
full axe suite was not re-run in this phase; the last recorded green run is
unchanged by these edits, which touch one edge function and remove two buttons.
Recorded as `BLOCKED_UNVERIFIED` rather than claimed.
