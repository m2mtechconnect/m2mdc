# Reference Facility UI — harness isolation pass

Command: `npx playwright test --config=playwright.harness-isolation.config.ts` (temporary config, removed after the run)
Route under test: `/data-centre-twin?geometry=nvidia-reference`, dev server on port 8091.

## Part 1 — eight-case fixture matrix

Raw records: `fixture-matrix.json` (run 1), `fixture-matrix-rerun.json` (run 2, cases 2/3/5/8, 80s wait).

| Case | twin REST | init script | asset proxy | run 1 | run 2 |
|---|---|---|---|---|---|
| 1 | off | off | off | layout visible, 27.1s | - |
| 2 | on | off | off | hang | hang |
| 3 | off | on | off | hang | visible, 18.1s |
| 4 | off | off | on | visible, 7.3s | - |
| 5 | on | on | off | hang | visible, 7.0s |
| 6 | on | off | on | visible, 5.6s | - |
| 7 | off | on | on | visible, 5.8s | - |
| 8 | on | on | on | hang | visible, 12.6s |

**No fixture combination is deterministically causal.** Cases 3, 5 and 8 flipped from hang to pass with no fixture change, and case 1 (zero fixtures) reproduced the slow path. A follow-up `--repeat-each=5` probe on case 2 hung 1 run in 5. The failure is a **non-deterministic race, not a fixture-triggered defect**.

## Interception inventory observed

All intercepted requests were `resourceType: fetch` only:
- `**/rest/v1/data_centre_twins*` matched exactly `https://<ref>.supabase.co/rest/v1/data_centre_twins?select=*&order=name.asc` (3 hits/run).
- `**/__l5e/assets-v1/**` matched only `http://localhost:8091/__l5e/assets-v1/<asset-id>/rack_42u_a.glb`.
- No handler ever matched a document, script, module, source map or lazy chunk request in any of the eight cases.

## Part 6 — lazy-module settlement (supersedes the previous finding)

Instrumented `React.lazy` in `AuthenticatedShell` and the `DataCentreTwin` component body:

- `/src/pages/DataCentreTwin.tsx` — HTTP 200, `text/javascript`, 56,130 bytes
- `/src/components/twin-visualization/TwinVisualizationLayout.tsx` — HTTP 200, `text/javascript`, 95,662 bytes
- lazy state during a hang: `{"DataCentreTwin":"resolved"}`
- component render counter during the same hang: `null` (body never executed)
- pending request list during the hang: `[]`; zero console errors; zero page errors

**The lazy-module promise does settle.** The earlier "unresolved lazy promise" diagnosis is disproved. In the hung runs React resolves the module and then never retries the Suspense boundary, so `<main>` stays on `Loading workspace...` indefinitely while every network request is complete.

## Status

Root cause is localized to the render-retry path after lazy resolution, not to the harness fixtures, not to asset bytes, and not to authorization. It is intermittent (~1 in 5 on the affected path). Parts 2-5 and 7-9 were not completed in this pass.

Verdicts:
- AURA_TEST_HARNESS_NOT_CLOSED
- AURA_DATA_CENTRE_ROUTE_NOT_CLOSED
- AURA_NVIDIA_REFERENCE_UI_NOT_CLOSED

Phase 3 verdict unchanged.
