# Phase 1B — Consolidation Design (Simulation & Provenance Surface)

Status: **PROPOSED**. No code changed in Phase 1B.0.

This document is the technical companion to `phase-1b-plan.md` and
`docs/adr/0007-simulation-provider-boundary.md`. It records what exists today
with file:line evidence, defines the target boundary, and lists the invariants
each slice must preserve.

## 1. Current-state inventory (anchor SHA `7dd20d2…`)

### 1.1 Simulation implementations (7, ~5,198 LOC)

| # | File | LOC | Role |
|---|---|---:|---|
| 1 | `src/simulation/SimulationEngine.ts:89` | 596 | Class `SimulationEngine` — primary orchestrator |
| 2 | `src/simulation/generateSimulationResult.ts:252` | 302 | Pure result synthesizer (`generateSimulationResult`) |
| 3 | `src/simulation/scenarioRegistry.ts` | 574 | Scenario catalog |
| 4 | `src/twins/dataCenter/simulationEngine.ts` | 379 | DC-twin engine (`calculateBaseKpis`, `applyScenarioDeltas`, `generatePlaybook`) |
| 5 | `src/twins/sovereignDataCenter/simulationEngine.ts:53` | 328 | `runSimulation()` — near-duplicate of #4 |
| 6 | `src/twins/sovereignDataCenter/enhancedSimulationEngine.ts` | 787 | Parallel enhanced engine |
| 7 | `src/components/builder/step5/SimulationEngine.ts:30` | 287 | Builder-scope engine — **name-clash** with #1 |
| 8 | `src/components/builder/step5/MockSimulationEngine.ts:45` | 290 | Builder demo mock |

Supporting: `blueprintScenarioAdapter.ts` (206), `customScenarioBuilder.ts`
(141), `useSimulation.ts` (293), `useSimulationGuards.ts` (245),
`integrationTests.ts` (263), `types.ts` (478).

### 1.2 Simulation consumers (file:line)

```
src/components/simulation/DCSimulationPanel.tsx:36     generateSimulationResult
src/components/simulation/DCSimulationPanel.tsx:164    invocation
src/components/simulation/MultiRunComparison.tsx:17    enhancedSimulationEngine
src/components/simulation/AIRecommendationsPanel.tsx:14 enhancedSimulationEngine
src/twins/sovereignDataCenter/components/SovereignDCSimulationDashboard.tsx:33 enhancedSimulationEngine
src/twins/sovereignDataCenter/hooks/useEnhancedSimulation.ts:53                enhancedSimulationEngine
src/twins/sovereignDataCenter/hooks/useSovereignDCTwin.ts                      twins/dataCenter/simulationEngine
src/components/builder/step5/SimulationDashboard.tsx:24,58,97,128,137,188,212  SimulationEngine | MockSimulationEngine dispatch
src/components/builder/step5/EventLogPanel.tsx                                 SimulationEngine (builder)
src/hooks/useSimulationVisualization.ts                                        SimulationEngine
src/components/twin-visualization/hooks/useTwinVisualizationData.ts            SimulationEngine (indirect)
src/hooks/useTwinKPIsFromSimulation.ts                                         reads simulation_runs table
src/components/system-manage/SystemSimulation.tsx                              DCSimulationPanel wrapper
src/pages/Dashboard.tsx / src/components/data-centre-twin/DataCentreDashboard.tsx UI chrome
```

### 1.3 Mock / fixture data trees (7)

```
src/twins/dataCenter/mockData.ts                        # generateDataCentreFacility, montrealSovereignDC, sovereignQCFacility, prairieABFacility
src/twins/sovereignDataCenter/mockData.ts               # telusSovereignFacility, prairieMegaFacility, getDemoSimulationRuns
src/sovereignty/mockData.ts                             # sovereignty demo posture
src/components/data-centre-twin/domains/metricCatalogs.ts # 11 domain catalogs / 52 metrics
src/components/builder/step5/MockSimulationEngine.ts    # builder wizard fixture
src/lib/copilot/dcDomainContext.ts                      # copilot demo context
src/integrations/omniverseKit/__tests__/*              # Kit schema fixtures (test-only)
```

Every fixture must remain reachable from a deterministic seed; provenance for
values produced through them is `demo`.

### 1.4 Omniverse / DSX adapter surface

```
src/integrations/omniverseKit/client.ts                # fetchStatus, fetchStatusValidated
src/integrations/omniverseKit/schema.ts                # Zod validateKitStatus
src/hooks/useOmniverseKit.ts                           # React hook, fail-closed
src/lib/provenance/kitMetrics.ts                       # Kit → ProvenancedMetric mapper
src/twins/dataCenter/omniverseAdapter.ts               # DC-twin façade (Phase 0.5 refactor)
src/components/twin-visualization/OmniverseStreamViewer.tsx
src/pages/OmniverseScene.tsx                           # top-KPI cards
```

No production code path today streams from a real NVIDIA Kit; the mock at
`tests/truth-in-ui/_setup/kit-mock.ts` is the only exerciser of the validated
path. Phase 1B does not change that.

### 1.5 Duplicated KPI calculations

- `calculateBaseKpis` / `applyScenarioDeltas` in `src/twins/dataCenter/simulationEngine.ts`
- Equivalent logic in `src/twins/sovereignDataCenter/simulationEngine.ts` (`runSimulation`)
- Rack-level metric synthesis in `src/simulation/generateSimulationResult.ts` (`generateRackMetrics`)
- Domain-scoped KPI catalogs in `src/components/data-centre-twin/domains/metricCatalogs.ts`
- Canonical KPI catalog in `src/domain/greenDc/kpiCatalog.ts` consumed by
  `src/hooks/useTwinKPIsFromSimulation.ts`

These four locations independently compute or classify PUE, GPU util, power,
cooling and tokens/W. Provider consolidation must route them through one
result-shape.

### 1.6 Public exports depending on simulation output

- `src/simulation/index.ts` re-exports `SimulationEngine`, `getSimulationEngine`,
  `useSimulation`, `SimulationPreviewModal`, `SimulationChecklist`,
  `createCustomScenario`, scenario registry.
- `src/twins/dataCenter/index.ts` re-exports `calculateBaseKpis`,
  `applyScenarioDeltas`, `generateScenarioEvents`, `createSimulationRun`,
  `updateSimulationRun`, `generatePlaybook`, `playbookToMarkdown`.
- `src/twins/sovereignDataCenter/index.ts` re-exports `runSimulation`,
  `createSimulationRun`, `getScenarioSuggestions`, `generatePlaybook`,
  `playbookToMarkdown`, `useSovereignDCTwin`.

### 1.7 Compatibility boundaries that MUST remain stable

1. React hook signatures: `useSimulation`, `useEnhancedSimulation`,
   `useSovereignDCTwin`, `useOmniverseKit`, `useTwinKPIsFromSimulation`.
2. `SimulationResult` / `SimulationRun` / `Playbook` type surfaces (imported by
   dashboards, exporters, tests).
3. Exporter contract in `src/lib/provenance/exporters/**` (CSV/JSON/Markdown/Print
   consume `ProvenancedMetric<T>`).
4. Metric-level provenance contract (`ProvenancedMetric<T>`, ADR-0006).
5. Staleness policy (`isStale`, freshness budgets).
6. Truth-in-UI classification of each active surface (Phase 1A.3 register).

## 2. Target design — one API, many providers

See ADR-0007 for rationale. Target module layout:

```text
src/simulation/
  api.ts                     # public: runScenario, subscribeSimulation, stopSimulation, listScenarios
  providers/
    demoRulesProvider.ts     # extracts current SimulationEngine.ts (deterministic seed)
    scenarioLibraryProvider.ts # scenarioRegistry ∪ enhanced scenarios
    blueprintProvider.ts     # existing blueprintScenarioAdapter
    omniverseProvider.ts     # STUB — throws NotImplemented; feature-flagged off
  result/
    shape.ts                 # canonical SimulationResult + ProvenancedMetric bindings
    generate.ts              # current generateSimulationResult
  react/
    useSimulation.ts
    useSimulationGuards.ts
  fixtures/
    builderMock.ts           # renamed MockSimulationEngine
  compat/
    twinsDataCenter.ts       # re-exports preserving twins/dataCenter public API
    twinsSovereign.ts        # re-exports preserving twins/sovereignDataCenter public API
```

### 2.1 Provider contract (draft)

```ts
export interface SimulationProvider {
  readonly id: 'demo-rules' | 'scenario-library' | 'blueprint' | 'omniverse';
  readonly provenance: 'simulated' | 'demo' | 'live' | 'unavailable';
  listScenarios(): ScenarioDescriptor[];
  runScenario(input: ScenarioInput, signal?: AbortSignal): Promise<SimulationResult>;
  subscribe?(input: ScenarioInput, sink: (evt: SimulationEvent) => void): Unsubscribe;
}
```

Providers return `ProvenancedMetric<T>` for every scalar. The `api.ts` façade
chooses a provider via a **feature flag** (env var `VITE_AURA_SIM_PROVIDER`,
defaulting to `demo-rules`) and validates provider output against a Zod schema
before handing it to hooks — mirroring the Kit fail-closed pattern from ADR-0006.

### 2.2 Invariants the design preserves

| Invariant | Enforcement |
|---|---|
| Deterministic demo provider | Seeded PRNG (Phase 1A) reused; provider tests assert byte-stable outputs |
| UI contracts | `compat/*` re-exports; codemod migrates imports without changing signatures |
| Metric-level provenance | Zod schema on provider output rejects untagged scalars |
| Staleness rules | Result envelope carries `observedAt`; staleness derivation stays in provenance layer |
| Export provenance | Exporters continue consuming `ProvenancedMetric<T>` — no exporter changes in 1B |
| Feature-flagged migration | `VITE_AURA_SIM_PROVIDER` selects provider; default = current behaviour |
| Omniverse/DSX boundary | `omniverseProvider` exists but throws `NotImplemented`; **no claim of live integration** |

### 2.3 Explicit non-goals for Phase 1B

- No real NVIDIA Kit, BMS, or DCIM traffic.
- No changes to truth-in-UI classifications recorded in Phase 1A.3.
- No broad legacy-test cleanup; the 236 failing tests are addressed only where
  a slice's change plausibly moves them (see plan §Slice acceptance).
- No dependency install, lockfile bump, or Supabase migration.
- No deletion of duplicate engines until characterization tests cover them.

## 3. Risk register

| Risk | Mitigation |
|---|---|
| `enhancedSimulationEngine` behaviours undocumented | Slice 1B.1 writes characterization tests before touching it |
| Name clash `SimulationEngine` (builder vs core) | Slice 1B.2 renames builder class; codemod-first |
| Consumer imports scattered | Codemod script + PR-sized slices, one target file per slice |
| `useTwinKPIsFromSimulation` reads Supabase directly | Kept out of provider layer; documented as data-plane read |
| Silent Kit fallbacks | `omniverseProvider` throws instead of returning demo data — fail-closed |

## 4. Evidence pointers

- `docs/remediation/evidence/phase-1b/vitest-failures.txt`
- `docs/remediation/evidence/phase-1b/eslint-summary.txt`
- `docs/remediation/evidence/phase-1b/playwright-tests.tsv`
- `docs/remediation/evidence/phase-1b/screenshot-checksums.txt`
- ADR-0001, ADR-0004, ADR-0006, ADR-0007.