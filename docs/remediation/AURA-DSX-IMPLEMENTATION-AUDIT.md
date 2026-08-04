# AURA DC — DSX Evidence Beta Independent Implementation Audit

Date: 2026-08-04 (UTC). Auditor: independent implementation audit pass.
No production application code was modified during this audit. Only this report
and non-invasive audit artifacts (screenshots under /tmp/browser/dsx/shots) were created.

## 1. Executive verdict

**AURA DC DSX EVIDENCE BETA AUDIT PARTIAL — REMEDIATION OR VERIFICATION GAPS REMAIN**

Release recommendation: **do not release as an operator-facing product**. The
implementation is honest about its own limits (this is its strongest property),
but two of the eleven specified routes do not exist, the recommendation
decision workflow could not be exercised in the browser, asset selection does
not survive a page reload, and the full repository suite fails 239 tests.

## 2. Scope and limitations

- Audited: `/dsx/evidence-beta` and every child route, at 1440x900, 768x1024, 390x844.
- Runtime verification used Chromium (Playwright) against the local dev server with an injected authenticated session.
- External systems (DSX Exchange broker, Omniverse/OpenUSD stage, hosted backend) were **not connected**. No claim is made about their security or behaviour.
- No destructive testing, no schema or code changes.

## 3. Repository state and commands

| Command | Exit | Result |
| --- | --- | --- |
| `bunx tsgo --noEmit -p tsconfig.app.json` | 0 | 0 errors |
| `bunx vitest run src/dsx --reporter=dot` | 0 | **83 passed / 0 failed / 0 skipped**, 7 files, 5.04s |
| `bunx vitest run --reporter=dot` (full repo) | 1 | **1130 passed / 239 failed / 109 skipped** (1478), 240 files (165 failed), 194.12s |
| `bunx eslint src/dsx src/components/dsx src/pages/dsx` | 0 | 0 errors, 1 warning (`react-refresh/only-export-components`, `src/dsx/runtime/EvidenceBetaContext.tsx:57`) |
| `bunx vite build` | 0 | success, 17 asset chunks |
| Bundle credential scan (`dist/assets`) | — | Only Supabase JWTs with `"role":"anon"` (publishable). No `service_role`, no `sk-` keys. |

Classification of the 239 failures: **none** are in `src/dsx` (0 of 166 failing
files match `dsx`). Failures cluster in `src/simulation/providers/__tests__`,
sanitiser/template/intake suites. They are therefore not DSX regressions, but
they are unevidenced pre-existing failures at repository level and remain
release-blocking for the repository as a whole (classification: *unrelated but
release-blocking*).

## 4. Requirement traceability matrix

| ID | Requirement | Status | Source | Runtime evidence | Severity |
| --- | --- | --- | --- | --- | --- |
| A1 | Eleven distinct workspaces routable | PARTIAL | `src/AuthenticatedShell.tsx:139+`, `src/pages/dsx/workspaces/index.tsx` | 11 child routes render; `/overview` and `/simulations` return the app 404 page at all 3 viewports | High |
| A2 | Each workspace answers a distinct question | PARTIAL | `workspaces/index.tsx` | Thermal/Power/Cooling/Facility/Sovereignty/Carbon/Financials/Evidence are distinct; **Network** and **Workload** render only a capability notice (no operational content) | Medium |
| A3 | Grouped navigation, direct URL, refresh, back/forward | PASS | `EvidenceBetaShell.tsx:18-45` | All 11 direct URLs render; SPA nav verified | — |
| A4 | Shared components genuinely reused | PASS | `MetricTile`, `StateBadges`, `EvidenceBoundary`, `ProvenanceDrawer` | single implementations consumed by all workspaces | — |
| B1 | `SIMULATED · UNCALIBRATED · NOT FOR PHYSICAL CONTROL` on every route | PASS | `src/dsx/modes.ts:65`, `StateBadges.tsx:203` | present and visible on 11/11 routes x 3 viewports | — |
| B2 | LIVE disabled | PASS | `modes.ts:16` `LIVE_MODE_ENABLED=false`; `liveDisabledAdapter.ts` | truth bar shows `Source: disabled`, `Exchange: unavailable` | — |
| B3 | No physical-control surface | PASS | `contracts/recommendation.ts:96` `PHYSICAL_CONTROL_ENABLED=false` | no control affordance found on any route | — |
| B4 | Connection state and freshness separate | PASS | `OperationalTruthBar.tsx:56-63` | two distinct fields observed | — |
| C1 | KPI provenance drawer (value/unit/formula/window/events/limitations) | PASS | `MetricTile.tsx`, `ProvenanceDrawer.tsx` | PUE drawer showed formula `(it_power_total + cooling_power_total)/it_power_total`, version `aura-dsx-kpi/1.0.0`, 10 source event ids, run id, limitations | — |
| C2 | No `Math.random()` / decorative values | PASS | `src/dsx/fixtures/determinism.ts` | no `Math.random()` in `src/dsx` | — |
| C3 | Missing inputs -> Unavailable + named inputs | PASS | `UnavailableState` in Power/Cooling/Facility | branch power, hydraulic state, 3D stage all Unavailable with named missing inputs | — |
| D1 | Stable asset identity, no fabricated prim path | PASS | `facilityGraph.ts`, `OPENUSD_UNAVAILABLE` | selected asset card shows stable UUID, source id, `OpenUSD mapping unavailable` | — |
| D2 | Selection synchronised across workspaces | PARTIAL | `EvidenceBetaContext.tsx` (in-memory only) | SPA navigation preserves selection; **full page reload/direct URL loses it** (no URL or storage persistence) | Medium |
| E-Sim | Dedicated Simulations workspace | NOT IMPLEMENTED | scenario controls live inside Facility overview | `/simulations` 404 | High |
| E-Sim2 | Only cooling degradation produces results; others Planned | PASS | `ScenarioPanel` | Baseline + Cooling degradation selectable; RPP failure, Utility loss, Increased rack density, Workload surge, Network congestion all marked `PLANNED` | — |
| E-Thermal | Heat exposure, no fabricated CFD | PASS | `ThermalWorkspace` | ranked inlet queue with per-row observed_at and event id; no airflow/CFD artefacts | — |
| E-Power | Dependency path, unavailable branch metering | PASS | `PowerWorkspace` | electrical chain + dependent racks; branch metering Unavailable | — |
| E-Cooling | Distinct from thermal, hydraulics unavailable | PASS | `CoolingWorkspace` | loop-to-rack dependency; flow/pressure/efficiency Unavailable | — |
| E-Network | Fabrics separated, Exchange not inferred | PARTIAL | `NetworkWorkspace` | honest capability notice only; storage fabric and management network are not modelled at all | Medium |
| E-Facility | Registry, honest OpenUSD coverage, SimReady not inferred | PASS | `FacilityWorkspace` | mapping coverage metric, mapping exceptions, 3D view Unavailable | — |
| E-Workload | Placement + unavailable scheduler inputs | PARTIAL | `WorkloadWorkspace` | capability notice only; no placement model exists | Medium |
| E-Sov | Config alone cannot yield green; unverified on missing evidence | PASS | `evidenceBoundary.ts` | verdict `Unverified — 5 of 7 claims cannot be evidenced` | — |
| E-Carbon | Unavailable without factors | PASS | same | verdict `Unverified — 6 of 8` | — |
| E-Fin | Classified values, no invented costs | PASS | same | verdict `Unverified — 5 of 7` | — |
| F | Recommendation decision workflow (rationale, escalation target, snapshot) | CANNOT VERIFY (browser) / PASS (unit) | `contracts/recommendation.ts`, `useEvidenceBeta.ts:78-127` | contract + hash + validation covered by the 83 unit tests, but **no recommendation card or decision form could be reached in the browser** after stepping the cooling-degradation scenario | High |
| G | Per-claim provenance drilldowns | PASS | `EvidenceBoundary.tsx:121-259` | 7 sovereignty, 8 carbon, 7 financial drilldown buttons; drawer shows claim id, domain, status, basis/blocker, blocking capability, next step, supporting observations, missing inputs; Escape closes | — |
| G2 | Fresh DSX suite rerun after drilldown change | PASS (count unchanged) | — | 83/83 rerun today; **no new test was added for the drilldown feature** | Medium |
| H1 | Responsive at 3 viewports | PASS | — | 11/11 routes render with visible truth bar at 1440/768/390 | — |
| H2 | Landmark and heading structure | FAIL | shell + app layout | **two `<main>` landmarks** on every DSX route, and **no `<h1>`** on any DSX route (content starts at `h2`) | Medium |
| I1 | No secrets in bundle | PASS | — | anon publishable key only | — |
| I2 | Console clean | PASS | — | 0 console errors on 11/11 routes x 3 viewports (only third-party analytics `i.clarity.ms` request failures, unrelated to DSX) | — |

## 5. Confirmed defects

**AUD-001 — High — Specified routes `/dsx/evidence-beta/overview` and `/dsx/evidence-beta/simulations` do not exist.**
Route: both. File: `src/AuthenticatedShell.tsx:139`. Repro: open either URL.
Expected: overview and simulations workspaces. Actual: application 404 page,
console `404 Error: User attempted to access non-existent route`. Overview is
served at the index path and simulation controls are embedded in it; there is no
simulations workspace. Fix: add `overview` as an explicit path (redirecting index)
and extract a dedicated simulations workspace. Release impact: blocking against
the eleven-route specification.

**AUD-002 — High — Recommendation decision workflow is not reachable in the running app.**
Route: `/dsx/evidence-beta` and `/evidence`. Files: `ScenarioPanel.tsx`,
`useEvidenceBeta.ts`. Repro: step the cooling-degradation scenario on the overview,
inspect for recommendation cards. Actual: no recommendation element, no
Approve/Reject/Escalate control found; the Evidence page renders a Decisions
heading with no pending items. Expected: a pending recommendation requiring a
human decision. The logic and validation exist and are unit-tested, but the
end-to-end workflow is unverified in the browser. Release impact: blocking —
the human-decision claim cannot be demonstrated.

**AUD-003 — Medium — Shared asset selection does not survive reload or direct link.**
Routes: all. File: `src/dsx/runtime/EvidenceBetaContext.tsx` (in-memory `useState`).
Repro: select Rack 03 on Thermal, hard-navigate to `/facility`. Actual: "Select an
asset in any workspace" (no selection). Expected: selection preserved or clearly
scoped to the session. Fix: encode `selectedAssetId` in the URL query.

**AUD-004 — Medium — Duplicate `<main>` landmark and missing `<h1>` on all DSX routes.**
Files: `EvidenceBetaShell.tsx:120` plus the outer authenticated layout.
Actual: 2 `main` elements, 0 `h1` per route. Fix: render the DSX shell inside the
existing layout `main`, and promote the workspace title to `h1`.

**AUD-005 — Medium — Network and Workload workspaces contain no operational content.**
Files: `workspaces/index.tsx` NetworkWorkspace, WorkloadWorkspace. They are honest
capability notices, not workspaces; storage fabric, management network and DSX
Exchange are not separated as required, and no workload-to-rack placement exists.

**AUD-006 — Medium — No test accompanies the per-claim drilldown feature.**
The DSX suite total is unchanged at 83 before and after the drilldown change, so
the drilldown behaviour is verified only by this manual browser pass.

**AUD-007 — Medium — Repository suite fails 239 tests.**
None are in `src/dsx`, but the failures are undocumented and block a repository-level release gate.

**AUD-008 — Low — Structural sovereignty claims show an empty supporting-event list.**
The drilldown states "This is a structural claim" with 0 event ids, which is honest,
but the boundary table's evidenced/not-evidenced counts are not reconcilable to event ids for these claims.

Counts: Critical 0, High 2, Medium 5, Low 1.

## 6. Safety, security and external systems

- Control boundary: no dispatch surface exists; `PHYSICAL_CONTROL_ENABLED = false`, LIVE gated by `LIVE_MODE_ENABLED = false` with an explicitly unimplemented transport. **PASS**.
- No misleading green styling observed: unavailable/disabled states render neutral or amber.
- No secret exposure in source or built bundle beyond the intended anon publishable key.
- **Not assessed (unavailable/not connected):** hosted backend security, tenant isolation, DSX Exchange runtime security, Omniverse connection security, physical-control security. No assurance is claimed for any of these.

## 7. Remediation order

1. AUD-002 (demonstrable human-decision workflow) and AUD-001 (route completeness).
2. AUD-004 (landmarks/headings) and AUD-003 (selection persistence).
3. AUD-005 (Network/Workload substance or explicit descoping).
4. AUD-006, AUD-007, AUD-008.

## 8. Criteria for the next verification pass

All eleven specified paths resolve; a recommendation is reachable, requires a
rationale, rejects escalation without a target, and records an immutable evidence
snapshot — proven by browser evidence and by new unit tests raising the DSX total
above 83; one `main` and one `h1` per route; asset selection survives reload;
repository failures documented or fixed; typecheck, focused lint, build and DSX
suite green on a fresh run.
