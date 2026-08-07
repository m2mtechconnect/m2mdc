# Stage 5A - Front-End Closeout Validation and Evidence Freeze

Status: PARTIAL (12 of 15 gates PASS, 1 REMEDIATED, 2 BLOCKED_BY_AUTH)
Operating mode: SIMULATED. Production verdict: NO-GO (unchanged).

## Gate results

| Gate | Description | Result |
|---|---|---|
| S5A-01 | Production build (`vite build`) | PASS |
| S5A-02 | Type-check (`tsc -p tsconfig.app.json --noEmit`) | PASS (0 errors) |
| S5A-03 | Lint of Stage 5 surface files | PASS (0 problems on changed files) |
| S5A-04 | Repo-wide lint / unit suite | BASELINE (1466 lint problems, 228 test failures - pre-existing, unchanged by Stage 5) |
| S5A-05 | Capability + provenance unit tests | PASS (10/10) |
| S5A-06 | Prohibited-claims scan across `src/**` | PASS (0 matches) |
| S5A-07 | Run provenance determinism | REMEDIATED - see Defect D-5A-01 |
| S5A-08 | OperatingStateBar mounted globally | PASS (Layout.tsx) |
| S5A-09 | Percentage-confidence removal | PASS (4 remaining components corrected) |
| S5A-10 | Export truth metadata (CSV/JSON/HTML) | PASS |
| S5A-11 | Assistant evidence-boundary disclaimer | PASS |
| S5A-12 | NVIDIA DSX readiness route exists | PASS (static) |
| S5A-13 | Route runtime inventory (17 routes) | BLOCKED_BY_AUTH |
| S5A-14 | Responsive/visual QA of authenticated surfaces | BLOCKED_BY_AUTH |
| S5A-15 | Zero unauthorised egress from app shell | PASS with note (fonts.googleapis/gstatic, clarity.ms telemetry only) |

## Defect D-5A-01 (fixed)

`OperatingStateBar.tsx` and `ProvenanceBadge.tsx` fabricated run IDs and calculation
timestamps with `new Date()` on every render, so displayed provenance rotated on refresh.
Resolved by `src/capabilities/runProvenance.ts`, which resolves the run ID and calculation
timestamp from `simulationSnapshotStore` and renders "Unavailable" when no run exists.
Regression covered by `src/capabilities/__tests__/runProvenance.test.ts`.

## Percentage-confidence corrections (S5A-09)

| File | Before | After |
|---|---|---|
| `src/components/rag/GeminiResponsePanel.tsx` | `{citation.confidence}%` column "Confidence" | `signalStrength(...)`, column "Rule-based signal" |
| `src/components/blueprint/AgentHealthPanel.tsx` | `NN% confidence` | `<Strong/Moderate/Weak> signal` + visible `SIGNAL_BASIS` |
| `src/components/blueprint/WorkflowEnhancementsPanel.tsx` | `NN% conf` | `<Strong/Moderate/Weak> signal` + rule-based disclaimer |
| `src/components/blueprint/KPIEnhancementsPanel.tsx` | "confidence bands" | "rule-based projection bands" |
| `src/components/simulation/AIRecommendationsPanel.tsx` | (already qualitative) | added visible `SIGNAL_BASIS` + `SIGNAL_RULES` note |

## Route inventory (static, from `src/App.tsx` and `src/AuthenticatedShell.tsx`)

Public: `/`, `/auth`, `/login`, `/sign-in`, `/sign-up`, `/sign-out`, `/forgot-password`,
`/mfa`, `/twin-datacentre`, `/data-centre-twin`, `/omniverse-scene`, `/onboarding`.

Authenticated (selected): `/dashboard`, `/builder`, `/deploy`, `/analytics`,
`/infrastructure`, `/account/settings`, `/settings/integrations/nvidia-dsx`, `/pilot/*`,
and the 12 DSX Evidence Beta workspaces under `/dsx/evidence-beta/*`
(overview, thermal, power, cooling, network, facility, workload, simulations,
sovereignty, carbon, financials, evidence).

## S5A-13 / S5A-14 blocker

Runtime verification executed headless against `http://localhost:8080` with `?demo=true`.
`LOVABLE_BROWSER_AUTH_STATUS=signed_out`, so all 16 authenticated routes redirected to `/`
(landing) and the OperatingStateBar could not be observed on any authenticated surface.
Evidence: `/tmp/browser/s5a/routes.json` (17 routes probed, 0 nav errors, 0 console errors,
0 blank pages). These gates remain BLOCKED_BY_AUTH until an authenticated preview session
is available; no production project was contacted.
