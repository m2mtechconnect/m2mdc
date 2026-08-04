# AURA DC — Independent Implementation Audit: DSX Evidence Beta

Scope: `/dsx/evidence-beta` and the `src/dsx` subsystem.
Method: source inspection, deterministic unit execution, production build, and authenticated browser verification at 1440x900, 768x1024 and 390x844.
Audit date: 2026-08-04. Auditor position: independent of the implementing work.

## 1. Verdict

**AURA DC DSX EVIDENCE BETA AUDIT PARTIAL — REMEDIATION OR VERIFICATION GAPS REMAIN.**

The truth-in-UI, provenance, safety-boundary and human-decision claims are supported by code and by reproducible runtime behaviour. Two named routes from the eleven-workspace specification do not exist, and the decision/evidence record is not durable. Those two items block a full pass.

Correction to the previous audit: the earlier finding that "the recommendation decision workflow is unreachable in the browser" is **not sustained**. It is reachable and fully operable; the previous check simply did not advance the scenario clock. Evidence in section 5.

## 2. Automated gate results

| Gate | Command | Result |
| --- | --- | --- |
| Typecheck | `tsgo` | PASS, 0 errors |
| Production build | `bun run build` | PASS, exit 0 |
| DSX unit suite | `bunx vitest run src/dsx` | **96 passed / 0 failed / 0 skipped**, 8 files |
| Full repository suite | `bunx vitest run` | 1143 passed / 239 failed / 109 skipped |
| Lint (DSX tree) | `eslint src/dsx src/components/dsx src/pages/dsx` | 0 errors, 1 warning (`EvidenceBetaContext.tsx` fast-refresh export) |

Failure attribution for the full suite: **0 of the 165 failing files are under `src/dsx`.** The dominant cluster is 99 files under `tests/e2e` that are Playwright specs executed by the Vitest runner and abort with `Playwright Test did not expect test.describe() to be called here`. That is a runner-configuration defect in the wider repository, not a DSX regression, but it means the repository has no single trustworthy green suite.

## 3. Route inventory and rendering

Route table: `src/AuthenticatedShell.tsx:139-152`. Eleven rendered workspaces: index (facility overview), thermal, power, cooling, network, facility, workload, sovereignty, carbon, financials, evidence.

39 direct loads (13 paths x 3 viewports) plus 30 in-app rail navigations were executed.

| Result | Detail |
| --- | --- |
| 11 implemented workspaces | Render at all three viewports, persistent truth bar present, **0 console or page errors** |
| `/dsx/evidence-beta/overview` | Falls through to the global NotFound page at all three viewports |
| `/dsx/evidence-beta/simulations` | Falls through to the global NotFound page at all three viewports |

The overview workspace is reachable only at the index path, and scenario control lives inside it; there is no dedicated simulations workspace.

## 4. Truth-in-UI and safety boundary

Confirmed by source and runtime:

- `LIVE_MODE_ENABLED = false` (`src/dsx/modes.ts:16`) and `resolveMode('LIVE', ...)` fails closed to `UNAVAILABLE` (line 57).
- `PHYSICAL_CONTROL_ENABLED = false` (`src/dsx/contracts/recommendation.ts:96`). No dispatch path exists.
- No `Math.random()` and no wall-clock `Date.now()` in DSX runtime code; the only occurrence is a comment in `src/dsx/fixtures/determinism.ts`.
- Truth bar renders on every workspace: facility, data mode Simulated, Calibration Uncalibrated, last validated observation, DSX Exchange unavailable, active scenario, observation window, connection health, data freshness, and the `SIMULATED · UNCALIBRATED · NOT FOR PHYSICAL CONTROL` chip.
- Connection health and data freshness are reported as separate facts, not collapsed into one status.

Metric provenance drawer, captured live on the PUE tile:

```text
Value 1.3281396245113692 ratio
Formula (it_power_total + cooling_power_total) / it_power_total
Formula version aura-dsx-kpi/1.0.0
Observation window 2026-03-02T08:00:00.000Z -> 2026-03-02T08:00:00.000Z
Simulation run sim:cooling_degradation:20260804:2026-03-02T08:00:00.000Z
Confidence not reported (uncalibrated model)
Badges: Simulated / Fresh / Range-checked · unverified / Uncalibrated
```

No KPI is labelled "Validated" while calibration is absent, which closes defect D-03. Evidence boundary drilldowns are present on all assurance workspaces (7 per-claim Details controls on Sovereignty) and expose claim id, domain, basis, blocking capability, next step, supporting observation ids, missing inputs and declared unattested inputs.

## 5. Human decision workflow — reachable and enforced

Reproduction: open the index workspace, press Play, allow the scenario to advance, then navigate to Evidence and decisions.

| Check | Observed |
| --- | --- |
| Recommendation surfaces after degradation | `1 of 1 recommendation(s) awaiting a human decision.` |
| Approve with empty rationale | Rejected: `A written rationale is required for every decision.` No record written |
| Approve with rationale | Record written: `APPROVED by internal operator at 2026-03-02T08:29:02.000Z`, `Execution status: manual execution pending. AURA performed no action.` |
| Evidence snapshot | Captured and rendered with the decision |
| Hostile rationale `<img src=x onerror=alert(1)>` | Escaped as text, 0 injected `img` nodes, no script execution |

## 6. Confirmed defects

| ID | Sev | Finding | Evidence |
| --- | --- | --- | --- |
| AUD-101 | High | `/dsx/evidence-beta/overview` and `/dsx/evidence-beta/simulations` return the global NotFound page. Named specification routes are absent | Route table `AuthenticatedShell.tsx:139-152`; 6 of 6 direct loads NotFound |
| AUD-102 | High | Decision records are in-memory only. After reload, recorded approvals disappear (`dsx-decision-recorded` count 2 -> 0). An auditable decision log that does not survive a refresh cannot be evidence | Browser run `flows2.json` |
| AUD-103 | Medium | Selected asset persists across in-app navigation but is lost on reload, so a deep link cannot reproduce an operator's view | Browser run `flows2.json` |
| AUD-104 | Medium | No `<h1>` on any DSX workspace and two `<main>` landmarks per page (app shell plus workspace shell) | 33 of 33 route loads |
| AUD-105 | Low | Escape closes both drawers correctly, but focus is not returned to the invoking trigger after close | Browser run `flows2.json` |
| AUD-106 | Medium (repository, not DSX) | 99 Playwright specs under `tests/e2e` are collected by Vitest and fail on collection, so the repository has no clean full-suite baseline | Full-suite log |
| AUD-107 | Low | Seven of nine scenarios are labelled PLANNED. Only baseline and cooling degradation are executable | Scenario control panel |

Previously registered defects D-01, D-02, D-03 and D-04 are confirmed resolved in the current tree.

## 7. Required remediation before a full pass

1. AUD-101 — either implement the two named workspaces or amend the specification and navigation so no named route resolves to NotFound.
2. AUD-102 — persist decision records and their evidence snapshots, and prove durability with a reload test.
3. AUD-103 — encode the selected asset and observation step in the URL.
4. AUD-104 — one `<main>` per page and one `<h1>` per workspace.
5. AUD-105 — return focus to the trigger on drawer close.
6. AUD-106 — exclude `tests/e2e` from the Vitest include set so the full suite is meaningful.

## 8. Reproduction

```bash
bunx vitest run src/dsx          # 96/96
bun run build                    # exit 0
python3 /tmp/browser/audit/run.py    # 13 paths x 3 viewports, console capture
python3 /tmp/browser/audit/flows2.py # decision, drilldown, persistence flows
```

Artefacts: `/tmp/browser/audit/report.json`, `/tmp/browser/audit/flows2.json`, screenshots in `/tmp/browser/audit/shots/`.
