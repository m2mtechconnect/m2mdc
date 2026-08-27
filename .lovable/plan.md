# Contained remediation plan (base: 4450c1a67be5956bf3fd0dfe1a19d4ad909e3670)

Plan only. Three contained fixes: data-centre simulation preview, twin-context preservation on handoff, and facility context in the Evidence shell. No auth, RLS, tenancy, CORS, route semantics, or provenance semantics change.

## 1. Builder Step 5 preview falls back to the ITIL fixture

Verified current state: `TwinIndustry` in `src/lib/simulationTemplates.ts:24-37` has no `ai_compute` or `data_centre` member, `SIMULATION_TEMPLATES` has no such key, and the loose-match table (lines 382-434) contains no matching keyword, so `getSimulationTemplateForIndustry('ai_compute')` returns `SIMULATION_TEMPLATES.generic` - the "Enterprise Operations Twin - ITIL v4 Aligned" fixture with MTTR / First Call Resolution / SLA KPIs (lines 321-341). That fixture is what Step 5 renders for a data centre build.

Changes:

- `src/lib/simulationTemplates.ts`
  - Add `'ai_compute'` and `'data_centre'` to the `TwinIndustry` union.
  - Add two `SIMULATION_TEMPLATES` entries with data-centre sample KPIs (PUE, rack power density, cooling efficiency / return temperature, IT load utilisation) and a data-centre event sequence (thermal excursion detected, workload rebalance proposed, cooling setpoint adjustment modelled, validation). Titles/descriptions stay provider-neutral: no NVIDIA, DGX, DSX, Omniverse or accelerated-runtime claims; describe them as design-time sample scenarios.
  - Add `INDUSTRY_LABELS` entries: `ai_compute` -> "AI Compute Data Centre", `data_centre` -> "Data Centre".
  - Extend `looseMatches` with `data_center`, `datacenter`, `datacentre`, `ai_compute`, `colocation`, `hpc` -> the new keys. Order matters: these must be checked before the existing `power` keyword so `power_data_centre` does not resolve to `energy_utilities`. Implement by testing the new data-centre keywords first.

- `src/components/builder/step5/deploy/SimulationPreviewPanel.tsx`
  - No behavioural change required; it already renders "Sample Data" badge plus the sample-KPI alert (lines 82-107). Only adjust the alert copy so it reads as clearly labelled sample data for the resolved industry ("Design-time sample KPIs for <label>. No run has been executed."). Keeps the existing truth semantics.

## 2. Open Blueprint / Open in Simulation lose the active twin id

Verified current state: `src/components/builder/steps/Step5Deploy.tsx:131-138` calls `buildSimulationHandoffUrl({ blueprintId: activeTwin?.id ?? builderId ?? 'unavailable' })` and never passes `twinId`, although `buildSimulationHandoffUrl` supports `twinId` and serialises it as `?twin=` (`src/simulation/handoff.ts:24-45`). Blueprint open at line 321 uses `activeTwin.id` but is a silent no-op when `activeTwin` is null.

Changes:

- `src/components/builder/steps/Step5Deploy.tsx`
  - Pass `twinId: activeTwin?.id ?? null` into `buildSimulationHandoffUrl`, keeping `blueprintId` resolution unchanged.
  - Replace the silent `activeTwin && window.open(...)` with an explicit guard: when there is no active twin, surface the existing toast ("No active facility selected") instead of doing nothing; otherwise open `/blueprint/{activeTwin.id}` with the twin id preserved as today.
  - No new fetches, no new mutations, no id invention: when the twin is unresolved the UI states it rather than substituting a default.

## 3. Evidence family cannot carry / show facility context

Verified current state: `facility_id` already exists in `InvestigationContext` and maps to the `facility` URL parameter (`src/dsx/runtime/investigationContext.ts:13,53-68`) and is preserved by `hrefWithContext`, but `buildContextChips` (lines 120-137) never emits a facility chip, and `EvidenceBetaShell`'s `WorkspaceHeader` shows only the asset breadcrumb (`src/pages/dsx/EvidenceBetaShell.tsx:213-252`). Inbound links do not set it: `evidenceHrefForKpi` (`src/workspace/kpiDrilldown.ts:56-62`) and the attention-queue link (`src/workspace/dashboard/attentionQueue.ts:152`) build `/evidence/...?kpi=` with no facility/twin.

Changes:

- `src/dsx/runtime/investigationContext.ts`
  - Emit a non-removable-by-default facility chip in `buildContextChips` when `facility_id` is set, resolving the display name through the existing `resolve` callback and falling back to the existing "Unavailable (record not found)" string. No new truth claims.

- `src/pages/dsx/EvidenceBetaShell.tsx`
  - In `EvidenceWorkspaceHeader`, prepend the active facility to the breadcrumb / header meta: "Facility: <name>" when `context.facility_id` resolves, "Facility: not selected" when absent, and the existing unavailable wording when the id does not resolve. Keep `OperationalTruthBar` and `ContextBar` untouched so simulated/provenance semantics are unchanged.

- `src/workspace/kpiDrilldown.ts`
  - Give `evidenceHrefForKpi` an optional `facilityId` argument and set `facility` on the params when provided. Existing callers keep working unchanged.

- `src/workspace/dashboard/attentionQueue.ts` and the dashboard components that call `evidenceHrefForKpi`
  - Pass the already-available facility id through so navigation into `/evidence` carries context. No component gains new data access.

## Test targets

- `src/lib/__tests__/` (new or existing simulation-template spec): `getSimulationTemplateForIndustry` returns the data-centre template for `ai_compute`, `data_centre`, `data_center`, `datacenter`; never returns the `generic` ITIL template for those; the new templates contain no vendor names (assert against a neutral-naming denylist).
- `src/pages/__tests__/builderStartBuildAction.test.tsx` neighbours / new `step5-handoff.test.tsx`: the simulation handoff URL contains `twin=<activeTwin.id>` and `state=draft`; with no active twin the Blueprint action reports unavailability instead of navigating.
- `src/dsx/__tests__/investigationContext.test.tsx`: facility chip is emitted when `facility` is present, and unresolved ids render the unavailable wording.
- New `tests/unit/evidence-facility-context-contract.test.ts`: `/evidence` links preserve the `facility` parameter and the shell header states the active facility.
- Regression gate: `verify:fast`, typecheck, lint, build, plus the existing neutral-stack / provenance contract tests.
