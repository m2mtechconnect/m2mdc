
# Phase 1B.2b — Remaining Simulation Consumer Migration

**Status:** PROPOSED. Requesting explicit authorization before any source edits. This is a scope proposal, not an implementation.

## Rationale

Phase 1B.2a migrated exactly one consumer (`DCSimulationPanel`) behind `VITE_AURA_SIM_FACADE_DCPANEL` (default OFF) and proved the facade pattern end-to-end: typed `unavailable`/`cancelled` outcomes, `AbortSignal` cancellation via `useSimulationCompletion`, race-token guards, visible non-ok state, dual-mode Playwright (50/50).

Phase 1B.2b extends that pattern to the other user-visible simulation consumers, one flag per consumer, default OFF, with equivalence and truth-in-UI preserved.

Explicitly out of scope for 1B.2b (kept for later authorized slices, per `phase-1b-plan.md`):
- Deleting duplicate engines (`twins/dataCenter/simulationEngine.ts`, `twins/sovereignDataCenter/simulationEngine.ts`) — that is slice 1B.6.
- Folding `enhancedSimulationEngine` scenarios — slice 1B.5.
- Renaming builder `SimulationEngine` — slice 1B.7.
- Wiring `omniverseProvider` — slice 1B.8.
- Any legacy Vitest cleanup (still owned by originating epics).

## Consumer inventory and disposition

Grouped by call site, from the grep of `src/pages`, `src/components`, `src/twins`:

**In scope — migrate behind per-consumer flag (default OFF):**

| # | Consumer | Proposed flag | Notes |
|---|---|---|---|
| 1 | `components/simulation/ScenarioSimulationPanel.tsx` | `VITE_AURA_SIM_FACADE_SCENARIO` | Same shape as DCSimulationPanel; reuses `useSimulationCompletion`. |
| 2 | `components/simulation/SimulationPreviewModal.tsx` | `VITE_AURA_SIM_FACADE_PREVIEW` | Modal entry point; must preserve close/cancel semantics via `AbortSignal`. |
| 3 | `components/data-centre-twin/DCSimulationTab.tsx` | `VITE_AURA_SIM_FACADE_DCTAB` | Twin dashboard tab wrapper. |
| 4 | `twins/sovereignDataCenter/components/SovereignDCSimulationDashboard.tsx` (+ `hooks/useEnhancedSimulation.ts`) | `VITE_AURA_SIM_FACADE_SOVEREIGN` | Delegate through facade → existing `enhancedSimulationEngine` via `compatibilityProvider`. No engine changes. |
| 5 | `components/data-centre-twin/overview/SimulationSummaryCard.tsx` (read-only summary) | *no flag needed* — read-only; retrofit only to consume facade `SimulationOutcome` shape when parent uses facade. Zero behavioural change when parent is legacy. |

**In scope — read-only/derived; retrofit to accept facade outcome shape but no independent flag:**
- `components/simulation/AnimatedKPIStrip.tsx`, `EnterpriseKPICard.tsx`, `AIRecommendationsPanel.tsx`, `MultiRunComparison.tsx`, `overview/CompactKPICockpit.tsx`, `overview/SimulationSummaryCard.tsx`.

These already receive props from their parent panel. Change = accept `SimulationOutcome` discriminated union; render `unavailable`/`cancelled` states with `ProvenanceBadge`. Behaviour under legacy parent unchanged.

**Out of scope for 1B.2b (deferred):**
- `pages/OmniverseScene.tsx` — Kit-adapter path, not simulation engine. Untouched.
- `components/builder/step5/*` — Builder-mock engine; belongs to slice 1B.7 (rename + fixture migration).
- `components/marketplace/TemplateSimulation.tsx` — marketing/preview surface; no facade parity requirement yet.
- `twin-visualization/hooks/useTwinVisualizationData.ts`, `twins/dataCenter/MasterTemplate.ts` — data-model reads, not engine invocations.
- `contexts/CoPilotCommandContext.tsx`, `lib/copilot/*` — text prompts, not engine calls.

## Per-consumer migration recipe (identical to 1B.2a)

For each in-scope panel:

1. Read the flag via `import.meta.env.VITE_AURA_SIM_FACADE_<X>`.
2. If OFF → existing engine path, no change.
3. If ON → call `generatePanelResult(config, { signal })` from `src/simulation/api.ts`.
4. Manage lifecycle via `useSimulationCompletion` (abort on replacement, unmount, reset).
5. Non-ok outcome (`unavailable` | `cancelled` | `invalid`) → render visible `role="alert"` block with `data-provenance="unavailable"` and a `ProvenanceBadge`.
6. Preserve existing provenance manifests and export schema — no truth-in-UI classification changes.

## Tests

- **Unit (Vitest):** one facade-mode test per panel asserting (a) ok outcome parity vs legacy for a fixed config, (b) `unavailable` on unknown config, (c) `cancelled` on abort. New tests only; no legacy tests touched.
- **Playwright:** extend `tests/truth-in-ui/simulation-facade.spec.ts` — one new scenario per migrated panel, exercised under the existing dual-mode config (ports 8091 legacy / 8092 facade). Target: 50 → 50 + N PASS.
- **No changes** to `random-and-synthetic-data-register.md`, staleness policy, or export schema.

## Verification gates (per slice acceptance in `phase-1b-plan.md`)

1. `tsc -p tsconfig.app.json --noEmit` — 0 errors.
2. `npm run build` — PASS.
3. Vitest — failure identity ⊆ 236-baseline.
4. ESLint — 0 new violations in touched files.
5. Playwright dual-mode — all PASS (50 baseline + new).
6. Truth-in-UI classifications unchanged.

## Deliverables

- Per-consumer diffs (5 flagged panels + shared read-only components).
- New Vitest specs under `src/simulation/__tests__/`.
- Extended `tests/truth-in-ui/simulation-facade.spec.ts`.
- Updated `docs/remediation/phase-1b-report.md` with gate outputs and failure-identity diff.
- Updated `docs/remediation/phase-1b-plan.md` marking 1B.2b complete.

## Rollback

Per-consumer: unset the flag; revert the panel file. No shared-code changes make rollback multi-file.

## Hard stop

Phase 1B.2b ends after gates + report. Slices 1B.2 (characterization tests), 1B.5–1B.8 (consolidation, deletions, rename, provider wiring), and 1B.9 (closeout) remain unauthorized.

---

**Requesting approval to proceed with the 5 flagged consumer migrations above, in the order listed (Scenario → Preview → DCTab → Sovereign → shared read-only retrofit), with a checkpoint between each.**
