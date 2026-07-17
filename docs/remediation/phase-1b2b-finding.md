# Phase 1B.2b — Finding: DCSimulationPanel is the sole facade-seam consumer

Status: **CLOSED — docs-only (1B.2b-null)**
Date: 2026-07-17
Authorization: user, this turn ("Approve 1B.2b-null").
Predecessor: Phase 1B.2a.1 (facade migration of `DCSimulationPanel` behind
`VITE_AURA_SIM_FACADE_DCPANEL`, gates 50/50 Playwright, 38/38 targeted
Vitest, `tsc`/build PASS, 236-failure baseline preserved).

## 1. Purpose

Phase 1B.2b was drafted to extend the Phase 1B.2a facade migration pattern
(`generatePanelResult` behind a per-consumer `VITE_AURA_SIM_FACADE_*` flag,
default OFF, with `AbortSignal` cancellation and typed non-ok outcomes) to
the remaining user-visible simulation consumers.

Before writing any source changes, the candidate call sites were re-read
against the actual facade contract in `src/simulation/api.ts`. This
document records what was found, why 1B.2b was closed without source edits
(the "1B.2b-null" outcome), and what prerequisites must be satisfied
before the deferred consumers can be migrated.

## 2. Method

Evidence-only. No source files were modified during this investigation.

Commands used (verbatim):

```
grep -rl -E "SimulationEngine|simulationEngine|generatePanelResult|runSimulation" src
grep -l  -E "useSimulation\b|SimulationEngine|useEnhancedSimulation"           src/pages src/components src/twins -r
grep -nE "generateSimulationResult|status === 'completed'|SimulationResultSummary|simulationResult" \
     src/components/data-centre-twin/DCSimulationTab.tsx \
     src/components/simulation/ScenarioSimulationPanel.tsx
grep -nE "useSimulation|generateSimulationResult|SimulationEngine|status ===|onComplete|useEffect" \
     src/components/simulation/ScenarioSimulationPanel.tsx \
     src/components/simulation/SimulationPreviewModal.tsx \
     src/components/data-centre-twin/DCSimulationTab.tsx \
     src/twins/sovereignDataCenter/components/SovereignDCSimulationDashboard.tsx \
     src/twins/sovereignDataCenter/hooks/useEnhancedSimulation.ts
```

The facade contract examined was `src/simulation/api.ts` at the baseline
recorded in `phase-1b-baseline.md`. The completion-effect hook examined
was `src/simulation/useSimulationCompletion.ts` as delivered in 1B.2a.1.

## 3. Facade seam definition

`SimulationFacade.generatePanelResult(input, signal)` is a
**panel-oriented, completion-time adapter**. It wraps the deterministic
`generateSimulationResult(scenario, events, baselineKpis, currentKpis,
durationSec)` engine and returns a typed `ProviderOutcome<SimulationResultSummary>`.

A consumer is a **facade-seam consumer** iff it satisfies **all** of the
following, verified by reading the file:

1. It calls `generateSimulationResult` (or equivalent completion-time
   engine) from a completion effect keyed off `status === 'completed'`.
2. It produces a `SimulationResultSummary`-shaped value that it either
   renders or persists.
3. Its completion behaviour today is deterministic and synchronous with
   respect to the `useSimulation` state machine (so an `AbortSignal`
   thread and a race-token guard are meaningful).

A consumer that only reads `status`, `currentKpis`, or `events` for
display purposes is **not** a facade-seam consumer: it does not invoke
the engine, so routing it through `generatePanelResult` would either be a
dead branch (flag ON path never runs) or a behaviour change that
fabricates a completion summary where none existed before. The latter
violates the Phase 1B guardrail in `phase-1b-plan.md` §"Guardrails":
*"No changes to truth-in-UI classifications (Phase 1A.3.c.1 catalogs,
staleness policy, or export schema) inside 1B slices."*

## 4. Consumer disposition table

| # | Consumer | Calls completion engine? | Facade-seam? | Migration disposition |
|---|---|---|---|---|
| 1 | `src/components/simulation/DCSimulationPanel.tsx` | **yes** — `generateSimulationResult` via `useSimulationCompletion` | **yes** | **Complete (1B.2a.1)**. Flag: `VITE_AURA_SIM_FACADE_DCPANEL`. |
| 2 | `src/components/simulation/ScenarioSimulationPanel.tsx` | no | no | **Deferred.** No completion-engine call site; migration would be a dead branch. |
| 3 | `src/components/simulation/SimulationPreviewModal.tsx` | no — status/display only | no | **Deferred.** Uses `useSimulation` for `isRunning` state only. |
| 4 | `src/components/data-centre-twin/DCSimulationTab.tsx` | no — mirrors overview status | no | **Deferred.** Delegates status to the same `useSimulation` machine as `DCSimulationPanel`; adding a second completion effect here would double-fire persistence. |
| 5 | `src/twins/sovereignDataCenter/components/SovereignDCSimulationDashboard.tsx` + `hooks/useEnhancedSimulation.ts` | yes — but through `enhancedSimulationEngine`, an **asynchronous, tick-driven** engine with its own `onComplete(summary)` shape | **no** — different engine, different summary shape | **Blocked on 1B.5.** Routing through `compatibilityProvider` requires the enhanced-engine scenarios to be folded into `scenarioLibraryProvider` first, per `phase-1b-plan.md` slice 1B.5. |

### 4.1 Evidence per row

- **Row 1 — DCSimulationPanel.** `src/components/simulation/DCSimulationPanel.tsx`
  imports `createSimulationFacade` and `useSimulationCompletion`, reads
  `import.meta.env.VITE_AURA_SIM_FACADE_DCPANEL`, and threads an
  `AbortSignal` into `generatePanelResult`. Non-ok outcomes render a
  visible `role="alert"` block with `data-provenance="unavailable"`.
  Playwright: `tests/truth-in-ui/simulation-facade.spec.ts` (50/50).

- **Row 2 — ScenarioSimulationPanel.** Grep for
  `generateSimulationResult|SimulationResultSummary|simulationResult`
  returned **zero matches** in this file. The panel reads `status`,
  `activeScenarioId`, KPI values, and events from `useSimulation` and
  renders scenario cards + KPI deltas. There is no completion callback
  or summary generation to wrap.

- **Row 3 — SimulationPreviewModal.** 194 lines total. The only
  simulation reference is `const isRunning = status === 'running';` at
  line 44. Modal renders animated preview only.

- **Row 4 — DCSimulationTab.** The file's own header comment (line 10)
  reads: *"Uses the same useSimulation hook as Overview so state never
  drifts."* Grep confirmed **zero** matches for the completion-engine
  identifiers. Adding a second `useSimulationCompletion` here would run
  the persistence callback twice per completion (once from
  `DCSimulationPanel`, once from `DCSimulationTab`), corrupting the
  simulation-runs table.

- **Row 5 — Sovereign.** `useEnhancedSimulation.ts` imports from
  `../enhancedSimulationEngine`, exposes an async `startSimulation` that
  advances via `setInterval`, and calls `onComplete(summary)` where
  `summary` is `SimulationSummary` (not `SimulationResultSummary`). The
  two summary shapes are not interchangeable, and the facade contract
  today has no `generateEnhancedRunResult` seam. This is exactly the
  work scoped to slice 1B.5 (fold `enhancedSimulationEngine` scenarios
  into `scenarioLibraryProvider`).

## 5. Rejected alternatives

**1B.2b-narrow** — Extend `SimulationFacade` with a second seam
(`generateEnhancedRunResult`) and migrate `useEnhancedSimulation` behind
`VITE_AURA_SIM_FACADE_SOVEREIGN`. Rejected here because it pulls slice
1B.5 forward without characterization tests (slice 1B.2), leaving no
equivalence gate to prove the enhanced engine's tick loop is preserved.
Correct order per `phase-1b-plan.md` is 1B.2 → 1B.5 → 1B.6.

**1B.2b-shadow** — Wrap the three status-only panels in a facade-status
shim that resolves `activeProviderId` for header display only. Rejected
because it delivers no operational value, adds three unused code paths,
and would need to be removed once the panels acquire real completion
seams during 1B.5/1B.6.

## 6. Outcome and gates

- Source files modified: **0**.
- Tests modified: **0**.
- Playwright specs added: **0**.
- Docs added: this file.
- Docs updated: `phase-1b-plan.md` (slice 1B.2b marked closed, disposition
  linked here).

Because 1B.2b-null is docs-only, the Phase 1B slice-acceptance gates in
`phase-1b-plan.md` §"Slice acceptance" are not re-run. The most recent
authoritative gate run is Phase 1B.2a.1 (baseline: 236-failure Vitest
identity set preserved; `tsc` 0; build PASS; Playwright dual-mode 50/50;
ESLint clean on touched files).

## 7. Prerequisites for the deferred consumers

Before any of rows 2–5 can be migrated behind a facade flag, the
following slices in `phase-1b-plan.md` must complete in order:

1. **Slice 1B.2** — Characterization tests for the 7 simulation engines.
   Establishes the equivalence gate that lets later slices delete
   duplicate engines safely.
2. **Slice 1B.5** — Fold `enhancedSimulationEngine` scenarios into
   `scenarioLibraryProvider`. Unblocks the Sovereign row.
3. **Slice 1B.6** — Delete duplicate engines (`twins/dataCenter/simulationEngine.ts`,
   `twins/sovereignDataCenter/simulationEngine.ts`) once 1B.2 proves
   equivalence through the `compat/*` re-exports.

Only after 1B.6 will rows 2–4 (Scenario / Preview / DCTab) have a
coherent completion-engine target to wrap. Until then, they are
deliberately left on the legacy `useSimulation` state machine.

## 8. Traceability

- Predecessor slice report: `phase-1b-plan.md` §"Slice map" row 1B.2a.
- Related ADRs: **ADR-0007** (Simulation Provider Boundary).
- Baseline: `docs/remediation/phase-1b-baseline.md`.
- Consolidation design: `docs/remediation/phase-1b-consolidation-design.md`.
- Random-data register: unchanged.
- Truth-in-UI evidence bundle: unchanged
  (`docs/remediation/evidence/phase-1a3/SHA256SUMS.txt` still verifies).

## 9. Hard stop

Phase 1B.2b is closed. Phase 1B.2 (characterization tests), 1B.5
(scenario fold), 1B.6 (duplicate-engine deletion), 1B.7 (builder
rename), 1B.8 (`omniverseProvider` wiring), and 1B.9 (closeout) remain
**unauthorized** and require explicit user approval before any source
changes.