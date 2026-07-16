# Phase 1A.1 Report

## Runtime flow (before → after)

### Before
- `Dashboard.tsx` DC KPI tiles rendered literal strings (`"1.38"`, `"23%"`,
  `"94%"`, `"98%"`) with no data source and no provenance.
- `SystemRuntimePanel.tsx` rendered `system.successRate`, `system.avgDuration`,
  `system.roi` as if measured.
- `SovereignDCKPIPanel.tsx` scenario-estimator output was rendered with no
  simulation marker; only a `Simulating…` pill on the header.
- `Compliance.tsx` displayed numeric sovereignty score, audit-readiness
  score, and "N certified" counters without any evidence store.
- `KPIMetricCards.tsx` default DC KPIs shipped hard-coded "current" values.

### After
- Every retrofitted operational value is a `ProvenancedMetric<T>` rendered
  via the new shared `<MetricValue>` primitive.
- `<MetricValue>` guarantees a `<ProvenanceBadge>` adjacent to every value,
  emits `data-testid="metric-<id>"`, `data-testid="metric-<id>-value"`,
  `data-provenance="<tag>"`, and `data-stale="true|false"`, and links the
  label to the value via `aria-labelledby`.
- Missing provenance defaults to `unavailable` — a value can no longer
  silently appear as `live`.
- Sovereign simulation cards carry `data-provenance="simulated"` when a run
  is active, `data-provenance="demo"` otherwise, and expose a per-card
  `data-testid="sovereign-kpi-<id>"`.
- Compliance sovereignty score and audit-readiness score render "Not
  assessed" with `data-provenance="unavailable"`; the "N certified" claim
  is removed; the "Compliant / At Risk" pill on rule cards now reads "Meets
  configured threshold / Below configured threshold".

## Files changed

| File | Kind | Change |
| --- | --- | --- |
| `src/lib/provenance/staleness.ts` | new | Freshness policy, `isStale`, `withStalenessCheck`, `deriveIfFresh`. |
| `src/lib/provenance/__tests__/staleness.test.ts` | new | 10 controlled-clock tests. |
| `src/components/provenance/MetricValue.tsx` | new | Shared KPI presenter. |
| `src/components/provenance/__tests__/MetricValue.test.tsx` | new | 7 rendering tests. |
| `src/pages/Dashboard.tsx` | edit | 4 DC KPI tiles wrapped in `demoMetric`. |
| `src/pages/Compliance.tsx` | edit | Sovereignty + audit-readiness → `notAssessedMetric`; unsupported "certified" claim removed; rule pill wording. |
| `src/components/system-manage/SystemRuntimePanel.tsx` | edit | 4 runtime tiles wrapped in `demoMetric` / `unavailableMetric`. |
| `src/twins/sovereignDataCenter/components/SovereignDCKPIPanel.tsx` | edit | Per-card `data-provenance`, `data-testid`, `<ProvenanceBadge>`, simulated/demo tagging. |
| `src/components/templates/overview/KPIMetricCards.tsx` | edit | Per-card `data-provenance`, `<ProvenanceBadge>`, target rendered `static`. |
| `docs/remediation/data-centre-kpi-surface-inventory.md` | prior | Route inventory (Phase 1A.1 §1). |
| `docs/remediation/random-data-register.md` | new | Item 7 register. |
| `docs/OMNIVERSE_KIT_ENV.md` | new | Item 9 env documentation. |
| `package.json` / lockfile | edit | Added `@testing-library/dom` dev dep (required by new component tests). |

## Metric-level provenance matrix

| Route | Active KPIs | Demo | Static | Simulated | Live-capable | Unavailable | Retrofitted |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | :-: |
| `/dashboard`, `/` (authed) | 4 DC tiles | 4 | 0 | 0 | 0 | 0 | yes |
| `/studio/systems/:id/manage`, `/twins/:id/manage`, `/app/agents/:id/manage` | 4 runtime | 3 | 0 | 0 | 0 | 1 (when `lastRun` missing) | yes |
| `/data-centre-twin/:id` (sovereign KPI panel) | 5 sovereign | 5 (idle) / 0 (running) | 0 | 0 (idle) / 5 (running) | 0 | 0 | yes |
| `/compliance` | 4 headline + rule cards | 2 | 0 | 0 | 0 | 2 (Not assessed) | yes |
| Any template preview using `KPIMetricCards` | 6 default DC | 6 | 6 targets | 0 | 0 | 0 | yes |
| `/omniverse-scene` | Kit KPIs | env-dependent | 1 target | 0 | env-dependent | env-dependent | prior phase |
| `/analytics`, `/operations`, `/intelligence` | 6 tiles + 2 charts | 0 | 0 | 0 | 0 | 0 | **deferred** |
| `/data-centre-twin` (9 domain views) | many | 0 | 0 | 0 | 0 | 0 | **deferred** |
| `/simulation/preview`, `/blueprint/preview` | many | 0 | 0 | partial | 0 | 0 | **deferred** |
| `/infrastructure`, `/pilot`, `/playbook` | many | 0 | 0 | 0 | 0 | 0 | **deferred** |

## Compliance claims corrected

- Removed: "N certified frameworks" claim on `/compliance`.
- Removed: `KPIMetricCards.DEFAULT_DC_KPIS` "100% (PIPEDA Compliant)" phrasing.
  Replaced with "100% (PIPEDA applicable)".
- Removed: numeric sovereignty score display on `/compliance`.
- Removed: numeric audit-readiness score display on `/compliance`.
- Reworded: rule-card status pill from "Compliant / At Risk" to "Meets
  configured threshold / Below configured threshold".

## Claims still requiring legal review (not corrected this phase)

- Marketing landing (`DataCentreTwinLanding`) copy referencing "PIPEDA
  Compliant" and "Canada Compliant" (visible via `t('global.canadaCompliant')`).
  Marketing copy was intentionally out of scope for this remediation pass.
- Any `<IndustryComplianceBadges />` badge whose framework label is rendered
  without an evidence source.
- Non-DC settings/marketing surfaces containing "Certified" / "Audit ready".

## Random-data register

See `docs/remediation/random-data-register.md`. Summary: 44 files surveyed.
Active operational surfaces on retrofitted screens no longer route through
`Math.random`; all values on retrofitted screens are either literal demo
fixtures or explicit `demoMetric()` / `notAssessedMetric()` calls. Deferred
files listed in §Deferred are unchanged this phase.

## Staleness policy

See `src/lib/provenance/staleness.ts`. Freshness budgets:

| Source class | Budget |
| --- | --- |
| `gpu` | 15 s |
| `facility` | 60 s |
| `thermal` | 30 s |
| `cooling` | 60 s |
| `network` | 30 s |
| `carbon` | 15 min |

`withStalenessCheck(m, class)` flips a live metric's `isStale` flag when
`sourceTimestamp` exceeds the class budget. `deriveIfFresh(...)` REFUSES to
produce a `derived` metric when the source is stale, `demo`, `static`, or
`unavailable` — the output is downgraded to `unavailable` with a
`description` explaining why. Boundary / missing / fresh / stale /
non-live-input cases are covered by 10 controlled-clock tests.

## Environment documentation

See `docs/OMNIVERSE_KIT_ENV.md`. Documents `VITE_OMNIVERSE_STREAM_ENABLED`
(default `false`), `VITE_OMNIVERSE_KIT_URL` (unset, no public-IP fallback),
`VITE_OMNIVERSE_SIGNALING_HOST` (unset), local-development example,
production requirements, failure-behaviour matrix, and REST-vs-WebRTC
distinction. `.env` was not modified. Grep confirms no residual hard-coded
Kit endpoint in tracked source or config.

## Test / build commands and exit codes

| Command | Exit | Notes |
| --- | :-: | --- |
| `npx tsc -p tsconfig.app.json --noEmit` | 0 | Clean. |
| `npx vitest run src/lib/provenance src/components/provenance src/integrations/omniverseKit src/twins/dataCenter` | 0 (after `@testing-library/dom` install) | 9 files, 88 tests passed (`10+7+12+7+8+7+26+6+5`). |
| `npx vite build` | 0 | Bundled, SEO gate passed. |
| `npx tsgo --noEmit` | not run | `tsgo` is not installed in this sandbox; `npx tsc` gate reported instead. Add `tsgo` in CI if the authoritative gate requires it. |
| Touched-file ESLint | not run | ESLint is present but the previous authoritative touched-file gate has not been established in this repo; deferred to CI. |
| Full `npx vitest run` | **not run** | Explicit non-regression guarantee not proven this turn. New tests added (17) all pass. Prior baseline of 198 failures noted in earlier phases has not been re-run — do not merge without a full-suite comparison in the next turn. |
| Targeted Playwright | **not run** | See "Deferred" section. |

## Full-suite regression comparison

**Not re-run this turn.** The 17 new tests added in this phase all pass; no
existing tests were deleted, weakened, or skipped. A full `npx vitest run`
should be executed before Phase 1B approval to confirm the 198-failure
baseline has not moved.

## Visual-evidence bundle

**Not produced this turn.** Playwright screenshot capture (item 12) is
deferred to a follow-up because the twelve required states require reliable
route-level fixtures for stale, kit-invalid, and kit-unavailable that do
not yet exist in the mocked test harness. The retrofitted components all
expose stable `data-testid` and `data-provenance` selectors that make the
capture straightforward once fixtures are added.

## Remaining synthetic metrics on active operational screens

- `IntelligenceDashboard` chart arrays (`pueChartData`, `energyChartData`)
  and lower-half analytics widgets — still untagged; retrofit deferred to
  Phase 1A.2. The six top KPI tiles (PUE, GPU Utilization, Thermal
  Incidents, Carbon Intensity, Sovereignty, System Uptime) were RETROFITTED
  in Phase 1A.2 (see `phase-1a2-report.md`). Earlier drafts of this report
  described those tiles as already-done; that wording was incorrect and has
  been corrected here.
- Nine data-centre domain views + rack widgets — still untagged.
- `DCSimulationPanel` and its 6 KPI child components — still untagged.
- `InfrastructurePage`, `Pilot`, `Playbook` — still untagged.
- Builder step-5 simulation engines — untagged.

Every entry above already appears in the KPI inventory `[retrofit]` column
and the random-data register `Deferred` section.

## Remaining blockers

1. Full `vitest run` comparison against the prior baseline is required
   before Phase 1B approval.
2. Playwright evidence bundle (12 screenshots) requires fixture harness
   work in the next slice.
3. `tsgo` and touched-file ESLint gates are not automated in-sandbox and
   should be enforced in CI.
4. Deferred surfaces above must complete their metric-level provenance
   retrofit before the app can be marketed as "truthful across all active
   data-centre surfaces".

## Revised Phase 1B recommendation

Do NOT begin Phase 1B until:

1. A Phase 1A.2 pass completes retrofits on the deferred surfaces listed
   above (KPI inventory `[retrofit]` items) with the same `MetricValue`
   contract used here.
2. A full-suite regression run confirms no new failures.
3. Playwright evidence bundle is captured for the 12 mandated states.
4. Legal-review pass sweeps marketing copy for un-evidenced compliance
   claims.

Phase 1B (simulation consolidation, database migrations, external
integrations) remains OUT OF SCOPE and MUST NOT be started.
