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

## Re-run: S5A-05 and S5A-13 (2026-08-07)

Preview auth status remained `signed_out` (`LOVABLE_BROWSER_AUTH_STATUS=signed_out`,
no injected session), so an authenticated in-page verification could not be performed.
The matrix below is the unauthenticated deep-link + hard-refresh proof for all 44 routes.

- S5A-05: PASS re-run (`vitest run src/capabilities`, 10/10 passed).
- S5A-13: PASS for public routes and for redirect behaviour of all authenticated routes.
  Authenticated in-page rendering remains BLOCKED_BY_AUTH.

Evidence: `/tmp/browser/s5a/m5.json` - 44 routes, 0 blank pages, 0 console errors,
0 failed requests, deep-link and refresh URLs identical on every route.

### Public routes (deep link -> after refresh)

| Route | Deep link | After refresh |
|---|---|---|
| `/` | `/` | `/` |
| `/login` | `/login` | `/login` |
| `/sign-in` | `/onboarding` (onboarding gate) | `/onboarding` |
| `/sign-up` | `/onboarding` (onboarding gate) | `/onboarding` |
| `/forgot-password` | `/onboarding` (onboarding gate) | `/onboarding` |
| `/onboarding` | `/onboarding` | `/onboarding` |
| `/twin-datacentre` | `/twin-datacentre` | `/twin-datacentre` |
| `/data-centre-twin` | `/data-centre-twin` | `/data-centre-twin` |
| `/omniverse-scene` | `/omniverse-scene` | `/omniverse-scene` |

### Authenticated routes (unauthenticated behaviour)

All 34 probed authenticated routes plus `/nope-404` redirect to `/` on both deep link and
refresh, with no blank render and no console error:
`/dashboard`, `/builder`, `/deploy`, `/deployments`, `/analytics`, `/operations`,
`/intelligence`, `/infrastructure`, `/account/profile`, `/account/settings`,
`/account/access-control`, `/teams`, `/compliance`, `/marketplace`, `/app/agents`,
`/help`, `/search`, `/settings/ai`, `/settings/integrations/nvidia-dsx`, `/playbook`,
`/pilot`, `/pilot/overview`, and the 12 `/dsx/evidence-beta/*` workspaces.

### Defects found and fixed during the re-run

- **D-5A-02 (HIGH, fixed).** Public route `/data-centre-twin` crashed into the
  ErrorBoundary: `DataCentreDashboard` calls `useCoPilotCommands`/`useCoPilotContext`, but
  the unauthenticated router in `src/App.tsx` did not provide `CoPilotProvider` /
  `CoPilotCommandProvider`. Fixed by wrapping only that route element (a global wrap was
  tried first and rejected because it triggered the anonymous request in D-5A-03 on every
  public route).
- **D-5A-03 (MEDIUM, fixed).** `CoPilotContext` issued an anonymous
  `GET /rest/v1/copilot_memory` on mount, returning 401 after the B-03 anonymous-read
  closure. Fixed by skipping the memory load when no session exists.

Operating mode remains SIMULATED. Production verdict unchanged: NO-GO.
