# End-to-end workflow results

Evidence: `evidence/deep-workflow-twin-responsive.json`.

## Core workflow: sign in -> facility -> inspect -> configure -> simulate -> compare -> review

| Step | Result |
| --- | --- |
| Sign in / session restore | Pass. Session restores on hard refresh; `/`, `/auth`, `/sign-in` all resolve to `/dashboard` when signed in. |
| Select facility | Pass. `/manage/facilities` lists 25 real twins; dashboard carries the facility UUID into blueprint, simulation and evidence links. |
| Inspect / Configure / Simulate / Compare / Review | WIRED_WITH_LIMITATIONS. All five steps exist as tabs on `/simulation`, but the step is not encoded in the URL: `?step=configure` and `?step=review` render identically, and a refresh returns to the default step. Deep-linking or sharing a workflow step is not possible. |
| Run simulation | BLOCKED_UNVERIFIED. The "Run simulation" control is disabled with no stated reason, and no non-destructive run could be executed. No run id was produced, so downstream results, comparison and export could not be verified end to end. |
| Compare scenarios | BLOCKED_UNVERIFIED (depends on a completed run). |
| Review evidence and provenance | Pass for wiring. Evidence workspaces carry `scenario`, `mode=SIMULATED`, a stable `run` id and `tick`; these survive hard refresh and deep link to the same record. |
| Export | BLOCKED_UNVERIFIED - not exercised (would be a production write). |
| Back navigation without context loss | Pass for dashboard/blueprint/evidence links (facility UUID and kpi/claim parameters preserved). Fail for `/simulation` step state. |

Simulated versus measured values remain distinguishable everywhere: a global
provenance strip ("SIMULATED / Design baseline / No run recorded / Synthetic
inputs") is present on every authenticated page.

## Digital-twin route (`/data-centre-twin`)

| Parameter | Refresh-stable | Observation |
| --- | --- | --- |
| `?facility=nvidia-reference` | Yes | URL survives refresh, but the header still reports "Facility Model (Simulated) - 40 Racks / 5 Rows / 5000 kW", the same as baseline. Reference mode is not reported as active or as declined, and no reason is surfaced. |
| `?view=2d`, `?view=simulation` | Yes | URL preserved; view state not independently confirmable from the DOM. |
| `?layer=thermal|power|carbon|sovereignty` | Yes | URL preserved; underlying facility figures unchanged (correct: layers do not mutate operational data). |
| `?layer=notARealLayer` | Yes | Fails safe - no crash, baseline scene renders. |
| `?realism=video-informed` | Yes | `window.__auraRealismMode` is null; the admin-only realism lane did not activate under this session/renderer. Correct fail-closed direction. |

`window.__auraTwinStats` and `window.__auraRuntimeCoverage` were null under
SwiftShader, so mounted-object provenance could not be reconciled at runtime on
the published host. No visual or performance verdict is issued (out of scope).
